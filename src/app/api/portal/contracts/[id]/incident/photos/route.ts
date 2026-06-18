import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { loadPortalContract } from "@/lib/portal-contract-guard";

export const maxDuration = 30;

// Foto-Upload für eine Schadenmeldung → damage-photos-Bucket. Gibt den Pfad
// zurück; die Pfade werden anschließend beim Anlegen der Meldung übergeben.
export const POST = async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await loadPortalContract(params.id);
  if (!ctx) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Datei fehlt" }, { status: 400 });
  if (file.size > 12 * 1024 * 1024)
    return NextResponse.json({ error: "Datei zu groß (max 12 MB)" }, { status: 400 });

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${ctx.session.org_id}/${params.id}/incident/${randomUUID()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error } = await ctx.admin.storage
    .from("damage-photos")
    .upload(path, buf, { contentType: file.type, upsert: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, path });
};
