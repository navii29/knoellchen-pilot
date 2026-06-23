import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { compareHandoverPhotos } from "@/lib/anthropic";
import { POSITIONS, summarizeComparison } from "@/lib/handover";
import type { CompareResultMap } from "@/lib/handover";
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
    .select("id, damage_comparison")
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
  const results: CompareResultMap = {};

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

  // Bei Einzel-Position-Vergleich nur diese Position aktualisieren, die übrigen
  // bereits gespeicherten Ergebnisse erhalten — damit die persistierte Map nicht
  // auf eine einzelne Position zusammenschrumpft.
  const previous = (contract.damage_comparison ?? {}) as CompareResultMap;
  const merged: CompareResultMap = position ? { ...previous, ...results } : results;

  // Aggregierte Zusammenfassung für den Vertrag berechnen.
  const summary = summarizeComparison(merged);

  // Org-scoped persistieren — Ergebnis geht beim Neuladen nicht mehr verloren.
  await admin
    .from("contracts")
    .update({
      damage_comparison: merged,
      damage_comparison_at: new Date().toISOString(),
      has_new_damage: summary.has_new_damage,
      damage_max_severity: summary.max_severity,
    })
    .eq("id", params.id)
    .eq("org_id", auth.org_id);

  return NextResponse.json({ ok: true, results });
};
