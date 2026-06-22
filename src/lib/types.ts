export type TicketStatus = "neu" | "zugeordnet" | "weiterbelastet" | "bezahlt";

export interface Organization {
  id: string;
  name: string;
  street: string | null;
  zip: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  tax_number: string | null;
  processing_fee: number;
  // Bankverbindung — Pflicht auf Rechnungen (§14 UStG Zahlungsweg).
  iban: string | null;
  bic: string | null;
  account_holder: string | null;
  // Kleinunternehmer (§19 UStG): keine USt. ausweisen.
  kleinunternehmer: boolean;
  // Fortlaufende Rechnungsnummer (Zähler, atomar via next_invoice_nr()).
  invoice_seq: number;
  slug: string | null;
  inbound_email: string | null;
  sender_email: string | null;
  sender_name: string | null;
  email_automation_enabled: boolean;
  lexoffice_enabled: boolean;
  // lexoffice_api_key absichtlich NICHT im Type — darf nie ans Frontend gelangen.
  echoes_account_id: string | null;
  echoes_enabled: boolean;
  // echoes_api_key absichtlich NICHT im Type — darf nie ans Frontend gelangen.
  rental_terms: string | null;
  logo_path: string | null;
  // Wiederverwendbare Vermieter-Unterschrift (PNG-Data-URL) + Name in
  // Druckschrift. Wird automatisch auf jeden Mietvertrag gesetzt.
  landlord_signature_data: string | null;
  landlord_signature_name: string | null;
  created_at: string;
}

export interface AppUser {
  id: string;
  org_id: string;
  full_name: string | null;
  role: "owner" | "member";
  created_at: string;
}

export type VehicleStatus = "aktiv" | "inaktiv" | "werkstatt" | "ausgesteuert";

export interface Vehicle {
  id: string;
  org_id: string;
  plate: string;
  vehicle_type: string | null;
  color: string | null;
  first_registration: string | null;
  decommission_date: string | null;
  decommission_reminded: boolean;
  disable_auto_decommission: boolean; // Migration 045 — keine Auto-Aussteuerung (+180)
  extra_km_price: number | null;

  manufacturer: string | null;
  model: string | null;
  power_ps: number | null;
  fuel_type: string | null;
  transmission: string | null;
  doors: string | null;
  seats: number | null;
  luggage: number | null;
  body_type: string | null;
  fin_number: string | null;
  category: string | null;

  // Fahrzeugschein / Zulassungsbescheinigung Teil I (Migration 043)
  hsn: string | null; // 2.1 — Herstellerschlüsselnummer
  tsn: string | null; // 2.2 — Typschlüsselnummer
  displacement_ccm: number | null; // P.1 — Hubraum cm³
  co2_combined: number | null; // V.7 — CO₂ g/km
  emission_class: string | null; // 14 — z. B. EURO6
  weight_empty: number | null; // G — Leermasse kg
  weight_max: number | null; // F.1 — zul. Gesamtmasse kg
  zb2_number: string | null; // 16 — Nummer ZB Teil II
  next_hu: string | null; // X — nächste HU/TÜV (YYYY-MM-DD)
  registration_data: Record<string, unknown> | null; // vollständiger KI-Auslese-Datensatz

  // Versicherung (Migration 044)
  insurer: string | null; // Versicherer
  policy_number: string | null; // Policennummer
  insurance_valid_until: string | null; // gültig bis (YYYY-MM-DD)
  insurance_policy_path: string | null; // Versicherungspolice (Dokument)
  insurance_card_path: string | null; // Versicherungskarte / eVB (Dokument)

  available_from: string | null;
  km_at_intake: number | null;
  max_km_total: number | null;
  inclusive_km_month: number | null;

  daily_rate: number | null;
  base_daily_rate: number | null;
  weekly_rate: number | null;
  monthly_rate: number | null;
  deposit: number | null;
  cost_daily: number | null;
  cost_monthly: number | null;
  target_daily_rate: number | null;
  // Einmalkosten (EK) — werden über die Haltedauer in die Marge umgelegt (Migration 049)
  onetime_cost_supplier: number | null; // Einmalkosten Lieferant
  onetime_cost_pickup: number | null; // Kosten Abholung
  onetime_cost_return: number | null; // Kosten Rückverbringung
  leasing_doc_path: string | null; // eigener Leasingvertrag (Dokument)

  accessories: string | null;
  status: VehicleStatus;
  incomplete: boolean; // automatisch gespeicherter Schein-Entwurf (Migration 050)
  // Folgefahrzeug / Nachfolge (Migration 051)
  successor_status: string | null; // null/offen | zugeteilt | ersatzlos
  successor_vehicle_id: string | null; // zugeteiltes Nachfolge-Fahrzeug
  successor_contract_id: string | null; // automatisch angelegter Anschluss-Vertrag

  // Logistik & Dokumente (Migration 026)
  registration_doc_path: string | null; // Fahrzeugschein (ZB Teil I)
  pickup_location: string | null; // Abhollager
  return_location: string | null; // Rückgabeort
  internal_return_at: string | null; // "Rückgabe erfolgt am/um" — rein intern
  internal_return_note: string | null;

  echoes_device_id: string | null;
  last_gps_lat: number | null;
  last_gps_lng: number | null;
  last_gps_update: string | null;

  lexoffice_product_id: string | null;
  shopify_product_id: string | null;

  created_at: string;
  updated_at: string;
}

export interface VehiclePhoto {
  id: string;
  vehicle_id: string;
  org_id: string;
  photo_path: string;
  created_at: string;
}

export type PricingRuleType = "season" | "weekday" | "demand" | "custom";

export interface PricingRule {
  id: string;
  org_id: string;
  name: string;
  type: PricingRuleType;
  adjustment_percent: number;
  start_date: string | null;
  end_date: string | null;
  weekdays: number[] | null;
  min_fleet_available: number | null;
  active: boolean;
  created_at: string;
}

export type ContractStatus = "aktiv" | "abgeschlossen" | "storniert";
export type ContractPaymentMethod =
  | "bank_transfer"
  | "cash"
  | "credit_card"
  | "paypal"
  | "invoice";
export type ContractInsuranceType = "full" | "basic" | "none";

export const PAYMENT_METHOD_LABEL: Record<ContractPaymentMethod, string> = {
  bank_transfer: "Vorabüberweisung",
  cash: "Bar",
  credit_card: "Kreditkarte",
  paypal: "PayPal",
  invoice: "Rechnung",
};

export const INSURANCE_TYPE_LABEL: Record<ContractInsuranceType, string> = {
  full: "Haftpflicht, TK + VK",
  basic: "Haftpflicht",
  none: "Keine",
};

export interface Contract {
  id: string;
  org_id: string;
  contract_nr: string;
  vehicle_id: string | null;
  customer_id: string | null;
  plate: string;
  vehicle_type: string | null;
  renter_name: string;
  renter_email: string | null;
  renter_phone: string | null;
  renter_address: string | null;
  renter_birthday: string | null;
  renter_license_nr: string | null;
  renter_license_class: string | null;
  renter_license_expiry: string | null;
  pickup_date: string;
  pickup_time: string | null;
  return_date: string;
  return_time: string | null;
  actual_return_date: string | null;
  daily_rate: number | null;
  total_amount: number | null;
  deposit: number | null;
  km_pickup: number | null;
  km_return: number | null;
  km_limit: number | null;
  extra_km_cost: number | null;
  actual_days: number | null;
  actual_km_allowed: number | null;
  km_driven: number | null;
  km_excess: number | null;
  status: ContractStatus;
  lexoffice_invoice_id: string | null;
  // Aktivierung & Zahlung (Migration 046 / 039)
  is_activated: boolean;
  activated_at: string | null;
  deposit_invoice_id: string | null; // separate, steuerneutrale Kautions-Rechnung
  payment_status: "offen" | "bezahlt" | null;
  paid_at: string | null;
  partner_id: string | null;
  partner_purchase_price: number | null;
  partner_selling_price: number | null;
  partner_commission: number | null;
  signed_contract_path: string | null;
  signature_data: string | null;
  signed_at: string | null;
  signed_ip: string | null;
  checkin_step: number;
  checkout_step: number;
  fuel_level_pickup: string | null;
  fuel_level_return: string | null;
  contract_pdf_path: string | null;
  pickup_photos: unknown[];
  return_photos: unknown[];
  notes: string | null;

  // Erweiterte Vertragsfelder (Migration 023)
  payment_method: ContractPaymentMethod | null;
  insurance_type: ContractInsuranceType | null;
  insurance_deductible: number | null;
  special_terms: string | null;
  delivery_cost: number | null;
  pickup_cost: number | null;
  driver2_name: string | null;
  driver2_license: string | null;
  damages_at_handover: string | null;
  keys_count: number | null;
  selected_special_terms: string[];
  custom_special_terms: string | null;

  created_at: string;
  updated_at: string;
}

export type SpecialTermsCategory =
  | "general"
  | "sportscars"
  | "longterm"
  | "international"
  | "damage";

export const SPECIAL_TERMS_CATEGORY_LABEL: Record<SpecialTermsCategory, string> = {
  general: "Allgemein",
  sportscars: "Sportwagen",
  longterm: "Langzeitmiete",
  international: "International",
  damage: "Schäden",
};

export interface SpecialTermsTemplate {
  id: string;
  org_id: string;
  title: string;
  text: string;
  category: SpecialTermsCategory;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface ParsedContractData {
  contract_nr?: string | null;
  plate?: string | null;
  vehicle_type?: string | null;
  renter_name?: string | null;
  renter_email?: string | null;
  renter_phone?: string | null;
  renter_address?: string | null;
  renter_birthday?: string | null;
  renter_license_nr?: string | null;
  pickup_date?: string | null;
  pickup_time?: string | null;
  return_date?: string | null;
  return_time?: string | null;
  daily_rate?: number | null;
  total_amount?: number | null;
  deposit?: number | null;
  confidence?: number;
}

export interface Customer {
  id: string;
  org_id: string;
  // Firmenkunden (Migration 052): 'privat' | 'firma'. Bei Firmen hält last_name
  // gespiegelt "Firmenname Rechtsform" (Abwärtskompatibilität für Verträge/PDFs).
  customer_type: string;
  company_name: string | null;
  legal_form: string | null;
  salutation: string | null;
  title: string | null;
  first_name: string | null;
  last_name: string;
  birthday: string | null;
  street: string | null;
  house_nr: string | null;
  zip: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  license_nr: string | null;
  license_class: string | null;
  license_expiry: string | null;
  id_card_nr: string | null;
  license_photo_path: string | null;
  id_card_photo_path: string | null;
  marketing_opt_in: boolean | null;
  consent_at: string | null;
  consent_source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type CustomerDocumentType = "license" | "id_card";

export interface ParsedCustomerData {
  salutation?: string | null;
  title?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  birthday?: string | null;
  street?: string | null;
  house_nr?: string | null;
  zip?: string | null;
  city?: string | null;
  license_nr?: string | null;
  license_class?: string | null;
  license_expiry?: string | null;
  id_card_nr?: string | null;
  document_type?: CustomerDocumentType | null;
  confidence?: number;
}

/** KI-Auslese eines Fahrzeugscheins (Zulassungsbescheinigung Teil I). */
export interface ParsedVehicleRegistration {
  plate?: string | null; // A — amtliches Kennzeichen
  first_registration?: string | null; // B — Erstzulassung YYYY-MM-DD
  manufacturer?: string | null; // D.1 — Marke
  model?: string | null; // D.3 — Handelsbezeichnung
  vin?: string | null; // E — Fahrzeug-Identifizierungsnummer (FIN)
  color?: string | null; // R — Farbe
  fuel_type?: string | null; // P.3 — Kraftstoff
  power_kw?: number | null; // P.2 — Nennleistung kW
  displacement_ccm?: number | null; // P.1 — Hubraum cm³
  seats?: number | null; // S.1 — Sitzplätze inkl. Fahrer
  body_type?: string | null; // gemappt auf BODY_TYPES
  body_type_raw?: string | null; // Feld 5 — Original-Aufbau
  hsn?: string | null; // 2.1
  tsn?: string | null; // 2.2
  emission_class?: string | null; // 14
  co2_combined?: number | null; // V.7 g/km
  weight_empty?: number | null; // G kg
  weight_max?: number | null; // F.1 kg
  zb2_number?: string | null; // 16
  next_hu?: string | null; // X — YYYY-MM-DD
  num_axles?: number | null; // L
  max_speed?: number | null; // T km/h
  owner_name?: string | null; // C.1.1 (nur Info)
  confidence?: number;
}

/** KI-Auslese eines Leasing-/Finanzierungsvertrags (EK-Konditionen). */
export interface ParsedLeasingContract {
  monthly_rate?: number | null; // monatliche Leasing-/Finanzierungsrate (brutto)
  onetime_supplier?: number | null; // einmalige Kosten (Sonderzahlung/Bereitstellung/Überführung), summiert
  term_months?: number | null; // Laufzeit in Monaten
  lessor?: string | null; // Leasinggeber / Anbieter
  confidence?: number;
}

export type DamageReportStatus = "offen" | "gemeldet" | "reguliert";

export interface DamageReport {
  id: string;
  org_id: string;
  contract_id: string | null;
  vehicle_id: string | null;
  date: string;
  time: string | null;
  location: string | null;
  description: string | null;
  police_reference_nr: string | null;
  insurance_claim_nr: string | null;
  other_party_name: string | null;
  other_party_plate: string | null;
  other_party_insurance: string | null;
  photos: string[];
  status: DamageReportStatus;
  created_at: string;
  updated_at: string;
}

export type HandoverPhotoType = "pickup" | "return";

export type HandoverPosition =
  | "front"
  | "rear"
  | "left"
  | "right"
  | "front_left"
  | "front_right"
  | "rear_left"
  | "rear_right"
  | "interior"
  | "dashboard";

export interface HandoverPhoto {
  id: string;
  contract_id: string;
  org_id: string;
  type: HandoverPhotoType;
  position: HandoverPosition;
  photo_path: string;
  created_at: string;
}

export type DamageSeverity = "none" | "minor" | "major";

export interface DamageComparisonResult {
  has_damage: boolean;
  description: string;
  severity: DamageSeverity;
}

export interface Booking {
  id: string;
  org_id: string;
  vehicle_id: string | null;
  plate: string;
  renter_name: string;
  renter_email: string | null;
  renter_address: string | null;
  renter_birthday: string | null;
  renter_phone: string | null;
  renter_license: string | null;
  pickup_date: string;
  return_date: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  org_id: string;
  ticket_nr: string;
  // Fortlaufende, eindeutige Rechnungsnummer (§14 UStG) — bei PDF-Erstellung
  // via next_invoice_nr() vergeben. null bis Rechnung erzeugt wurde.
  invoice_nr: string | null;
  status: TicketStatus;
  plate: string | null;
  vehicle_type: string | null;
  offense: string | null;
  offense_details: string | null;
  location: string | null;
  offense_date: string | null;
  offense_time: string | null;
  authority: string | null;
  reference_nr: string | null;
  fine_amount: number | null;
  points: number;
  deadline: string | null;
  ai_confidence: number | null;
  ai_raw_response: Record<string, unknown> | null;
  booking_id: string | null;
  contract_id: string | null;
  renter_name: string | null;
  renter_email: string | null;
  processing_fee: number;
  charge_fine: boolean;
  charge_fee: boolean;
  fee_net: number | null;
  fee_vat: number | null;
  fee_gross: number | null;
  total_charge: number | null;
  lexoffice_invoice_id: string | null;
  paid: boolean;
  reminder_level: number;
  upload_path: string | null;
  letter_path: string | null;
  invoice_path: string | null;
  questionnaire_path: string | null;
  letter_sent: boolean;
  authority_sent: boolean;
  inbound_email_id: string | null;
  letter_sent_at: string | null;
  letter_sent_to: string | null;
  authority_sent_at: string | null;
  authority_sent_to: string | null;
  authority_email: string | null;
  source: "upload" | "email";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketLog {
  id: string;
  ticket_id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface ParsedTicketData {
  reference_nr?: string | null;
  authority?: string | null;
  plate?: string | null;
  offense_date?: string | null;
  offense_time?: string | null;
  location?: string | null;
  offense?: string | null;
  offense_details?: string | null;
  fine_amount?: number | null;
  points?: number | null;
  deadline?: string | null;
  vehicle_type?: string | null;
  confidence?: number;
}
