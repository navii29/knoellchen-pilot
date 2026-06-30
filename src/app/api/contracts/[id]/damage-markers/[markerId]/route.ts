import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { DamageSeverity } from "@/lib/types";
import { PART_OPTIONS } from "@/lib/vehicle-parts";
import { DAMAGE_TYPES } from "@/lib/damage-types";

// 3D-Schadensmarker aktualisieren (Bauteil/Schadenstyp/Schweregrad) oder löschen.
// org_id + contract_id + id als Sicherheitsgrenze (Admin-Client umgeht RLS, daher
// explizit gefiltert). Persist-zuerst-dann-melden, Fehler PII-frei.
export const maxDuration = 15;

const PART_IDS = new Set(PART_OPTIONS.map((o) => o.id));
const DAMAGE_TYPE_IDS = new Set(DAMAGE_TYPES.map((t) => t.id));
const VALID_SEVERITIES: ReadonlyArray<DamageSeverity> = ["none", "minor", "major"];

const requireAuth = async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();
  return profile ? { user, org_id: profile.org_id } : null;
};

export const PATCH = async (
  req: Request,
  { params }: { params: { id: string; markerId: string } }
) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    part_id?: string | null;
    damage_type?: string | null;
    severity?: string | null;
  };

  // Nur mitgeschickte Felder aktualisieren; jedes gegen die App-Whitelist prüfen.
  const patch: { part_id?: string | null; damage_type?: string | null; severity?: string | null } = {};
  if ("part_id" in body) {
    const v = body.part_id == null ? null : String(body.part_id);
    if (v !== null && !PART_IDS.has(v))
      return NextResponse.json({ error: "Ungültiges Bauteil" }, { status: 400 });
    patch.part_id = v;
  }
  if ("damage_type" in body) {
    const v = body.damage_type == null ? null : String(body.damage_type);
    if (v !== null && !DAMAGE_TYPE_IDS.has(v))
      return NextResponse.json({ error: "Ungültiger Schadenstyp" }, { status: 400 });
    patch.damage_type = v;
  }
  if ("severity" in body) {
    const v = body.severity == null ? null : String(body.severity);
    if (v !== null && !VALID_SEVERITIES.includes(v as DamageSeverity))
      return NextResponse.json({ error: "Ungültiger Schweregrad" }, { status: 400 });
    patch.severity = v;
  }
  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: "Nichts zu aktualisieren" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("damage_markers")
    .update(patch)
    .eq("id", params.markerId)
    .eq("contract_id", params.id)
    .eq("org_id", auth.org_id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[damage-markers] update fehlgeschlagen:", error.code ?? "", error.message);
    return NextResponse.json({ error: "Speichern fehlgeschlagen" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Marker nicht gefunden" }, { status: 404 });
  return NextResponse.json({ ok: true, marker: data });
};

export const DELETE = async (
  _req: Request,
  { params }: { params: { id: string; markerId: string } }
) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("damage_markers")
    .delete()
    .eq("id", params.markerId)
    .eq("contract_id", params.id)
    .eq("org_id", auth.org_id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[damage-markers] delete fehlgeschlagen:", error.code ?? "", error.message);
    return NextResponse.json({ error: "Löschen fehlgeschlagen" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Marker nicht gefunden" }, { status: 404 });
  return NextResponse.json({ ok: true });
};
