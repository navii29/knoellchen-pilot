import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { compareHandoverPhotos } from "@/lib/anthropic";
import { POSITIONS } from "@/lib/handover";
import type { HandoverPhoto, HandoverPosition } from "@/lib/types";

export const maxDuration = 60;

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

const detectMediaType = (
  path: string
): "image/jpeg" | "image/png" | "image/webp" => {
  const ext = (path.split(".").pop() || "jpg").toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
};

export const POST = async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { position?: string };
  const position = body.position as HandoverPosition | undefined;

  const admin = createAdminClient();
  const { data: contract } = await admin
    .from("contracts")
    .select("id")
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!contract) return NextResponse.json({ error: "Vertrag nicht gefunden" }, { status: 404 });

  let query = admin
    .from("handover_photos")
    .select("*")
    .eq("contract_id", params.id)
    .eq("org_id", auth.org_id);
  if (position) query = query.eq("position", position);

  const { data: photos } = await query;
  const all = (photos ?? []) as HandoverPhoto[];

  // Gruppiere nach Position, brauche pickup + return
  const positionsToProcess = position ? [position] : POSITIONS.map((p) => p.key);
  const results: Record<
    string,
    | { ok: true; data: { has_damage: boolean; description: string; severity: string } }
    | { ok: false; error: string }
  > = {};

  for (const pos of positionsToProcess) {
    const pickup = all.find((p) => p.position === pos && p.type === "pickup");
    const ret = all.find((p) => p.position === pos && p.type === "return");
    if (!pickup || !ret) {
      results[pos] = { ok: false, error: "Vorher- oder Nachher-Foto fehlt" };
      continue;
    }
    try {
      const [pickupRes, returnRes] = await Promise.all([
        admin.storage.from("handover-photos").download(pickup.photo_path),
        admin.storage.from("handover-photos").download(ret.photo_path),
      ]);
      if (pickupRes.error || returnRes.error || !pickupRes.data || !returnRes.data) {
        results[pos] = { ok: false, error: "Foto-Download fehlgeschlagen" };
        continue;
      }
      const pickupBuf = Buffer.from(await pickupRes.data.arrayBuffer());
      const returnBuf = Buffer.from(await returnRes.data.arrayBuffer());

      const label = POSITIONS.find((p) => p.key === pos)?.label ?? pos;
      const cmp = await compareHandoverPhotos(
        pickupBuf.toString("base64"),
        detectMediaType(pickup.photo_path),
        returnBuf.toString("base64"),
        detectMediaType(ret.photo_path),
        label
      );
      results[pos] = { ok: true, data: cmp.data };
    } catch (e) {
      results[pos] = {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  return NextResponse.json({ ok: true, results });
};
