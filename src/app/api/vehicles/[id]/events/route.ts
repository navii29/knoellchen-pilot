import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const maxDuration = 30;

const EVENT_TYPES = ["service", "tires", "tuev", "repair", "insurance", "other"] as const;
type EventType = (typeof EVENT_TYPES)[number];

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

const trimOrNull = (v: unknown) => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
};
const intOrNull = (v: unknown) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
};
const numOrNull = (v: unknown) => {
  if (v == null || v === "") return null;
  const n = Number(typeof v === "string" ? v.replace(",", ".") : v);
  return Number.isFinite(n) ? n : null;
};

export const GET = async (_req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data: vehicle } = await admin
    .from("vehicles")
    .select("id")
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!vehicle) return NextResponse.json({ error: "Fahrzeug nicht gefunden" }, { status: 404 });

  const { data, error } = await admin
    .from("vehicle_events")
    .select("*")
    .eq("vehicle_id", params.id)
    .eq("org_id", auth.org_id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, events: data ?? [] });
};

export const POST = async (req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data: vehicle } = await admin
    .from("vehicles")
    .select("id")
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!vehicle) return NextResponse.json({ error: "Fahrzeug nicht gefunden" }, { status: 404 });

  const contentType = req.headers.get("content-type") ?? "";
  let body: Record<string, unknown> = {};
  let documentPath: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    for (const [k, v] of form.entries()) {
      if (k === "file") continue;
      body[k] = typeof v === "string" ? v : null;
    }
    const file = form.get("file");
    if (file instanceof File && file.size > 0) {
      if (file.size > 12 * 1024 * 1024) {
        return NextResponse.json({ error: "Datei zu groß (max 12 MB)" }, { status: 400 });
      }
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const stamp = Date.now().toString(36);
      documentPath = `${auth.org_id}/${params.id}/${stamp}.${ext}`;
      const arrayBuffer = await file.arrayBuffer();
      const buf = Buffer.from(arrayBuffer);
      const { error: upErr } = await admin.storage
        .from("vehicle-documents")
        .upload(documentPath, buf, { contentType: file.type, upsert: true });
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    }
  } else {
    body = (await req.json()) as Record<string, unknown>;
  }

  const type = String(body.type ?? "").trim() as EventType;
  if (!EVENT_TYPES.includes(type)) {
    return NextResponse.json({ error: `Ungültiger Typ: ${type}` }, { status: 400 });
  }
  const date = trimOrNull(body.date);
  if (!date) return NextResponse.json({ error: "Datum erforderlich" }, { status: 400 });

  const row = {
    vehicle_id: params.id,
    org_id: auth.org_id,
    type,
    date,
    km_at_event: intOrNull(body.km_at_event),
    description: trimOrNull(body.description),
    cost: numOrNull(body.cost),
    next_due_date: trimOrNull(body.next_due_date),
    next_due_km: intOrNull(body.next_due_km),
    provider: trimOrNull(body.provider),
    document_path: documentPath,
  };

  const { data, error } = await admin
    .from("vehicle_events")
    .insert(row)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, event: data });
};
