import { NextResponse } from "next/server";
import { loadPortalContract } from "@/lib/portal-contract-guard";
import type { HandoverPosition } from "@/lib/types";

export const maxDuration = 30;

const VALID_POSITIONS: ReadonlyArray<HandoverPosition> = [
  "front",
  "rear",
  "left",
  "right",
  "front_left",
  "front_right",
  "rear_left",
  "rear_right",
  "interior",
  "dashboard",
];

type Ctx = { params: { id: string } };

const uploadHandoverPhoto = async (
  type: "pickup" | "return",
  req: Request,
  params: Ctx["params"]
) => {
  const ctx = await loadPortalContract(params.id);
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const position = String(form.get("position") || "");
  if (!(file instanceof File))
    return NextResponse.json({ error: "Datei fehlt" }, { status: 400 });
  if (!VALID_POSITIONS.includes(position as HandoverPosition))
    return NextResponse.json({ error: "Ungültige Position" }, { status: 400 });
  if (file.size > 12 * 1024 * 1024)
    return NextResponse.json({ error: "Datei zu groß (max 12 MB)" }, { status: 400 });

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const stamp = Date.now().toString(36);
  const path = `${ctx.session.org_id}/${params.id}/${type}/${position}-${stamp}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await ctx.admin.storage
    .from("handover-photos")
    .upload(path, buf, { contentType: file.type, upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // Vorhandenes Foto für (contract, type, position) ersetzen — alte Datei räumen
  const { data: existing } = await ctx.admin
    .from("handover_photos")
    .select("id, photo_path")
    .eq("contract_id", params.id)
    .eq("type", type)
    .eq("position", position)
    .maybeSingle();
  if (existing) {
    if (existing.photo_path && existing.photo_path !== path) {
      await ctx.admin.storage.from("handover-photos").remove([existing.photo_path]);
    }
    await ctx.admin
      .from("handover_photos")
      .update({ photo_path: path })
      .eq("id", existing.id);
  } else {
    await ctx.admin.from("handover_photos").insert({
      contract_id: params.id,
      org_id: ctx.session.org_id,
      type,
      position,
      photo_path: path,
    });
  }

  return NextResponse.json({ ok: true, position, type, path });
};

export const POST = async (req: Request, { params }: Ctx) =>
  uploadHandoverPhoto("pickup", req, params);
