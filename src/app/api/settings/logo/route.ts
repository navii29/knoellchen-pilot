import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const maxDuration = 30;

const ALLOWED_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/svg+xml": "svg",
};
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

const requireAuth = async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", user.id)
    .single();
  return profile ? { user, org_id: profile.org_id, role: profile.role } : null;
};

const ensureBrandBucket = async (
  admin: ReturnType<typeof createAdminClient>
): Promise<string | null> => {
  const { data: list } = await admin.storage.listBuckets();
  if (list?.some((b) => b.name === "brand")) return null;
  const { error } = await admin.storage.createBucket("brand", {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: Object.keys(ALLOWED_MIME),
  });
  return error?.message ?? null;
};

export const POST = async (req: Request) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "Kein File übermittelt" }, { status: 400 });

  if (file.size > MAX_BYTES)
    return NextResponse.json(
      { error: "Datei zu groß (max 2 MB)" },
      { status: 400 }
    );

  const ext = ALLOWED_MIME[file.type];
  if (!ext)
    return NextResponse.json(
      { error: "Format nicht unterstützt (PNG, JPG oder SVG)" },
      { status: 400 }
    );

  const admin = createAdminClient();
  const bucketErr = await ensureBrandBucket(admin);
  if (bucketErr)
    return NextResponse.json({ error: `Bucket-Fehler: ${bucketErr}` }, { status: 500 });

  // Pfad: org_id/logo-{timestamp}.{ext} — Timestamp verhindert Browser-Caching
  const stamp = Date.now().toString(36);
  const path = `${auth.org_id}/logo-${stamp}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await admin.storage
    .from("brand")
    .upload(path, buf, {
      contentType: file.type,
      upsert: true,
      cacheControl: "31536000",
    });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // Alten Pfad räumen, dann neuen speichern
  const { data: prev } = await admin
    .from("organizations")
    .select("logo_path")
    .eq("id", auth.org_id)
    .maybeSingle();
  const prevPath = (prev as { logo_path?: string | null } | null)?.logo_path;

  const { error: updErr } = await admin
    .from("organizations")
    .update({ logo_path: path })
    .eq("id", auth.org_id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  if (prevPath && prevPath !== path) {
    await admin.storage.from("brand").remove([prevPath]);
  }

  const { data: pub } = admin.storage.from("brand").getPublicUrl(path);
  return NextResponse.json({ ok: true, logo_path: path, url: pub.publicUrl });
};

export const DELETE = async () => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data: prev } = await admin
    .from("organizations")
    .select("logo_path")
    .eq("id", auth.org_id)
    .maybeSingle();
  const prevPath = (prev as { logo_path?: string | null } | null)?.logo_path;

  if (prevPath) {
    await admin.storage.from("brand").remove([prevPath]);
  }
  await admin
    .from("organizations")
    .update({ logo_path: null })
    .eq("id", auth.org_id);

  return NextResponse.json({ ok: true });
};
