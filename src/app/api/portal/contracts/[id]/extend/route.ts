import { NextResponse } from "next/server";
import { loadPortalContract } from "@/lib/portal-contract-guard";
import { daysBetween } from "@/lib/km";

// Verlängerungs-Anfrage: legt einen contract_extensions-Eintrag an (Status
// 'angefragt'; der Betreiber bestätigt). Mehrkosten = Zusatztage × Tagespreis.
export const POST = async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await loadPortalContract(params.id);
  if (!ctx) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    requested_return_date?: string;
    requested_return_time?: string;
  };
  const newDate = body.requested_return_date;
  if (!newDate) return NextResponse.json({ error: "Datum fehlt" }, { status: 400 });

  const current = ctx.contract.return_date as string;
  const extraDays = daysBetween(current, newDate);
  if (extraDays <= 0) {
    return NextResponse.json(
      { error: "Das neue Rückgabedatum muss nach dem aktuellen liegen." },
      { status: 400 }
    );
  }

  const daily = Number(ctx.contract.daily_rate ?? 0);
  const estCost = Math.round(extraDays * daily * 100) / 100;

  const { error } = await ctx.admin.from("contract_extensions").insert({
    contract_id: ctx.contract.id,
    customer_id: ctx.session.customer_id,
    org_id: ctx.session.org_id,
    current_return_date: current,
    requested_return_date: newDate,
    requested_return_time: body.requested_return_time?.trim() || null,
    extra_days: extraDays,
    est_cost: estCost,
    status: "angefragt",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, extra_days: extraDays, est_cost: estCost });
};
