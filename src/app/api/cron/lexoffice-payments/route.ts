import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { lxGetInvoice, LexOfficeError } from "@/lib/lexoffice";
import { requireCron } from "@/lib/cron-auth";

// Täglicher Cron: Pollt LexOffice für alle Orgs mit aktivem LexOffice-Zugang
// und markiert Tickets / Verträge als bezahlt, sobald der Invoice-Status "paid" ist.
// Nur vorwärts: Einmal bezahlt bleibt bezahlt (idempotent, nie rückwärts).
// Sequenzielle Verarbeitung pro Org (nicht parallel) um LexOffice Rate-Limit (~2 req/s)
// zu respektieren.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PAGE = 1000;

// PostgREST liefert per Default max. 1000 Zeilen. Ohne Pagination werden
// >1000 Rechnungen still übersprungen (bleiben offen). Dieser Helper liest
// seitenweise via .range() bis eine Seite < PAGE Zeilen liefert.
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

export const GET = async (req: Request) => {
  const denied = requireCron(req);
  if (denied) return denied;

  const admin = createAdminClient();
  let checked = 0;
  let markedPaid = 0;
  let errors = 0;

  // Alle Orgs mit aktivem LexOffice laden (ebenfalls paginiert)
  const orgsRes = await fetchAll<{ id: string; lexoffice_api_key: string | null }>(() =>
    admin
      .from("organizations")
      .select("id, lexoffice_api_key")
      .eq("lexoffice_enabled", true)
      .not("lexoffice_api_key", "is", null)
  );
  if (orgsRes.error) {
    console.error("lexoffice-payments: failed to load organizations", orgsRes.error);
    return NextResponse.json({ ok: false, error: "orgs query failed" }, { status: 500 });
  }

  for (const org of orgsRes.rows) {
    const apiKey = org.lexoffice_api_key as string;

    // Tickets dieser Org mit LexOffice-Invoice, die noch nicht bezahlt sind
    const ticketsRes = await fetchAll<{ id: string; lexoffice_invoice_id: string | null }>(() =>
      admin
        .from("tickets")
        .select("id, lexoffice_invoice_id")
        .eq("org_id", org.id)
        .not("lexoffice_invoice_id", "is", null)
        .or("payment_status.is.null,payment_status.neq.bezahlt")
    );
    if (ticketsRes.error) {
      // Fehlerhafter SELECT darf nicht still übersprungen werden, aber auch nicht
      // den ganzen Lauf abbrechen — Org überspringen und weiter.
      console.error(`lexoffice-payments: tickets query failed for org ${org.id}`, ticketsRes.error);
      errors++;
    } else {
      for (const record of ticketsRes.rows) {
        try {
          checked++;
          const inv = await lxGetInvoice(apiKey, record.lexoffice_invoice_id as string);
          if (inv.voucherStatus === "paid") {
            const { error } = await admin
              .from("tickets")
              .update({
                payment_status: "bezahlt",
                paid_at: new Date().toISOString(),
                status: "bezahlt",
              })
              .eq("id", record.id)
              .eq("org_id", org.id);
            if (!error) markedPaid++;
          }
        } catch (err) {
          // 429/404/Netzwerkfehler dürfen den Rest nicht abbrechen
          errors++;
          if (err instanceof LexOfficeError) {
            console.warn(
              `lexoffice-payments: ticket invoice poll failed (org ${org.id}, status ${err.status})`,
              err.message
            );
          } else {
            console.error("Unexpected error polling LexOffice invoice", err);
          }
        }
      }
    }

    // Verträge dieser Org mit LexOffice-Invoice, die noch nicht bezahlt sind
    const contractsRes = await fetchAll<{ id: string; lexoffice_invoice_id: string | null }>(() =>
      admin
        .from("contracts")
        .select("id, lexoffice_invoice_id")
        .eq("org_id", org.id)
        .not("lexoffice_invoice_id", "is", null)
        .or("payment_status.is.null,payment_status.neq.bezahlt")
    );
    if (contractsRes.error) {
      console.error(
        `lexoffice-payments: contracts query failed for org ${org.id}`,
        contractsRes.error
      );
      errors++;
    } else {
      for (const record of contractsRes.rows) {
        try {
          checked++;
          const inv = await lxGetInvoice(apiKey, record.lexoffice_invoice_id as string);
          if (inv.voucherStatus === "paid") {
            const { error } = await admin
              .from("contracts")
              .update({
                payment_status: "bezahlt",
                paid_at: new Date().toISOString(),
                // contract.status bleibt unverändert — Zahlung ≠ Mietlebenszyklus
              })
              .eq("id", record.id)
              .eq("org_id", org.id);
            if (!error) markedPaid++;
          }
        } catch (err) {
          errors++;
          if (err instanceof LexOfficeError) {
            console.warn(
              `lexoffice-payments: contract invoice poll failed (org ${org.id}, status ${err.status})`,
              err.message
            );
          } else {
            console.error("Unexpected error polling LexOffice contract invoice", err);
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true, checked, markedPaid, errors });
};
