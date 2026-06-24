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

  // Datum strikt validieren: nur ISO-Format YYYY-MM-DD UND parsbar. Ohne diese
  // Prüfung erzeugt new Date(<müll>) NaN → daysBetween NaN → der <=0-Guard greift
  // NICHT (NaN <= 0 ist false), und NaN würde in extra_days/est_cost und später
  // in contracts.return_date persistiert.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate) || Number.isNaN(new Date(newDate).getTime())) {
    return NextResponse.json({ error: "Ungültiges Rückgabedatum." }, { status: 400 });
  }
  // Uhrzeit optional — nur akzeptieren, wenn valides HH:MM, sonst null.
  const reqTime = body.requested_return_time?.trim();
  const requestedReturnTime =
    reqTime && /^([01]\d|2[0-3]):[0-5]\d$/.test(reqTime) ? reqTime : null;

  const current = ctx.contract.return_date as string;
  const extraDays = daysBetween(current, newDate);
  // NaN-sicherer Guard + sinnvolle Obergrenze (max. 1 Jahr Verlängerung).
  if (!Number.isFinite(extraDays) || extraDays <= 0) {
    return NextResponse.json(
      { error: "Das neue Rückgabedatum muss nach dem aktuellen liegen." },
      { status: 400 }
    );
  }
  if (extraDays > 365) {
    return NextResponse.json(
      { error: "Verlängerung darf maximal 365 Tage betragen." },
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
    requested_return_time: requestedReturnTime,
    extra_days: extraDays,
    est_cost: estCost,
    status: "angefragt",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, extra_days: extraDays, est_cost: estCost });
};
