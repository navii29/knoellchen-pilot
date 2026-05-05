/**
 * LexOffice REST-Client.
 *
 * API-Doku: https://developers.lexoffice.io/docs/
 *
 * SICHERHEIT: Dieser Client wird NUR serverseitig verwendet. Der API-Key ist
 * pro Organisation in `organizations.lexoffice_api_key` gespeichert und darf
 * niemals an den Browser geliefert werden.
 *
 * Implementierungs-Notizen:
 * - Wir senden Rechnungen als FINALIZED (?finalize=true) — sie sind danach
 *   in LexOffice unveränderlich, können aber storniert werden.
 * - Wir nutzen "embedded address" statt eines separaten Kontakts. LexOffice
 *   bietet beim Finalisieren an, daraus einen Kontakt zu erstellen.
 * - Beträge werden in EUR mit zwei Nachkommastellen erwartet.
 */

const BASE_URL = "https://api.lexoffice.io/v1";

export type LxMoney = {
  currency: "EUR";
  netAmount: number;
  taxRatePercentage: number;
};

export type LxLineItem = {
  type: "custom";
  name: string;
  description?: string;
  quantity: number;
  unitName: string;
  unitPrice: LxMoney;
};

export type LxAddress = {
  name: string;
  supplement?: string;
  street?: string;
  zip?: string;
  city?: string;
  countryCode: string;
};

export type LxInvoice = {
  voucherDate: string; // ISO with timezone
  address: LxAddress;
  lineItems: LxLineItem[];
  totalPrice: { currency: "EUR" };
  taxConditions: { taxType: "net" | "gross" | "vatfree" };
  shippingConditions: {
    shippingDate?: string;
    shippingType: "service" | "serviceperiod";
    shippingDateFrom?: string;
    shippingDateTo?: string;
  };
  remark?: string;
  introduction?: string;
};

export type LxInvoiceResponse = {
  id: string;
  resourceUri?: string;
  createdDate?: string;
  voucherNumber?: string;
};

export type LxProfile = {
  organizationId: string;
  companyName: string;
  taxNumber?: string;
  vatId?: string;
  email?: string;
};

export class LexOfficeError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

const request = async <T>(
  apiKey: string,
  path: string,
  init: RequestInit = {}
): Promise<T> => {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg =
      (body && typeof body === "object" && "message" in body && typeof body.message === "string"
        ? body.message
        : null) ?? `LexOffice ${res.status}`;
    throw new LexOfficeError(res.status, msg, body);
  }
  return body as T;
};

export const lxGetProfile = (apiKey: string) =>
  request<LxProfile>(apiKey, "/profile", { method: "GET" });

export const lxCreateInvoice = (apiKey: string, invoice: LxInvoice) =>
  request<LxInvoiceResponse>(apiKey, "/invoices?finalize=true", {
    method: "POST",
    body: JSON.stringify(invoice),
  });

export const lxGetInvoice = (apiKey: string, id: string) =>
  request<LxInvoiceResponse>(apiKey, `/invoices/${id}`, { method: "GET" });

// =========================================================
// Builder: Address
// =========================================================
type CustomerLike = {
  salutation: string | null;
  first_name: string | null;
  last_name: string;
  street: string | null;
  house_nr: string | null;
  zip: string | null;
  city: string | null;
  country: string | null;
};

type ContractLike = {
  contract_nr: string;
  plate: string;
  vehicle_type: string | null;
  renter_name: string;
  renter_address: string | null;
  pickup_date: string;
  return_date: string;
  actual_return_date: string | null;
  daily_rate: number | null;
  deposit: number | null;
  km_excess: number | null;
  extra_km_cost: number | null;
};

type VehicleLike = {
  manufacturer: string | null;
  model: string | null;
  vehicle_type: string | null;
  extra_km_price: number | null;
};

type TicketLike = {
  ticket_nr: string;
  reference_nr: string | null;
  authority: string | null;
  fine_amount: number | null;
  fee_net: number | null;
  charge_fine: boolean;
  charge_fee: boolean;
  offense: string | null;
  offense_date: string | null;
};

const buildAddressFromCustomer = (customer: CustomerLike | null, fallbackName: string, fallbackAddress?: string | null): LxAddress => {
  if (customer) {
    const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || fallbackName;
    const street = [customer.street, customer.house_nr].filter(Boolean).join(" ") || undefined;
    return {
      name: fullName,
      street,
      zip: customer.zip ?? undefined,
      city: customer.city ?? undefined,
      countryCode: (customer.country === "Deutschland" || !customer.country) ? "DE" : customer.country.slice(0, 2).toUpperCase(),
    };
  }
  // Fallback: aus renter_address (Freitext) so gut wie möglich extrahieren
  return {
    name: fallbackName,
    supplement: fallbackAddress ?? undefined,
    countryCode: "DE",
  };
};

// =========================================================
// Builder: Mietvertrag-Rechnung
// =========================================================
const startOfDay = (s: string) => {
  const d = new Date(s);
  d.setHours(0, 0, 0, 0);
  return d;
};

const daysBetween = (a: string, b: string) => {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.max(1, Math.ceil(ms / 86_400_000));
};

const isoWithTimezone = (date: Date) => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const tzOffsetMin = -date.getTimezoneOffset();
  const sign = tzOffsetMin >= 0 ? "+" : "-";
  const tzh = pad(Math.floor(Math.abs(tzOffsetMin) / 60));
  const tzm = pad(Math.abs(tzOffsetMin) % 60);
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.000` +
    `${sign}${tzh}:${tzm}`
  );
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export const buildContractInvoice = (
  contract: ContractLike,
  customer: CustomerLike | null,
  vehicle: VehicleLike | null
): LxInvoice => {
  const endDate = contract.actual_return_date ?? contract.return_date;
  const days = daysBetween(contract.pickup_date, endDate);
  const dailyRate = Number(contract.daily_rate ?? 0);

  const vehicleLabel =
    [vehicle?.manufacturer, vehicle?.model].filter(Boolean).join(" ") ||
    contract.vehicle_type ||
    vehicle?.vehicle_type ||
    "Fahrzeug";

  const lineItems: LxLineItem[] = [
    {
      type: "custom",
      name: `Fahrzeugmiete ${vehicleLabel} (${contract.plate})`,
      description: `Mietzeitraum ${formatDe(contract.pickup_date)} – ${formatDe(endDate)}`,
      quantity: days,
      unitName: days === 1 ? "Tag" : "Tage",
      unitPrice: { currency: "EUR", netAmount: round2(dailyRate), taxRatePercentage: 19 },
    },
  ];

  const kmExcess = Number(contract.km_excess ?? 0);
  const extraKmPrice = Number(vehicle?.extra_km_price ?? 0);
  if (kmExcess > 0 && extraKmPrice > 0) {
    lineItems.push({
      type: "custom",
      name: "Mehrkilometer",
      description: `${kmExcess.toLocaleString("de-DE")} km × ${extraKmPrice
        .toFixed(2)
        .replace(".", ",")} €/km`,
      quantity: kmExcess,
      unitName: "km",
      unitPrice: { currency: "EUR", netAmount: round2(extraKmPrice), taxRatePercentage: 19 },
    });
  }

  const deposit = Number(contract.deposit ?? 0);
  if (deposit > 0) {
    lineItems.push({
      type: "custom",
      name: "Kaution Rückerstattung",
      description: "Erstattung der bei Vertragsabschluss hinterlegten Kaution.",
      quantity: 1,
      unitName: "Pauschal",
      unitPrice: { currency: "EUR", netAmount: -round2(deposit), taxRatePercentage: 19 },
    });
  }

  return {
    voucherDate: isoWithTimezone(new Date()),
    address: buildAddressFromCustomer(customer, contract.renter_name, contract.renter_address),
    lineItems,
    totalPrice: { currency: "EUR" },
    taxConditions: { taxType: "net" },
    shippingConditions: {
      shippingType: "serviceperiod",
      shippingDateFrom: isoWithTimezone(new Date(contract.pickup_date)),
      shippingDateTo: isoWithTimezone(new Date(endDate)),
    },
    introduction: `Vielen Dank für Ihren Mietvertrag ${contract.contract_nr}.`,
    remark: "Zahlbar innerhalb von 14 Tagen ohne Abzug.",
  };
};

// =========================================================
// Builder: Strafzettel-Rechnung
// =========================================================
export const buildTicketInvoice = (
  ticket: TicketLike,
  contract: ContractLike | null,
  customer: CustomerLike | null
): LxInvoice => {
  const fallbackName = ticket.ticket_nr ? `Strafzettel ${ticket.ticket_nr}` : "Strafzettel-Empfänger";
  const renterName = contract?.renter_name ?? fallbackName;

  const lineItems: LxLineItem[] = [];

  if (ticket.charge_fine) {
    const fineAmount = Number(ticket.fine_amount ?? 0);
    lineItems.push({
      type: "custom",
      name: "Bußgeld lt. Bescheid (durchlaufender Posten)",
      description:
        [
          ticket.reference_nr ? `Aktenzeichen: ${ticket.reference_nr}` : null,
          ticket.authority ? `Behörde: ${ticket.authority}` : null,
          ticket.offense ? `Verstoß: ${ticket.offense}` : null,
          ticket.offense_date ? `Tatdatum: ${formatDe(ticket.offense_date)}` : null,
        ]
          .filter(Boolean)
          .join("\n") || undefined,
      quantity: 1,
      unitName: "Pauschal",
      unitPrice: { currency: "EUR", netAmount: round2(fineAmount), taxRatePercentage: 0 },
    });
  }

  if (ticket.charge_fee) {
    const feeNet = Number(ticket.fee_net ?? 0);
    lineItems.push({
      type: "custom",
      name: "Bearbeitungsgebühr",
      description: "Aufwand für die Bearbeitung und Weiterleitung des Bescheids.",
      quantity: 1,
      unitName: "Pauschal",
      unitPrice: { currency: "EUR", netAmount: round2(feeNet), taxRatePercentage: 19 },
    });
  }

  return {
    voucherDate: isoWithTimezone(new Date()),
    address: buildAddressFromCustomer(customer, renterName, contract?.renter_address ?? null),
    lineItems,
    totalPrice: { currency: "EUR" },
    taxConditions: { taxType: "net" },
    shippingConditions: {
      shippingType: "service",
      shippingDate: isoWithTimezone(new Date()),
    },
    introduction:
      `Weiterbelastung ${ticket.ticket_nr}` +
      (contract?.contract_nr ? ` (Vertrag ${contract.contract_nr})` : ""),
    remark: "Zahlbar innerhalb von 14 Tagen ohne Abzug.",
  };
};

const formatDe = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
};
