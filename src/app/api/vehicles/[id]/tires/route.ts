import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { TireCondition, TireType } from "@/lib/tires";

export const maxDuration = 30;

const VALID_TYPES: ReadonlyArray<TireType> = ["summer", "winter", "allseason"];
const VALID_CONDITIONS: ReadonlyArray<TireCondition> = ["new", "good", "worn", "replace"];

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

type Ctx = { params: { id: string } };

const trimOrNull = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
};
const intOrNull = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
};
const decOrNull = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(typeof v === "string" ? v.replace(",", ".") : v);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : null;
};

const ensureVehicle = async (
  admin: ReturnType<typeof createAdminClient>,
  vehicleId: string,
  orgId: string
) => {
  const { data } = await admin
    .from("vehicles")
    .select("id")
    .eq("id", vehicleId)
    .eq("org_id", orgId)
    .maybeSingle();
  return !!data;
};

export const GET = async (_req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const admin = createAdminClient();

  if (!(await ensureVehicle(admin, params.id, auth.org_id)))
    return NextResponse.json({ error: "Fahrzeug nicht gefunden" }, { status: 404 });

  const { data: tires, error } = await admin
    .from("vehicle_tires")
    .select("*")
    .eq("vehicle_id", params.id)
    .eq("org_id", auth.org_id)
    .order("is_current", { ascending: false })
    .order("mounted_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const tireIds = (tires ?? []).map((t) => t.id);
  const photosByTire = new Map<string, { id: string; position: string; photo_path: string }[]>();
  if (tireIds.length > 0) {
    const { data: photos } = await admin
      .from("tire_photos")
      .select("id, tire_id, position, photo_path")
      .in("tire_id", tireIds);
    for (const p of photos ?? []) {
      const arr = photosByTire.get(p.tire_id) ?? [];
      arr.push({ id: p.id, position: p.position, photo_path: p.photo_path });
      photosByTire.set(p.tire_id, arr);
    }
  }

  return NextResponse.json({
    ok: true,
    tires: (tires ?? []).map((t) => ({
      ...t,
      photos: photosByTire.get(t.id) ?? [],
    })),
  });
};

export const POST = async (req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const admin = createAdminClient();

  if (!(await ensureVehicle(admin, params.id, auth.org_id)))
    return NextResponse.json({ error: "Fahrzeug nicht gefunden" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const type = body.type as TireType;
  if (!VALID_TYPES.includes(type))
    return NextResponse.json({ error: "Ungültiger Reifentyp" }, { status: 400 });

  const condition = (body.condition as TireCondition) ?? "good";
  if (!VALID_CONDITIONS.includes(condition))
    return NextResponse.json({ error: "Ungültiger Zustand" }, { status: 400 });

  const isCurrent = body.is_current !== false;

  // Wenn dieser Satz current werden soll: bestehenden current-Satz dismounten.
  if (isCurrent) {
    const today = new Date().toISOString().slice(0, 10);
    await admin
      .from("vehicle_tires")
      .update({ is_current: false, dismounted_at: today })
      .eq("vehicle_id", params.id)
      .eq("org_id", auth.org_id)
      .eq("is_current", true);
  }

  const row = {
    vehicle_id: params.id,
    org_id: auth.org_id,
    type,
    brand: trimOrNull(body.brand),
    model: trimOrNull(body.model),
    size: trimOrNull(body.size),
    dot_number: trimOrNull(body.dot_number),
    tread_depth_fl: decOrNull(body.tread_depth_fl),
    tread_depth_fr: decOrNull(body.tread_depth_fr),
    tread_depth_rl: decOrNull(body.tread_depth_rl),
    tread_depth_rr: decOrNull(body.tread_depth_rr),
    km_at_mount: intOrNull(body.km_at_mount),
    mounted_at: trimOrNull(body.mounted_at) ?? new Date().toISOString().slice(0, 10),
    storage_location: trimOrNull(body.storage_location),
    condition,
    notes: trimOrNull(body.notes),
    is_current: isCurrent,
  };

  const { data, error } = await admin
    .from("vehicle_tires")
    .insert(row)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, tire: data });
};
