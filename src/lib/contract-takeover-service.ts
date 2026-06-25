// DB-Service für die Datenübernahme aus Verträgen. Nutzt die reine Logik aus
// contract-takeover.ts und buildVehicleBackfillFromContracts. Wird von ALLEN
// Vertrags-Insert-Pfaden + der Bestands-Backfill-Route aufgerufen.
//
// Ablauf (org-scoped):
//   1. Verträge (per id) laden, neueste zuerst.
//   2. Bestehende Kunden der Org EINMAL laden (Match-Keys + fill-Zielfelder).
//   3. Pro Vertrag: Kunde matchen (FS → Name+Geb) oder anlegen; leere Kunden-
//      felder aus dem Vertrag ergänzen; contract.customer_id verknüpfen.
//      Innerhalb des Batches werden gleiche Kunden zu EINEM zusammengeführt.
//   4. Pro betroffenem Fahrzeug: leere Stammdaten aus den Verträgen ergänzen.
import type { createAdminClient } from "@/lib/supabase/server";
import { buildVehicleBackfillFromContracts } from "./vehicle";
import {
  buildCustomerFromContract,
  matchCustomerId,
  fillEmpty,
} from "./contract-takeover";

type Admin = ReturnType<typeof createAdminClient>;
type PoolCustomer = { id: string } & Record<string, unknown>;

// Felder, die wir aus dem Vertrag in den Kunden spiegeln (für SELECT + fillEmpty).
const CUSTOMER_FIELDS =
  "id, customer_type, company_name, first_name, last_name, email, phone, " +
  "street, house_nr, zip, city, birthday, birth_place, license_nr, " +
  "license_class, license_expiry, license_issued, id_card_nr, " +
  "id_card_authority, iban, bank_holder";

const CONTRACT_FIELDS =
  "id, customer_id, plate, pickup_date, renter_name, renter_email, " +
  "renter_phone, renter_address, renter_birthday, renter_birthplace, " +
  "renter_license_nr, renter_license_class, renter_license_expiry, " +
  "renter_license_issued, renter_id_card_nr, renter_id_card_authority, " +
  "renter_iban, renter_bank_holder";

export async function applyTakeover(
  admin: Admin,
  orgId: string,
  contractIds: string[]
): Promise<void> {
  const ids = [...new Set(contractIds.filter(Boolean))];
  if (ids.length === 0) return;

  // 1. Verträge laden (neueste zuerst → "jüngster gewinnt" beim fill-if-empty).
  const { data: contractsData } = await admin
    .from("contracts")
    .select(CONTRACT_FIELDS)
    .eq("org_id", orgId)
    .in("id", ids)
    .order("pickup_date", { ascending: false });
  const contracts = (contractsData ?? []) as unknown as Record<string, unknown>[];
  if (contracts.length === 0) return;

  // 2. Bestehende Kunden der Org einmal laden.
  const { data: existingData } = await admin
    .from("customers")
    .select(CUSTOMER_FIELDS)
    .eq("org_id", orgId);
  const pool = ((existingData ?? []) as unknown as PoolCustomer[]).slice();

  // 3. Kunden matchen/anlegen/verknüpfen.
  for (const c of contracts) {
    const cand = buildCustomerFromContract(c);
    let customerId = (c.customer_id as string | null) ?? null;

    if (!customerId) {
      customerId = matchCustomerId(
        {
          license_nr: (c.renter_license_nr as string) ?? null,
          name: (c.renter_name as string) ?? null,
          birthday: (c.renter_birthday as string) ?? null,
        },
        pool as { id: string; license_nr: string | null; first_name: string | null; last_name: string | null; birthday: string | null; company_name: string | null }[]
      );
    }

    if (customerId) {
      // Bestehenden (oder eben verknüpften) Kunden: leere Felder ergänzen.
      const target = pool.find((p) => p.id === customerId);
      if (target) {
        const patch = fillEmpty(target, cand as Record<string, unknown>);
        if (Object.keys(patch).length > 0) {
          await admin
            .from("customers")
            .update(patch)
            .eq("id", customerId)
            .eq("org_id", orgId);
          Object.assign(target, patch); // Pool aktuell halten
        }
      }
    } else {
      // Neuen Kunden anlegen (last_name ist Pflicht → Fallback "Mieter").
      const insertRow = {
        org_id: orgId,
        ...cand,
        last_name: cand.last_name || "Mieter",
      };
      const { data: ins, error: insErr } = await admin
        .from("customers")
        .insert(insertRow)
        .select("id")
        .single();
      if (insErr) {
        // Insert-Fehler nicht verschlucken: loggen und diesen Vertrag
        // überspringen (customer_id bleibt null) — kippt nicht den Batch.
        console.error("applyTakeover: customers.insert fehlgeschlagen:", insErr.message);
      } else if (ins) {
        customerId = (ins as { id: string }).id;
        // In den Pool aufnehmen → Within-Batch-Dedup für Folge-Verträge.
        pool.push({ ...(cand as Record<string, unknown>), id: customerId });
      }
    }

    // Verknüpfung setzen, falls noch nicht/anders gesetzt.
    if (customerId && customerId !== (c.customer_id as string | null)) {
      await admin
        .from("contracts")
        .update({ customer_id: customerId })
        .eq("id", c.id as string)
        .eq("org_id", orgId);
    }
  }

  // 4. Fahrzeuge der betroffenen Kennzeichen backfillen (leere Felder ergänzen).
  const plates = [...new Set(contracts.map((c) => c.plate as string).filter(Boolean))];
  for (const plate of plates) {
    const { data: vehicle } = await admin
      .from("vehicles")
      .select(
        "id, vehicle_type, manufacturer, model, daily_rate, deposit, km_at_intake, color, fin_number, weekly_rate, monthly_rate"
      )
      .eq("org_id", orgId)
      .eq("plate", plate)
      .maybeSingle();
    if (!vehicle) continue;

    const { data: vContracts } = await admin
      .from("contracts")
      .select(
        "vehicle_type, daily_rate, deposit, pickup_date, km_pickup, km_return, vehicle_color, vehicle_fin, weekly_rate, monthly_rate"
      )
      .eq("org_id", orgId)
      .eq("plate", plate)
      .order("pickup_date", { ascending: false });

    const patch = buildVehicleBackfillFromContracts(
      vehicle as Parameters<typeof buildVehicleBackfillFromContracts>[0],
      (vContracts ?? []) as Parameters<typeof buildVehicleBackfillFromContracts>[1]
    );
    if (Object.keys(patch).length > 0) {
      const vid = (vehicle as { id: string }).id;
      await admin
        .from("vehicles")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", vid)
        .eq("org_id", orgId);

      // Der DB-Trigger sync_vehicle_type baut vehicle_type aus manufacturer||model
      // NEU, sobald eine dieser Spalten im UPDATE steht. Hatte das Fahrzeug schon
      // einen vehicle_type (z. B. "VW Golf VIII") und wir ergänzen nur die
      // abgeleiteten manufacturer/model, würde der Trigger den bestehenden Wert
      // still alias-normalisieren ("Volkswagen Golf VIII"). Wenn wir vehicle_type
      // selbst NICHT ändern wollten, den Originalwert wiederherstellen — ein
      // vehicle_type-only-UPDATE feuert den Trigger nicht (Review #5).
      const p = patch as Record<string, unknown>;
      const originalType = (vehicle as { vehicle_type: string | null }).vehicle_type;
      if (
        originalType &&
        p.vehicle_type === undefined &&
        (p.manufacturer !== undefined || p.model !== undefined)
      ) {
        await admin
          .from("vehicles")
          .update({ vehicle_type: originalType })
          .eq("id", vid)
          .eq("org_id", orgId);
      }
    }
  }
}
