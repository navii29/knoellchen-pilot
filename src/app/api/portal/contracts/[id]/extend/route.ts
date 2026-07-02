import { NextResponse } from "next/server";
import { loadPortalContract } from "@/lib/portal-contract-guard";
import { daysBetween } from "@/lib/km";
import { buildOperatorExtensionNotification } from "@/lib/operator-notify";
import { resolveEffectiveDailyRate, estimateExtensionCost } from "@/lib/daily-rate";

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

  // Effektiver Tagespreis: Vertragspreis, sonst Fahrzeugpreis als Fallback. Das
  // Fahrzeug org-scoped über ctx.admin laden (der Flow nutzt admin durchgängig).
  const vehKey = ctx.contract.vehicle_id ? "id" : "plate";
  const vehVal = (ctx.contract.vehicle_id ?? ctx.contract.plate) as string | null;
  let vehicleRate: number | null = null;
  let vehicleMonthlyRate: number | null = null;
  let vehicleWeeklyRate: number | null = null;
  if (vehVal) {
    const { data: veh } = await ctx.admin
      .from("vehicles")
      .select("daily_rate, weekly_rate, monthly_rate")
      .eq("org_id", ctx.session.org_id)
      .eq(vehKey, vehVal)
      .maybeSingle();
    vehicleRate = (veh?.daily_rate as number | null) ?? null;
    vehicleMonthlyRate = (veh?.monthly_rate as number | null) ?? null;
    vehicleWeeklyRate = (veh?.weekly_rate as number | null) ?? null;
  }
  // Geteilte Regel: Monat ÷ 29 > Woche ÷ 7 > Tag (jeweils Vertrag vor Fahrzeug).
  const daily = resolveEffectiveDailyRate({
    contractRate: ctx.contract.daily_rate,
    vehicleRate,
    contractMonthlyRate: ctx.contract.monthly_rate,
    vehicleMonthlyRate,
    contractWeeklyRate: ctx.contract.weekly_rate,
    vehicleWeeklyRate,
  });
  // Gespeicherter Schätzwert über dieselbe geteilte Funktion wie die Anzeige.
  const estCost = estimateExtensionCost({ extraDays, rate: daily }) ?? 0;

  const { data: created, error } = await ctx.admin
    .from("contract_extensions")
    .insert({
      contract_id: ctx.contract.id,
      customer_id: ctx.session.customer_id,
      org_id: ctx.session.org_id,
      current_return_date: current,
      requested_return_date: newDate,
      requested_return_time: requestedReturnTime,
      extra_days: extraDays,
      est_cost: estCost,
      status: "angefragt",
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Operator über die neue Anfrage benachrichtigen (best-effort, NACH
  // persistierter Anfrage). Insert-Fehler wird PII-frei geloggt (nur contract_id
  // + SQLSTATE) und kippt den Flow NICHT — die Anfrage gilt trotzdem als ok.
  const { error: opErr } = await ctx.admin
    .from("operator_notifications")
    .insert(
      buildOperatorExtensionNotification({
        orgId: ctx.session.org_id,
        contractId: ctx.contract.id,
        extensionId: (created as { id: string } | null)?.id ?? null,
      })
    );
  if (opErr)
    console.error(
      "[extend] operator_notifications insert fehlgeschlagen (contract_id=" +
        ctx.contract.id +
        "):",
      opErr.code ?? ""
    );

  return NextResponse.json({ ok: true, extra_days: extraDays, est_cost: estCost });
};
