import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildNachtragInput, type NachtragInputSources } from "./nachtrag-input";
import { buildNachtragHtml } from "./nachtrag-html";
import {
  loadVehicleForContract,
  loadCustomerForContract,
  loadLogoBase64,
} from "./contract-loaders";
import { resolveEffectiveDailyRate, estimateExtensionCost } from "./daily-rate";

// Mock-admin: liefert ein festes Vehicle/Customer; loadLogoBase64 wird durch
// logo_path: null umgangen (kein Storage-Call).
const makeAdmin = (
  vehicle: Record<string, unknown> | null,
  customer: Record<string, unknown> | null
): SupabaseClient => {
  const qb = (result: unknown) => {
    const b: Record<string, unknown> = {};
    for (const m of ["select", "eq", "is", "order", "in"]) b[m] = () => b;
    b.maybeSingle = async () => ({ data: result, error: null });
    return b;
  };
  return {
    from: (table: string) =>
      table === "vehicles" ? qb(vehicle) : table === "customers" ? qb(customer) : qb(null),
  } as unknown as SupabaseClient;
};

// VERBATIM-Kopie der approve-Inline-Assembly VOR dem Refactor (Stand
// extension/route.ts:235-278). Dient als "vorher"-Referenz: identisches HTML
// gegenüber buildNachtragInput beweist Verhaltensneutralität.
const assembleInlineReference = async (admin: SupabaseClient, s: NachtragInputSources) => {
  const vehicle = await loadVehicleForContract(
    admin,
    s.orgId,
    s.contract.vehicle_id ?? null,
    s.contract.plate ?? null
  );
  const customer = await loadCustomerForContract(admin, s.orgId, s.extension.customer_id ?? null);
  const logoDataUri = await loadLogoBase64(admin, s.org.logo_path ?? null);
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
  };
};

const sources = (over: Partial<NachtragInputSources> = {}): NachtragInputSources => ({
  orgId: "org-1",
  org: { name: "Muster GmbH", city: "München", logo_path: null, brand_color: "#1d4ed8" },
  contract: {
    contract_nr: "MV-1",
    renter_name: "Fallback Name",
    plate: "M-AB 1",
    vehicle_id: "veh-1",
    vehicle_type: "Fallback Modell",
    daily_rate: 69,
    weekly_rate: null,
    monthly_rate: null,
  },
  extension: {
    customer_id: "cust-1",
    current_return_date: "2026-07-08",
    requested_return_date: "2026-07-15",
    extra_days: 7,
  },
  dateStr: "28.06.2026",
  ...over,
});

describe("buildNachtragInput — verhaltensneutral zur alten Inline-Assembly", () => {
  const cases: { name: string; vehicle: Record<string, unknown> | null; customer: Record<string, unknown> | null; over?: Partial<NachtragInputSources> }[] = [
    {
      name: "volle Daten (Vehicle + Customer + Tagespreis)",
      vehicle: { id: "veh-1", manufacturer: "VW", model: "Polo", fin_number: "WVW1", daily_rate: 80 },
      customer: { first_name: "Erika", last_name: "Musterfrau" },
    },
    {
      name: "kein Vehicle / kein Customer → Vertrags-Fallbacks",
      vehicle: null,
      customer: null,
    },
    {
      name: "null Tagespreis (Vertrag + Vehicle ohne Rate)",
      vehicle: { id: "veh-1", manufacturer: "Audi", model: "Q3", fin_number: "WAU1", daily_rate: null },
      customer: { first_name: "Max", last_name: "" },
      over: { contract: { ...sources().contract, daily_rate: null } },
    },
  ];

  for (const c of cases) {
    it(`identisches HTML — ${c.name}`, async () => {
      const admin = makeAdmin(c.vehicle, c.customer);
      const s = sources(c.over);
      const ref = await assembleInlineReference(admin, s);
      const helper = await buildNachtragInput(admin, s);
      // Kernbeweis: das gerenderte HTML ist byte-identisch.
      expect(buildNachtragHtml(helper)).toBe(buildNachtragHtml(ref));
    });
  }

  it("reicht Signaturen durch (sign-Pfad)", async () => {
    const admin = makeAdmin(null, null);
    const helper = await buildNachtragInput(admin, {
      ...sources(),
      signatureDataUri: "data:image/png;base64,AAA",
      landlordSignatureDataUri: "data:image/png;base64,BBB",
    });
    expect(helper.signatureDataUri).toBe("data:image/png;base64,AAA");
    expect(helper.landlordSignatureDataUri).toBe("data:image/png;base64,BBB");
    const html = buildNachtragHtml(helper);
    expect(html).toContain('<div class="ink"><img src="data:image/png;base64,AAA"');
    expect(html).toContain('<div class="ink"><img src="data:image/png;base64,BBB"');
  });

  it("Monatspreis ÷ 29 hat Vorrang im Nachtrag (contract.monthly_rate gesetzt)", async () => {
    const admin = makeAdmin({ id: "veh-1", manufacturer: "VW", model: "Polo", daily_rate: 80 }, null);
    const helper = await buildNachtragInput(admin, {
      ...sources(),
      contract: { ...sources().contract, daily_rate: 50, monthly_rate: 2000 },
    });
    expect(helper.dailyRate).toBe(68.97); // 2000/29, nicht 50 (daily) / 80 (vehicle)
    expect(helper.extraCost).toBe(482.79); // 7 Tage × 68,97
  });
});
