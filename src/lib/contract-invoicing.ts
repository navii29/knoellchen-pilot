// Geteilte LexOffice-Rechnungserstellung für einen Vertrag — genutzt von der
// manuellen Aktivierung (activate-Route) UND der Auto-Abrechnung (Cron). EINE
// Quelle der Wahrheit, damit beide Wege identisch korrekt sind.
//
// Eigenschaften:
// - Idempotent: erstellt nur FEHLENDE Belege (Miet-/Kautions-Rechnung).
// - Atomares "__pending__"-Claim (bedingtes UPDATE nur solange die Spalte null
//   ist) → keine Doppel-Rechnungen bei gleichzeitigen Aufrufen.
// - Selbstheilung: hängengebliebene "__pending__"-Marker (aus abgebrochenem
//   Lauf) werden zurückgesetzt und neu vergeben.
// - Steuerart aus dem LexOffice-KONTO (profile.taxType/smallBusiness), nicht aus
//   unserem Flag → kein 406 "No vatfree invoices".
// - Wirft LexOfficeError bei API-Fehlern; der Aufrufer entscheidet die Antwort.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Contract, Customer, Vehicle } from "./types";
import {
  buildContractInvoice,
  buildDepositInvoice,
  lxCreateInvoice,
  lxGetProfile,
} from "./lexoffice";

const realId = (v: string | null | undefined): string | null =>
  v && v !== "__pending__" ? v : null;

export const createContractInvoices = async (args: {
  admin: SupabaseClient;
  orgId: string;
  apiKey: string;
  contract: Contract;
}): Promise<{ rentalInvoiceId: string | null; depositInvoiceId: string | null }> => {
  const { admin, orgId, apiKey, contract } = args;
  let rentalInvoiceId = realId(contract.lexoffice_invoice_id);
  let depositInvoiceId = realId(contract.deposit_invoice_id);

  const [{ data: customer }, { data: vehicle }] = await Promise.all([
    contract.customer_id
      ? admin
          .from("customers")
          .select("*")
          .eq("id", contract.customer_id)
          .eq("org_id", orgId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    contract.vehicle_id
      ? admin
          .from("vehicles")
          .select("manufacturer, model, vehicle_type, extra_km_price, lexoffice_product_id")
          .eq("id", contract.vehicle_id)
          .eq("org_id", orgId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // Selbstheilung hängengebliebener "__pending__"-Marker.
  if (contract.lexoffice_invoice_id === "__pending__")
    await admin
      .from("contracts")
      .update({ lexoffice_invoice_id: null })
      .eq("id", contract.id)
      .eq("org_id", orgId)
      .eq("lexoffice_invoice_id", "__pending__");
  if (contract.deposit_invoice_id === "__pending__")
    await admin
      .from("contracts")
      .update({ deposit_invoice_id: null })
      .eq("id", contract.id)
      .eq("org_id", orgId)
      .eq("deposit_invoice_id", "__pending__");

  // Steuerart aus dem LexOffice-Konto ableiten (maßgeblich für taxType).
  const profile = await lxGetProfile(apiKey);
  const kleinunternehmer = profile.taxType === "vatfree" || profile.smallBusiness === true;

  // 1) Miet-Rechnung — atomar claimen, dann erstellen.
  if (!rentalInvoiceId) {
    const { data: claimed } = await admin
      .from("contracts")
      .update({ lexoffice_invoice_id: "__pending__" })
      .eq("id", contract.id)
      .eq("org_id", orgId)
      .is("lexoffice_invoice_id", null)
      .select("id")
      .maybeSingle();
    if (claimed) {
      try {
        const invoice = buildContractInvoice(
          contract,
          (customer as Customer | null) ?? null,
          (vehicle as Vehicle | null) ?? null,
          kleinunternehmer
        );
        const result = await lxCreateInvoice(apiKey, invoice);
        rentalInvoiceId = result.id;
        await admin
          .from("contracts")
          .update({ lexoffice_invoice_id: rentalInvoiceId })
          .eq("id", contract.id)
          .eq("org_id", orgId);
      } catch (e) {
        await admin
          .from("contracts")
          .update({ lexoffice_invoice_id: null })
          .eq("id", contract.id)
          .eq("org_id", orgId)
          .eq("lexoffice_invoice_id", "__pending__");
        throw e;
      }
    }
  }

  // 2) Separate, steuerneutrale Kautions-Rechnung — ebenfalls atomar claimen.
  if (!depositInvoiceId && Number(contract.deposit ?? 0) > 0) {
    const { data: claimed } = await admin
      .from("contracts")
      .update({ deposit_invoice_id: "__pending__" })
      .eq("id", contract.id)
      .eq("org_id", orgId)
      .is("deposit_invoice_id", null)
      .select("id")
      .maybeSingle();
    if (claimed) {
      try {
        const depInvoice = buildDepositInvoice(
          contract,
          (customer as Customer | null) ?? null,
          kleinunternehmer
        );
        const depResult = await lxCreateInvoice(apiKey, depInvoice);
        depositInvoiceId = depResult.id;
        await admin
          .from("contracts")
          .update({ deposit_invoice_id: depositInvoiceId })
          .eq("id", contract.id)
          .eq("org_id", orgId);
      } catch (e) {
        await admin
          .from("contracts")
          .update({ deposit_invoice_id: null })
          .eq("id", contract.id)
          .eq("org_id", orgId)
          .eq("deposit_invoice_id", "__pending__");
        throw e;
      }
    }
  }

  return { rentalInvoiceId, depositInvoiceId };
};
