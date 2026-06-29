// Baut den NachtragInput aus (org, contract, extension) — geteilt zwischen dem
// approve-Block (unsigniert) und der Portal-Sign-Route (signiert). Die Assembly
// (Vehicle/Customer/Logo via contract-loaders + Tagespreis/Kosten via daily-rate)
// ist 1:1 aus dem früheren approve-Inline-Block übernommen; dateStr wird vom
// Aufrufer übergeben (verhaltensneutral, deterministisch testbar). Signaturen
// optional: ungesetzt → leere Linien (wie approve), gesetzt → gestempelt (sign).
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadVehicleForContract,
  loadCustomerForContract,
  loadLogoBase64,
} from "./contract-loaders";
import { resolveEffectiveDailyRate, estimateExtensionCost } from "./daily-rate";
import type { NachtragInput } from "./nachtrag-html";

export type NachtragInputSources = {
  orgId: string;
  org: {
    name: string | null;
    city: string | null;
    logo_path: string | null;
    brand_color: string | null;
  };
  contract: {
    contract_nr: string | null;
    renter_name: string | null;
    plate: string | null;
    vehicle_id: string | null;
    vehicle_type: string | null;
    daily_rate: number | null;
    monthly_rate: number | null;
  };
  extension: {
    customer_id: string | null;
    current_return_date: string | null;
    requested_return_date: string | null;
    extra_days: number | null;
  };
  dateStr: string; // Aufrufer: fmtDate(new Date().toISOString())
  signatureDataUri?: string | null; // Mieter (sign-route), sonst null
  landlordSignatureDataUri?: string | null; // Vermieter (org.landlord_signature_data), sonst null
};

export const buildNachtragInput = async (
  admin: SupabaseClient,
  s: NachtragInputSources
): Promise<NachtragInput> => {
  const vehicle = await loadVehicleForContract(
    admin,
    s.orgId,
    s.contract.vehicle_id ?? null,
    s.contract.plate ?? null
  );
  const customer = await loadCustomerForContract(admin, s.orgId, s.extension.customer_id ?? null);
  const logoDataUri = await loadLogoBase64(admin, s.org.logo_path ?? null);
  // Kosten neu rechnen (gleiche geteilte Funktionen wie die Schätzung) →
  // Tagespreis × Tage = Kosten exakt im Dokument. Monatspreis ÷ 29 hat Vorrang.
  const dailyRate = resolveEffectiveDailyRate({
    contractRate: s.contract.daily_rate ?? null,
    vehicleRate: (vehicle?.daily_rate as number | null) ?? null,
    contractMonthlyRate: s.contract.monthly_rate ?? null,
    vehicleMonthlyRate: (vehicle?.monthly_rate as number | null) ?? null,
  });
  const extraDays = Number(s.extension.extra_days ?? 0);
  const extraCost = estimateExtensionCost({ extraDays, rate: dailyRate });
  const renterName =
    [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
    (s.contract.renter_name as string) ||
    "";
  const vehicleModel =
    [vehicle?.manufacturer, vehicle?.model].filter(Boolean).join(" ") ||
    (s.contract.vehicle_type as string | null) ||
    "";
  return {
    orgName: (s.org.name as string) || "",
    logoDataUri,
    brandColor: s.org.brand_color ?? null,
    contractNr: (s.contract.contract_nr as string) || "",
    renterName,
    vehicleModel,
    plate: (s.contract.plate as string) || "",
    fin: (vehicle?.fin_number as string | null) ?? null,
    originalReturnDate: s.extension.current_return_date as string,
    newReturnDate: s.extension.requested_return_date as string,
    extraDays,
    dailyRate,
    extraCost,
    city: s.org.city ?? null,
    dateStr: s.dateStr,
    signatureDataUri: s.signatureDataUri ?? null,
    landlordSignatureDataUri: s.landlordSignatureDataUri ?? null,
  };
};
