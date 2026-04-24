import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const maxDuration = 30;

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

export const POST = async (req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Datei fehlt" }, { status: 400 });
  }
  if (file.size > 12 * 1024 * 1024) {
    return NextResponse.json({ error: "Datei zu groß (max 12 MB)" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: report } = await admin
    .from("damage_reports")
    .select("id, photos")
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!report) return NextResponse.json({ error: "Bericht nicht gefunden" }, { status: 404 });

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const stamp = Date.now().toString(36);
  const path = `${auth.org_id}/${params.id}/${stamp}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);

  const { error: upErr } = await admin.storage
    .from("damage-photos")
    .upload(path, buf, { contentType: file.type, upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const photos = [...((report.photos as string[]) || []), path];
  const { data, error } = await admin
    .from("damage_reports")
    .update({ photos })
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, damage_report: data, path });
};

export const DELETE = async (req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const path = url.searchParams.get("path");
  if (!path) return NextResponse.json({ error: "path fehlt" }, { status: 400 });

  const admin = createAdminClient();
  const { data: report } = await admin
    .from("damage_reports")
    .select("photos")
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!report) return NextResponse.json({ error: "Bericht nicht gefunden" }, { status: 404 });

  const photos = ((report.photos as string[]) || []).filter((p) => p !== path);
  await admin.storage.from("damage-photos").remove([path]);

  const { error } = await admin
    .from("damage_reports")
    .update({ photos })
    .eq("id", params.id)
    .eq("org_id", auth.org_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
};
