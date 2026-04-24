import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { DamageReportStatus } from "@/lib/types";

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

const trimOrNull = (v: unknown) => {
  if (v === undefined) return undefined;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
};

const STATUSES: ReadonlyArray<DamageReportStatus> = ["offen", "gemeldet", "reguliert"];

const PATCH_FIELDS = [
  "contract_id",
  "vehicle_id",
  "date",
  "time",
  "location",
  "description",
  "police_reference_nr",
  "insurance_claim_nr",
  "other_party_name",
  "other_party_plate",
  "other_party_insurance",
  "status",
] as const;

type Ctx = { params: { id: string } };

export const GET = async (_req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("damage_reports")
    .select("*")
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ damage_report: data });
};

export const PATCH = async (req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const k of PATCH_FIELDS) {
    if (!(k in body)) continue;
    if (k === "date") {
      if (typeof body.date === "string" && body.date.length > 0) patch.date = body.date;
    } else if (k === "status") {
      if (STATUSES.includes(body.status as DamageReportStatus)) patch.status = body.status;
    } else {
      const v = trimOrNull(body[k]);
      if (v !== undefined) patch[k] = v;
    }
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("damage_reports")
    .update(patch)
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, damage_report: data });
};

export const DELETE = async (_req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  // Fotos aus Storage löschen
  const { data: rep } = await admin
    .from("damage_reports")
    .select("photos")
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (rep && Array.isArray(rep.photos) && rep.photos.length > 0) {
    await admin.storage.from("damage-photos").remove(rep.photos as string[]);
  }

  const { error } = await admin
    .from("damage_reports")
    .delete()
    .eq("id", params.id)
    .eq("org_id", auth.org_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
};
