import { NextResponse } from "next/server";
import { loadPortalContract } from "@/lib/portal-contract-guard";

type Ctx = { params: { id: string } };

export const PATCH = async (req: Request, { params }: Ctx) => {
  const ctx = await loadPortalContract(params.id);
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { step?: number };
  if (typeof body.step !== "number")
    return NextResponse.json({ error: "step erforderlich" }, { status: 400 });
  const step = Math.max(0, Math.min(5, Math.floor(body.step)));

  const { error } = await ctx.admin
    .from("contracts")
    .update({ checkin_step: step })
    .eq("id", params.id)
    .eq("org_id", ctx.session.org_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, checkin_step: step });
};
