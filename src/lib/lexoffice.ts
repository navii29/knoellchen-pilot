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

import { resolveEffectiveDailyRate } from "./daily-rate";

const BASE_URL = "https://api.lexoffice.io/v1";

export type LxMoney = {
  currency: "EUR";
  netAmount: number;
  taxRatePercentage: number;
};

// Line-Item kann entweder ein Freitext-Posten sein ("custom") oder eine
// Referenz auf einen LexOffice-Artikel ("service"/"product" + id). Bei
// Artikel-Referenz übernimmt LexOffice Titel, Beschreibung und Steuersatz
// aus dem Artikel — wir setzen nur Menge/Einheit/Preis.
export type LxLineItem =
  | {
      type: "custom";
      name: string;
      description?: string;
      quantity: number;
      unitName: string;
      unitPrice: LxMoney;
    }
  | {
      type: "service" | "product";
      id: string;
      name: string; // weiterhin Pflicht laut LexOffice-Validation
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
    shippingDate: string;
    shippingType: "service" | "serviceperiod" | "delivery" | "deliveryperiod";
    shippingEndDate?: string;
  };
  remark?: string;
  introduction?: string;
};

export type LxInvoiceResponse = {
  id: string;
  resourceUri?: string;
  createdDate?: string;
  voucherNumber?: string;
  voucherStatus?: string;
};

export type LxProfile = {
  organizationId: string;
  companyName: string;
  taxNumber?: string;
  vatId?: string;
  email?: string;
  // Steuer-Klassifizierung des LexOffice-Kontos — maßgeblich dafür, welche
  // taxType eine Rechnung tragen DARF (sonst 406). NICHT aus unserem Flag ableiten.
  taxType?: "net" | "gross" | "vatfree";
  smallBusiness?: boolean;
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
  // Harte Zeitgrenze (AbortController): ohne Timeout kann ein langsamer
  // LexOffice-Call die Serverless-Funktion überleben und mitten in der
  // Rechnungserstellung abgebrochen werden — dann bleibt in der Aktivierungs-
  // Route ein "__pending__"-Lock hängen. Mit Timeout schlägt der Call sauber
  // fehl (→ catch setzt das Lock zurück).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError")
      throw new LexOfficeError(504, "LexOffice antwortet nicht (Zeitüberschreitung).", null);
    throw e;
  } finally {
    clearTimeout(timer);
  }
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

// Rechnung als PDF: erst rendern lassen (liefert documentFileId), dann Datei laden.
export const lxRenderInvoiceDocument = (apiKey: string, id: string) =>
  request<{ documentFileId: string }>(apiKey, `/invoices/${id}/document`, {
    method: "GET",
  });

export const lxDownloadFile = async (
  apiKey: string,
  fileId: string
): Promise<ArrayBuffer> => {
  const res = await fetch(`${BASE_URL}/files/${fileId}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/pdf" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new LexOfficeError(res.status, `LexOffice ${res.status}`, text);
  }
  return res.arrayBuffer();
};

// =========================================================
// Articles (Fahrzeuge als Artikel/Produkt)
// =========================================================
// Docs: https://developers.lexoffice.io/docs/#articles-endpoint
export type LxArticleSellingPrice = {
  currency: "EUR";
  netPrice: number;
  taxRate: number;
};

export type LxArticle = {
  title: string;
  description?: string;
  type: "PRODUCT" | "SERVICE";
  unitName: string;
  articleNumber?: string;
  sellingPrices?: LxArticleSellingPrice[];
};

export type LxArticleResponse = {
  id: string;
  resourceUri?: string;
  version?: number;
};

type VehicleForArticle = {
  plate: string;
  manufacturer: string | null;
  model: string | null;
  vehicle_type: string | null;
  fin_number: string | null;
  body_type: string | null;
  fuel_type: string | null;
  power_ps: number | null;
  daily_rate: number | null;
};

export const buildVehicleArticle = (
  v: VehicleForArticle,
  kleinunternehmer = false
): LxArticle => {
  const titleBase = [v.manufacturer, v.model].filter(Boolean).join(" ").trim();
  const title = (titleBase || v.vehicle_type || "Fahrzeug") + ` (${v.plate})`;
  const description =
    [
      v.fin_number ? `FIN: ${v.fin_number}` : null,
      v.body_type,
      v.fuel_type,
      v.power_ps ? `${v.power_ps} PS` : null,
    ]
      .filter(Boolean)
      .join(" · ") || undefined;

  const rate = v.daily_rate != null ? Number(v.daily_rate) : null;
  const sellingPrices: LxArticleSellingPrice[] | undefined =
    rate != null && rate > 0
      ? [
          {
            currency: "EUR",
            // Kleinunternehmer (§ 19 UStG): kein USt-Ausweis → daily_rate ist
            // NETTO (netPrice = rate, taxRate 0). Regelbesteuert: daily_rate ist
            // BRUTTO → Nettopreis (÷ 1,19), taxRate 19.
            netPrice: kleinunternehmer ? round2(rate) : round2(rate / 1.19),
            taxRate: kleinunternehmer ? 0 : 19,
          },
        ]
      : undefined;

  return {
    title,
    description,
    type: "SERVICE",
    unitName: "Tag",
    articleNumber: v.plate,
    sellingPrices,
  };
};

export const lxCreateArticle = (apiKey: string, article: LxArticle) =>
  request<LxArticleResponse>(apiKey, "/articles", {
    method: "POST",
    body: JSON.stringify(article),
  });

// LexOffice PUT erfordert die aktuelle `version`. Wir ziehen den Artikel
// vorher per GET, mergen, und schicken die PUT-Payload mit Version zurück.
export const lxUpdateArticle = async (
  apiKey: string,
  id: string,
  article: LxArticle
): Promise<LxArticleResponse> => {
  const current = await request<LxArticleResponse>(apiKey, `/articles/${id}`, {
    method: "GET",
  });
  const payload = { ...article, version: current.version ?? 0 };
  return request<LxArticleResponse>(apiKey, `/articles/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

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
  weekly_rate: number | null;
  monthly_rate: number | null;
  total_amount: number | null;
  deposit: number | null;
  km_excess: number | null;
  extra_km_cost: number | null;
};

type VehicleLike = {
  manufacturer: string | null;
  model: string | null;
  vehicle_type: string | null;
  extra_km_price: number | null;
  daily_rate?: number | null;
  weekly_rate?: number | null;
  monthly_rate?: number | null;
  lexoffice_product_id?: string | null;
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
  vehicle: VehicleLike | null,
  kleinunternehmer = false
): LxInvoice => {
  const endDate = contract.actual_return_date ?? contract.return_date;
  const days = daysBetween(contract.pickup_date, endDate);
  // Fallback-Tagessatz über das Abrechnungsmodell (Monat ÷ 29 > Woche ÷ 7 > Tag),
  // nicht roh daily_rate: Wochen-/Monatsverträge tragen keinen daily_rate mehr —
  // sonst ergäbe die Rechnung 0 €, falls kein total_amount vorliegt.
  const dailyRate =
    resolveEffectiveDailyRate({
      contractRate: contract.daily_rate,
      vehicleRate: vehicle?.daily_rate ?? null,
      contractMonthlyRate: contract.monthly_rate,
      vehicleMonthlyRate: vehicle?.monthly_rate ?? null,
      contractWeeklyRate: contract.weekly_rate,
      vehicleWeeklyRate: vehicle?.weekly_rate ?? null,
    }) ?? 0;

  // total_amount (ausgehandelter Gesamtbetrag, z. B. mit Rabatt) hat Vorrang vor
  // Tage × Tagessatz — spiegelt contract-html.ts. Die Mengen-Position bleibt
  // weiterhin "days" Tage, aber der effektive Brutto-Tagespreis wird so gewählt,
  // dass die Positions-Summe (days × effGrossPerDay) == total_amount ergibt.
  const totalAmount = Number(contract.total_amount ?? 0);
  const effGrossPerDay =
    totalAmount > 0 ? totalAmount / days : dailyRate;

  const vehicleLabel =
    [vehicle?.manufacturer, vehicle?.model].filter(Boolean).join(" ") ||
    contract.vehicle_type ||
    vehicle?.vehicle_type ||
    "Fahrzeug";

  const rentalName = `Fahrzeugmiete ${vehicleLabel} (${contract.plate})`;
  const rentalDescription = `Mietzeitraum ${formatDe(contract.pickup_date)} – ${formatDe(endDate)}`;
  const rentalUnitPrice: LxMoney = {
    currency: "EUR",
    // Kleinunternehmer (§ 19 UStG): kein USt-Ausweis → effGrossPerDay ist NETTO
    // (netAmount = round2(effGrossPerDay), taxRate 0). Regelbesteuert:
    // effGrossPerDay ist BRUTTO → Nettopreis (÷ 1,19), taxRate 19.
    netAmount: kleinunternehmer
      ? round2(effGrossPerDay)
      : round2(effGrossPerDay / 1.19),
    taxRatePercentage: kleinunternehmer ? 0 : 19,
  };

  const lineItems: LxLineItem[] = [
    vehicle?.lexoffice_product_id
      ? {
          type: "service",
          id: vehicle.lexoffice_product_id,
          name: rentalName,
          description: rentalDescription,
          quantity: days,
          unitName: days === 1 ? "Tag" : "Tage",
          unitPrice: rentalUnitPrice,
        }
      : {
          type: "custom",
          name: rentalName,
          description: rentalDescription,
          quantity: days,
          unitName: days === 1 ? "Tag" : "Tage",
          unitPrice: rentalUnitPrice,
        },
  ];

  // Mehrkilometer bleiben additiv zur Miete (so wie im PDF / contract-html.ts) —
  // total_amount deckt nur die Grundmiete ab, nicht spätere Mehr-km.
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
      // Kleinunternehmer: extra_km_price ist NETTO (taxRate 0). Regelbesteuert:
      // extra_km_price ist BRUTTO → Nettopreis (÷ 1,19), taxRate 19.
      unitPrice: {
        currency: "EUR",
        netAmount: kleinunternehmer
          ? round2(extraKmPrice)
          : round2(extraKmPrice / 1.19),
        taxRatePercentage: kleinunternehmer ? 0 : 19,
      },
    });
  }

  // Kaution wird NICHT in die Miet-Rechnung gemischt — sie ist steuerneutral
  // und wird als eigene Rechnung erfasst (buildDepositInvoice).

  return {
    voucherDate: isoWithTimezone(new Date()),
    address: buildAddressFromCustomer(customer, contract.renter_name, contract.renter_address),
    lineItems,
    totalPrice: { currency: "EUR" },
    // Kleinunternehmer (§ 19 UStG): "vatfree" (kein USt-Ausweis). Regelbesteuert: "net".
    taxConditions: { taxType: kleinunternehmer ? "vatfree" : "net" },
    shippingConditions: {
      shippingType: "serviceperiod",
      shippingDate: isoWithTimezone(new Date(contract.pickup_date)),
      shippingEndDate: isoWithTimezone(new Date(endDate)),
    },
    introduction: `Vielen Dank für Ihren Mietvertrag ${contract.contract_nr}.`,
    remark: "Zahlbar innerhalb von 14 Tagen ohne Abzug.",
  };
};

// =========================================================
// Builder: Kautions-Rechnung (steuerneutral, separat)
// =========================================================
// Kaution ist kein Umsatz → 0 % USt / vatfree. Wird IMMER separat von der
// Miet-Rechnung gestellt (§ 3a UStG, durchlaufender Posten).
export const buildDepositInvoice = (
  contract: ContractLike,
  customer: CustomerLike | null,
  kleinunternehmer = false
): LxInvoice => {
  const deposit = round2(Number(contract.deposit ?? 0));
  return {
    voucherDate: isoWithTimezone(new Date()),
    address: buildAddressFromCustomer(customer, contract.renter_name, contract.renter_address),
    lineItems: [
      {
        type: "custom",
        name: "Mietkaution (Sicherheitsleistung)",
        description: `Sicherheitsleistung zum Mietvertrag ${contract.contract_nr}. Steuerneutral – keine Umsatzsteuer.`,
        quantity: 1,
        unitName: "Pauschal",
        unitPrice: { currency: "EUR", netAmount: deposit, taxRatePercentage: 0 },
      },
    ],
    totalPrice: { currency: "EUR" },
    // "vatfree" erlaubt LexOffice NUR bei Kleinunternehmer-/steuerbefreiten Orgs
    // ("406 No vatfree invoices allowed for this organization"). Regelbesteuerte
    // Orgs bekommen die Kaution als "net" mit 0 % USt — steuerneutral, aber von
    // LexOffice akzeptiert.
    taxConditions: { taxType: kleinunternehmer ? "vatfree" : "net" },
    shippingConditions: {
      shippingType: "service",
      shippingDate: isoWithTimezone(new Date(contract.pickup_date)),
    },
    introduction: `Kaution zum Mietvertrag ${contract.contract_nr}.`,
    remark: "Kaution / Sicherheitsleistung – steuerneutral, keine Umsatzsteuer.",
  };
};

// =========================================================
// Builder: Strafzettel-Rechnung
// =========================================================
export const buildTicketInvoice = (
  ticket: TicketLike,
  contract: ContractLike | null,
  customer: CustomerLike | null,
  kleinunternehmer = false
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
      // Kleinunternehmer (§ 19 UStG): kein USt-Ausweis auf die Gebühr → 0 %.
      // Regelbesteuert: 19 %. (Das Bußgeld selbst bleibt immer 0 % / durchlaufend.)
      unitPrice: {
        currency: "EUR",
        netAmount: round2(feeNet),
        taxRatePercentage: kleinunternehmer ? 0 : 19,
      },
    });
  }

  return {
    voucherDate: isoWithTimezone(new Date()),
    address: buildAddressFromCustomer(customer, renterName, contract?.renter_address ?? null),
    lineItems,
    totalPrice: { currency: "EUR" },
    // Kleinunternehmer (§ 19 UStG): "vatfree". Regelbesteuert: "net".
    taxConditions: { taxType: kleinunternehmer ? "vatfree" : "net" },
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
