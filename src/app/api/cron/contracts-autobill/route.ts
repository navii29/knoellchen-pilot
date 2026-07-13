import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { LexOfficeError } from "@/lib/lexoffice";
import { createContractInvoices } from "@/lib/contract-invoicing";
import { requireCron } from "@/lib/cron-auth";
import type { Contract } from "@/lib/types";

// Täglicher Cron: Auto-Abrechnung beim Mietstart.
// Für jede Org mit aktivem LexOffice werden Verträge abgerechnet, deren
// Mietbeginn (pickup_date) erreicht ist und die noch nicht abgerechnet sind
// (is_activated=false). Erzeugt die (finalisierte) Miet- + Kautions-Rechnung
// über die geteilte, idempotente createContractInvoices — identisch zum
// manuellen Weg. So muss niemand mehr manuell „abrechnen".
//
// Bewusst übersprungen (bleiben für die manuelle Bearbeitung):
// - Alt-Bestand: NUR Verträge, die ab Go-Live neu angelegt wurden
//   (created_at >= AUTOBILL_SINCE). Ohne diese Grenze würde der erste Lauf
//   den kompletten Bestand rückwirkend finalisiert abrechnen (bei Eazycar
//   ~669 Verträge zurück bis 2024). Bestandsverträge bleiben rein manuell.
// - Risiko „rot" ohne Freigabe.
// - kein abrechenbarer Mietbetrag (weder total_amount noch ein Tarif).
// Sequenziell pro Org (LexOffice Rate-Limit ~2 req/s).
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Stichtag: nur ab diesem Zeitpunkt NEU angelegte Verträge werden automatisch
// abgerechnet. Schützt den historischen Bestand (der bei Anlage status="aktiv"
// bekam und ihn nie automatisch verliert) vor rückwirkender Finalisierung.
// Jüngster Bestandsvertrag war 2026-07-10 → 07-13 schließt den Bestand sicher aus.
const AUTOBILL_SINCE = "2026-07-13T00:00:00Z";

const PAGE = 1000;
// Obergrenze pro Lauf, damit ein Rückstau die Funktion nicht sprengt. Rest wird
// beim nächsten Lauf abgerechnet und unten sichtbar geloggt (kein stilles Kappen).
const MAX_PER_RUN = 60;

type RangeQuery<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }> & {
  range: (from: number, to: number) => RangeQuery<T>;
};
const fetchAll = async <T>(
  build: () => RangeQuery<T>
): Promise<{ rows: T[]; error: string | null }> => {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await build().range(offset, offset + PAGE - 1);
    if (error) return { rows, error: error.message };
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return { rows, error: null };
};

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const GET = async (req: Request) => {
  const denied = requireCron(req);
  if (denied) return denied;

  const admin = createAdminClient();
  const todayIso = new Date().toISOString().slice(0, 10);
  let billed = 0;
  let skipped = 0;
  let errors = 0;
  let remaining = 0;

  const orgsRes = await fetchAll<{ id: string; lexoffice_api_key: string | null }>(() =>
    admin
      .from("organizations")
      .select("id, lexoffice_api_key")
      .eq("lexoffice_enabled", true)
      .not("lexoffice_api_key", "is", null)
  );
  if (orgsRes.error) {
    console.error("contracts-autobill: orgs query failed", orgsRes.error);
    return NextResponse.json({ ok: false, error: "orgs query failed" }, { status: 500 });
  }

  for (const org of orgsRes.rows) {
    const apiKey = (org.lexoffice_api_key as string).trim();
    if (!apiKey) continue;

    // Fällige, noch nicht abgerechnete Verträge (Mietbeginn erreicht) — aber NUR
    // ab Go-Live neu angelegte (created_at >= AUTOBILL_SINCE), damit der
    // Alt-Bestand nicht rückwirkend abgerechnet wird.
    const { data: contracts, error } = await admin
      .from("contracts")
      .select("*")
      .eq("org_id", org.id)
      .eq("status", "aktiv")
      .eq("is_activated", false)
      .gte("created_at", AUTOBILL_SINCE)
      .lte("pickup_date", todayIso)
      .order("pickup_date", { ascending: true })
      .limit(MAX_PER_RUN + 1);
    if (error) {
      console.error(`contracts-autobill: contracts query failed for org ${org.id}`, error);
      errors++;
      continue;
    }
    const rows = (contracts ?? []) as Contract[];
    if (rows.length > MAX_PER_RUN) remaining += rows.length - MAX_PER_RUN;

    for (const c of rows.slice(0, MAX_PER_RUN)) {
      // Risiko „rot" ohne Freigabe → nicht automatisch abrechnen.
      const risk = c as Contract & { risk_level?: string | null; risk_override_at?: string | null };
      if (risk.risk_level === "rot" && !risk.risk_override_at) {
        skipped++;
        continue;
      }
      // Kein abrechenbarer Mietbetrag → manuell klären, keine 0-€-Rechnung.
      const hasRent =
        num(c.total_amount) > 0 ||
        num(c.daily_rate) > 0 ||
        num(c.weekly_rate) > 0 ||
        num(c.monthly_rate) > 0;
      if (!hasRent) {
        skipped++;
        continue;
      }

      try {
        await createContractInvoices({ admin, orgId: org.id, apiKey, contract: c });
        // Als abgerechnet markieren (nur wenn beide Belege ohne Fehler liefen).
        const { error: updErr } = await admin
          .from("contracts")
          .update({
            is_activated: true,
            activated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", c.id)
          .eq("org_id", org.id);
        if (updErr) {
          console.error(`contracts-autobill: mark billed failed (contract ${c.id})`, updErr.code ?? "");
          errors++;
        } else {
          billed++;
        }
      } catch (e) {
        // Ein Vertrag-Fehler bricht den Batch NIE ab. PII-frei loggen.
        const msg = e instanceof LexOfficeError ? `LexOffice ${e.status}` : "unbekannt";
        console.error(`contracts-autobill: invoice failed (contract ${c.id}): ${msg}`);
        errors++;
      }
    }
  }

  if (remaining > 0)
    console.warn(`contracts-autobill: ${remaining} weitere fällige Verträge — werden im nächsten Lauf abgerechnet.`);

  return NextResponse.json({ ok: true, billed, skipped, errors, remaining });
};
