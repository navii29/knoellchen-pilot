// Shared loaders für die 4 contract-pdf Route-Handler. Vehicle wird via
// contract.vehicle_id geladen — fällt auf plate-Match zurück, damit Verträge
// die per CSV ohne Foreign Key importiert wurden trotzdem ihre Vehicle-Daten
// (Leistung, Treibstoff, FIN) im PDF anzeigen.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Customer, Vehicle } from "./types";
import type { VehicleTire } from "./tires";
import type { SpecialTermsTemplate } from "./types";

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

// Titelbild des Fahrzeugs (ältestes Foto) als Data-URI fürs Vertrags-PDF.
// org-scoped; null, wenn kein Foto vorhanden oder Download scheitert.
export const loadVehiclePhotoDataUri = async (
  admin: SupabaseClient,
  orgId: string,
  vehicleId: string | null
): Promise<string | null> => {
  if (!vehicleId) return null;
  const { data: rows } = await admin
    .from("vehicle_photos")
    .select("photo_path")
    .eq("vehicle_id", vehicleId)
    .eq("org_id", orgId)
    .order("created_at", { ascending: true })
    .limit(1);
  const path = rows?.[0]?.photo_path as string | undefined;
  if (!path) return null;
  const { data, error } = await admin.storage.from("vehicle-photos").download(path);
  if (error || !data) return null;
  const lower = path.toLowerCase();
  const mime =
    lower.endsWith(".png")
      ? "image/png"
      : lower.endsWith(".webp")
      ? "image/webp"
      : "image/jpeg";
  const buf = Buffer.from(await data.arrayBuffer());
  return `data:${mime};base64,${buf.toString("base64")}`;
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
