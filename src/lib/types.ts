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
  slug: string | null;
  inbound_email: string | null;
  sender_email: string | null;
  sender_name: string | null;
  email_automation_enabled: boolean;
  created_at: string;
}

export interface AppUser {
  id: string;
  org_id: string;
  full_name: string | null;
  role: "owner" | "member";
  created_at: string;
}

export interface Vehicle {
  id: string;
  org_id: string;
  plate: string;
  vehicle_type: string | null;
  color: string | null;
  first_registration: string | null;
  decommission_date: string | null;
  decommission_reminded: boolean;
  extra_km_price: number | null;
  created_at: string;
}

export type ContractStatus = "aktiv" | "abgeschlossen" | "storniert";

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
  status: ContractStatus;
  contract_pdf_path: string | null;
  pickup_photos: unknown[];
  return_photos: unknown[];
  notes: string | null;
  created_at: string;
  updated_at: string;
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
