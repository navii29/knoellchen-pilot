export type PartnerType =
  | "hotel"
  | "agency"
  | "portal"
  | "workshop"
  | "other"
  | "partner";
export type CommissionType = "fixed" | "percent" | "margin";

export type SalesPartner = {
  id: string;
  org_id: string;
  name: string;
  type: PartnerType;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_number: string | null;
  commission_type: CommissionType;
  commission_value: number | null;
  active: boolean;
  notes: string | null;
  created_at: string;
};

export type VehiclePartnerPricing = {
  id: string;
  vehicle_id: string;
  partner_id: string;
  org_id: string;
  purchase_price: number; // €/Tag, was wir dem Partner zahlen
  selling_price: number; // €/Tag, was der Endkunde zahlt
  created_at: string;
};

export const PARTNER_TYPE_META: Record<
  PartnerType,
  { label: string; short: string; bg: string; ring: string; color: string; text: string }
> = {
  hotel: {
    label: "Hotel",
    short: "Hotel",
    bg: "#fef3c7",
    ring: "#fde68a",
    color: "#b45309",
    text: "#92400e",
  },
  agency: {
    label: "Reisebüro",
    short: "Agentur",
    bg: "#fdf4ff",
    ring: "#f5d0fe",
    color: "#a21caf",
    text: "#86198f",
  },
  portal: {
    label: "Online-Portal",
    short: "Portal",
    bg: "#eff6ff",
    ring: "#bfdbfe",
    color: "#1d4ed8",
    text: "#1e3a8a",
  },
  workshop: {
    label: "Werkstatt",
    short: "Werkstatt",
    bg: "#fff7ed",
    ring: "#fed7aa",
    color: "#c2410c",
    text: "#9a3412",
  },
  other: {
    label: "Sonstiges",
    short: "Sonstiges",
    bg: "#f5f5f4",
    ring: "#e7e5e4",
    color: "#57534e",
    text: "#44403c",
  },
  partner: {
    label: "Partner",
    short: "Partner",
    bg: "#f5f5f4",
    ring: "#e7e5e4",
    color: "#57534e",
    text: "#44403c",
  },
};

export const COMMISSION_TYPE_META: Record<
  CommissionType,
  { label: string; description: string }
> = {
  fixed: {
    label: "Festbetrag pro Vermittlung",
    description: "Pauschaler Betrag pro Vertrag, unabhängig von Tagespreis oder Mietdauer.",
  },
  percent: {
    label: "Prozent vom VK-Preis",
    description: "Provision = % × VK-Preis × Mietdauer in Tagen.",
  },
  margin: {
    label: "Marge (VK − Einstand)",
    description: "Provision = (VK-Preis − Einstandspreis) × Mietdauer in Tagen.",
  },
};

const round2 = (n: number) => Math.round(n * 100) / 100;

// =====================================================
// Provisions-Berechnung pro Vertrag
// =====================================================
export type CommissionInput = {
  partner: Pick<SalesPartner, "commission_type" | "commission_value">;
  purchase_price_per_day: number | null; // Einstand (Tagessatz)
  selling_price_per_day: number | null; // VK (Tagessatz)
  days: number;
};

export type CommissionResult = {
  commission_eur: number;
  basis: "fixed" | "percent_of_selling" | "margin_per_day";
  per_day_purchase: number;
  per_day_selling: number;
  per_day_margin: number;
  total_purchase: number;
  total_selling: number;
};

export const calculateCommission = (
  input: CommissionInput
): CommissionResult => {
  const days = Math.max(1, input.days);
  const purchase = Number(input.purchase_price_per_day ?? 0);
  const selling = Number(input.selling_price_per_day ?? 0);
  const margin = selling - purchase;

  let commission = 0;
  let basis: CommissionResult["basis"] = "fixed";

  switch (input.partner.commission_type) {
    case "fixed":
      commission = Number(input.partner.commission_value ?? 0);
      basis = "fixed";
      break;
    case "percent": {
      const pct = Number(input.partner.commission_value ?? 0);
      commission = (selling * days * pct) / 100;
      basis = "percent_of_selling";
      break;
    }
    case "margin":
      commission = margin * days;
      basis = "margin_per_day";
      break;
  }

  return {
    commission_eur: round2(commission),
    basis,
    per_day_purchase: round2(purchase),
    per_day_selling: round2(selling),
    per_day_margin: round2(margin),
    total_purchase: round2(purchase * days),
    total_selling: round2(selling * days),
  };
};

// =====================================================
// Tage zwischen pickup_date und (actual_return_date | return_date)
// =====================================================
export const contractDays = (args: {
  pickup_date: string;
  return_date: string;
  actual_return_date: string | null;
}): number => {
  const end = new Date(args.actual_return_date ?? args.return_date);
  const start = new Date(args.pickup_date);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(ms / 86_400_000));
};
