import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { LexOfficeError } from "@/lib/lexoffice";
import { createContractInvoices } from "@/lib/contract-invoicing";
import type { Contract } from "@/lib/types";

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

type Ctx = { params: { id: string } };

/**
 * Vertrag manuell aktivieren → stößt die Rechnungsstellung an.
 * - Miet-Rechnung (LexOffice), falls noch keine existiert.
 * - Separate, steuerneutrale Kautions-Rechnung, falls deposit > 0.
 * IDs werden inkrementell gespeichert, damit ein Teilfehler keine Waisen-
 * Rechnung in LexOffice hinterlässt (Retry überspringt bereits Erstelltes).
 * Jeder Beleg wird vor dem LexOffice-Call atomar in der DB geclaimt
 * (bedingtes UPDATE auf null → "__pending__"), sodass zwei gleichzeitige
 * Aktivierungen nicht doppelt Rechnungen erzeugen können.
 * Ohne aktivierte LexOffice-Anbindung wird der Vertrag nur als aktiviert
 * markiert (keine Rechnung).
 */
export const POST = async (_req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();

  const { data: contract } = await admin
    .from("contracts")
    .select("*")
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!contract) return NextResponse.json({ error: "Vertrag nicht gefunden" }, { status: 404 });
  // Idempotent & lückenfüllend: ein erneuter Aufruf erstellt nur noch fehlende
  // Belege (z. B. eine nachträglich gesetzte Kaution) — die per-Beleg-Guards
  // unten verhindern Doppel-Rechnungen.
  if (contract.status === "storniert")
    return NextResponse.json(
      { error: "Stornierte Verträge können nicht aktiviert werden." },
      { status: 400 }
    );

  // Soft-block: Hohes Risiko ohne Freigabe → Aktivierung verweigern.
  if (
    (contract as { risk_level?: string | null }).risk_level === "rot" &&
    !(contract as { risk_override_at?: string | null }).risk_override_at
  ) {
    return NextResponse.json(
      {
        error:
          "Risiko: hoch (rot). Bitte die Risikoprüfung ansehen und bei Bedarf freigeben, bevor der Vertrag aktiviert wird.",
      },
      { status: 409 }
    );
  }

  const { data: org } = await admin
    .from("organizations")
    .select("lexoffice_api_key, lexoffice_enabled")
    .eq("id", auth.org_id)
    .single();

  // Bug-Fix: LexOffice aktiviert, aber KEIN Key hinterlegt (z. B. Key entfernt,
  // enabled blieb an) → NICHT stillschweigend ohne die versprochene Rechnung
  // aktivieren, sondern klar melden.
  const keyPresent = !!(org?.lexoffice_api_key && String(org.lexoffice_api_key).trim());
  if (org?.lexoffice_enabled && !keyPresent) {
    return NextResponse.json(
      {
        error:
          "LexOffice ist aktiviert, aber es ist kein API-Key hinterlegt. Bitte in den Einstellungen den LexOffice-API-Key eintragen.",
      },
      { status: 400 }
    );
  }

  const lexofficeReady = Boolean(org?.lexoffice_enabled && keyPresent);
  // "__pending__" ist KEINE echte Rechnungs-ID (hängengebliebenes Lock aus einem
  // abgebrochenen Lauf) → als "nicht erstellt" behandeln, damit ein erneuter
  // Versuch die Rechnung nachholt statt sie stillschweigend zu überspringen.
  const realId = (v: string | null | undefined): string | null =>
    v && v !== "__pending__" ? v : null;
  let rentalInvoiceId: string | null = realId(contract.lexoffice_invoice_id);
  let depositInvoiceId: string | null = realId(contract.deposit_invoice_id);

  if (lexofficeReady) {
    const apiKey = org!.lexoffice_api_key as string;
    try {
      // Geteilte, idempotente Rechnungserstellung (identisch mit der
      // Auto-Abrechnung im Cron).
      const res = await createContractInvoices({
        admin,
        orgId: auth.org_id,
        apiKey,
        contract: contract as Contract,
      });
      rentalInvoiceId = res.rentalInvoiceId;
      depositInvoiceId = res.depositInvoiceId;
    } catch (e) {
      if (e instanceof LexOfficeError) {
        return NextResponse.json(
          { error: `LexOffice-Fehler ${e.status}: ${e.message}`, detail: e.body },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Rechnung fehlgeschlagen" },
        { status: 500 }
      );
    }
  }

  const { error } = await admin
    .from("contracts")
    .update({
      is_activated: true,
      activated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .eq("org_id", auth.org_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logActivity(
    admin,
    auth.user.id,
    auth.org_id,
    "contract.activate",
    (contract as { contract_nr?: string })?.contract_nr ?? null
  );

  return NextResponse.json({
    ok: true,
    is_activated: true,
    invoiced: lexofficeReady,
    lexoffice_invoice_id: rentalInvoiceId,
    deposit_invoice_id: depositInvoiceId,
  });
};
