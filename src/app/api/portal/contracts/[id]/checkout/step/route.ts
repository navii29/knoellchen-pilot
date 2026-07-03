import { NextResponse } from "next/server";
import { loadPortalContract } from "@/lib/portal-contract-guard";

type Ctx = { params: { id: string } };

export const PATCH = async (req: Request, { params }: Ctx) => {
  const ctx = await loadPortalContract(params.id);
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { step?: number };
  if (typeof body.step !== "number")
    return NextResponse.json({ error: "step erforderlich" }, { status: 400 });
  // Max 3: checkout_step=4 bedeutet "Rückgabe erfasst" und wird ausschließlich
  // vom complete-Endpoint gesetzt — sonst gilt der Vertrag schon beim Betreten
  // der Prüfseite als zurückgegeben.
  const step = Math.max(0, Math.min(3, Math.floor(body.step)));

  const { error } = await ctx.admin
    .from("contracts")
    .update({ checkout_step: step })
    .eq("id", params.id)
    .eq("org_id", ctx.session.org_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, checkout_step: step });
};
