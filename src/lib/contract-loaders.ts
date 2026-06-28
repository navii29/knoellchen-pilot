// Shared loaders für die 4 contract-pdf Route-Handler. Vehicle wird via
// contract.vehicle_id geladen — fällt auf plate-Match zurück, damit Verträge
// die per CSV ohne Foreign Key importiert wurden trotzdem ihre Vehicle-Daten
// (Leistung, Treibstoff, FIN) im PDF anzeigen.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Customer, Vehicle } from "./types";
import type { VehicleTire } from "./tires";
import type { SpecialTermsTemplate } from "./types";

// Lädt ein Org-Logo aus dem "brand"-Bucket als Data-URI (für PDF-Header).
// PNG/JPG/SVG. SVG wird als <img src="data:image/svg+xml…"> eingebettet — im
// Render (headless Chrome) inert: keine Scripts/externen Refs. Größen-Absicherung
// für SVG ohne viewBox via SVG-only-CSS in den Templates.
export const loadLogoBase64 = async (
  admin: SupabaseClient,
  logoPath: string | null | undefined
): Promise<string | null> => {
  if (!logoPath) return null;
  const { data, error } = await admin.storage.from("brand").download(logoPath);
  if (error || !data) return null;
  const lc = logoPath.toLowerCase();
  const mime = lc.endsWith(".svg")
    ? "image/svg+xml"
    : lc.endsWith(".jpg") || lc.endsWith(".jpeg")
      ? "image/jpeg"
      : "image/png";
  const buf = Buffer.from(await data.arrayBuffer());
  return `data:${mime};base64,${buf.toString("base64")}`;
};

export const loadVehicleForContract = async (
  admin: SupabaseClient,
  orgId: string,
  vehicleId: string | null,
  plate: string | null
): Promise<Vehicle | null> => {
  if (vehicleId) {
    const { data } = await admin
      .from("vehicles")
      .select("*")
      .eq("id", vehicleId)
      .eq("org_id", orgId)
      .maybeSingle();
    if (data) return data as Vehicle;
  }
  if (plate) {
    const { data } = await admin
      .from("vehicles")
      .select("*")
      .eq("plate", plate)
      .eq("org_id", orgId)
      .maybeSingle();
    if (data) return data as Vehicle;
  }
  return null;
};

export const loadCustomerForContract = async (
  admin: SupabaseClient,
  orgId: string,
  customerId: string | null
): Promise<Customer | null> => {
  if (!customerId) return null;
  const { data } = await admin
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .eq("org_id", orgId)
    .maybeSingle();
  return (data as Customer | null) ?? null;
};

export const loadCurrentTireForVehicle = async (
  admin: SupabaseClient,
  vehicleId: string | null
): Promise<VehicleTire | null> => {
  if (!vehicleId) return null;
  const { data } = await admin
    .from("vehicle_tires")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .eq("is_current", true)
    .maybeSingle();
  return (data as VehicleTire | null) ?? null;
};

export const loadSpecialTermsForContract = async (
  admin: SupabaseClient,
  orgId: string,
  selectedIds: string[] | null | undefined
): Promise<SpecialTermsTemplate[]> => {
  if (!selectedIds || selectedIds.length === 0) return [];
  const { data } = await admin
    .from("special_terms_templates")
    .select("*")
    .eq("org_id", orgId)
    .in("id", selectedIds)
    .order("sort_order", { ascending: true });
  return (data ?? []) as SpecialTermsTemplate[];
};
