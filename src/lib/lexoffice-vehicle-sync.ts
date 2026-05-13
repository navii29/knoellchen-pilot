// Hilfsmodul für die LexOffice-Article-Synchronisation eines Fahrzeugs.
// Fehler werden geloggt aber nie propagiert — der Vehicle-Save selbst darf
// nie an einem Buchhaltungsproblem hängen bleiben.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LexOfficeError,
  buildVehicleArticle,
  lxCreateArticle,
  lxUpdateArticle,
} from "./lexoffice";
import type { Vehicle } from "./types";

type OrgLex = {
  lexoffice_enabled: boolean;
  lexoffice_api_key: string | null;
};

// Lädt die LexOffice-Konfig einer Org. Service-Role-Client erforderlich,
// damit der lexoffice_api_key gelesen werden kann (für anon nicht freigegeben).
export const loadOrgLex = async (
  admin: SupabaseClient,
  orgId: string
): Promise<OrgLex | null> => {
  const { data } = await admin
    .from("organizations")
    .select("lexoffice_enabled, lexoffice_api_key")
    .eq("id", orgId)
    .maybeSingle();
  return data as OrgLex | null;
};

// Synct ein Fahrzeug zu LexOffice. Liefert die neue/bestehende Article-ID
// oder null wenn deaktiviert / fehlgeschlagen.
export const syncVehicleToLexoffice = async (
  admin: SupabaseClient,
  vehicle: Vehicle,
  orgId: string
): Promise<string | null> => {
  const org = await loadOrgLex(admin, orgId);
  if (!org?.lexoffice_enabled || !org.lexoffice_api_key) return null;

  const article = buildVehicleArticle(vehicle);
  try {
    if (vehicle.lexoffice_product_id) {
      await lxUpdateArticle(org.lexoffice_api_key, vehicle.lexoffice_product_id, article);
      return vehicle.lexoffice_product_id;
    }
    const res = await lxCreateArticle(org.lexoffice_api_key, article);
    if (!res?.id) return null;
    await admin
      .from("vehicles")
      .update({ lexoffice_product_id: res.id })
      .eq("id", vehicle.id)
      .eq("org_id", orgId);
    return res.id;
  } catch (err) {
    const detail =
      err instanceof LexOfficeError
        ? `LexOffice ${err.status}: ${err.message}`
        : err instanceof Error
        ? err.message
        : String(err);
    console.error(
      `[lexoffice-vehicle-sync] Fahrzeug ${vehicle.plate} (${vehicle.id}): ${detail}`
    );
    return null;
  }
};
