import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { HandoverPhotoType } from "@/lib/types";
import { PART_OPTIONS } from "@/lib/vehicle-parts";

// 3D-Schadensmarker anlegen (Schritt 2d). Gespiegelt an der Handover-Foto-Route:
// Session-Auth → users.org_id, Vertrag→org-Check, dann Admin-Client. Persist-
// zuerst-dann-melden, Fehler PII-frei (nur code+message). created_by bleibt in
// 2d bewusst leer (Audit-Spalte kommt in einem späteren Schritt aktiv dazu).
export const maxDuration = 15;

const VALID_TYPES: ReadonlyArray<HandoverPhotoType> = ["pickup", "return"];
// Nur die 8 Außen-Zonen, die der Viewer liefert (= zone-CHECK der Migration 072).
const VALID_ZONES: ReadonlyArray<string> = [
  "front",
  "rear",
  "left",
  "right",
  "front_left",
  "front_right",
  "rear_left",
  "rear_right",
];
const PART_IDS = new Set(PART_OPTIONS.map((o) => o.id));

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

export const POST = async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    type?: string;
    zone?: string;
    part_id?: string | null;
    x?: number;
    y?: number;
    z?: number;
  };
  const type = String(body.type ?? "");
  const zone = String(body.zone ?? "");
  const x = Number(body.x);
  const y = Number(body.y);
  const z = Number(body.z);
  const partId = body.part_id == null ? null : String(body.part_id);

  if (!VALID_TYPES.includes(type as HandoverPhotoType))
    return NextResponse.json({ error: "Ungültiger Typ" }, { status: 400 });
  if (!VALID_ZONES.includes(zone))
    return NextResponse.json({ error: "Ungültige Zone" }, { status: 400 });
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z))
    return NextResponse.json({ error: "Ungültige Koordinaten" }, { status: 400 });
  if (partId !== null && !PART_IDS.has(partId))
    return NextResponse.json({ error: "Ungültiges Bauteil" }, { status: 400 });

  const admin = createAdminClient();

  // Vertrag muss zur Org gehören.
  const { data: contract } = await admin
    .from("contracts")
    .select("id")
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!contract) return NextResponse.json({ error: "Vertrag nicht gefunden" }, { status: 404 });

  const { data, error } = await admin
    .from("damage_markers")
    .insert({
      contract_id: params.id,
      org_id: auth.org_id,
      type,
      zone,
      part_id: partId,
      x,
      y,
      z,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[damage-markers] insert fehlgeschlagen:", error.code ?? "", error.message);
    return NextResponse.json({ error: "Speichern fehlgeschlagen" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, marker: data });
};
