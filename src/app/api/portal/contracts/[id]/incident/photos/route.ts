import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { loadPortalContract } from "@/lib/portal-contract-guard";
import { UploadGuardError, validateUpload } from "@/lib/upload-guard";

export const maxDuration = 30;

// Foto-Upload für eine Schadenmeldung → damage-photos-Bucket. Gibt den Pfad
// zurück; die Pfade werden anschließend beim Anlegen der Meldung übergeben.
export const POST = async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await loadPortalContract(params.id);
  if (!ctx) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const form = await req.formData();
  let valid;
  try {
    valid = validateUpload(form.get("file"));
  } catch (e) {
    if (e instanceof UploadGuardError)
      return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
  const { ext, contentType } = valid;

  const path = `${ctx.session.org_id}/${params.id}/incident/${randomUUID()}.${ext}`;
  const buf = Buffer.from(await valid.file.arrayBuffer());

  const { error } = await ctx.admin.storage
    .from("damage-photos")
    .upload(path, buf, { contentType, upsert: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, path });
};
