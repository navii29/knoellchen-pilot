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
  const { data: contractsData, error: cErr } = await admin
    .from("contracts")
    .select(CONTRACT_FIELDS)
    .eq("org_id", orgId)
    .in("id", ids)
    .order("pickup_date", { ascending: false });
  // NUR code+message loggen — niemals details/hint, da diese Zeilen-/Feldwerte
  // (Kunden-PII: Name, IBAN, FS-Nr) in die Logs spiegeln können (DSGVO).
  if (cErr) console.error("[takeover] contracts.select fehlgeschlagen:", cErr.code ?? "", cErr.message);
  const contracts = (contractsData ?? []) as unknown as Record<string, unknown>[];
  if (contracts.length === 0) {
    console.warn(`[takeover] keine Verträge geladen (ids=${ids.length}, org=${orgId})`);
    return;
  }

  // 2. Bestehende Kunden der Org einmal laden.
  const { data: existingData, error: exErr } = await admin
    .from("customers")
    .select(CUSTOMER_FIELDS)
    .eq("org_id", orgId);
  if (exErr)
    console.error("[takeover] customers.select fehlgeschlagen:", exErr.code ?? "", exErr.message);
  const pool = ((existingData ?? []) as unknown as PoolCustomer[]).slice();
  let createdCount = 0;

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
          const { error: updErr } = await admin
            .from("customers")
            .update(patch)
            .eq("id", customerId)
            .eq("org_id", orgId);
          if (updErr)
            console.error(
              "[takeover] customers.update fehlgeschlagen (customer_id=" + customerId + "):",
              updErr.code ?? "",
              updErr.message
            );
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
        // Insert-Fehler nicht verschlucken: VOLL loggen (Code/Details/Hint) und
        // diesen Vertrag überspringen (customer_id bleibt null) — kippt nicht
        // den Batch.
        // Nur code+message (z. B. PGRST204 + Spaltenname) — keine details/hint,
        // die Zeilenwerte (PII) enthalten könnten (DSGVO).
        console.error(
          "[takeover] customers.insert fehlgeschlagen:",
          insErr.code ?? "",
          insErr.message
        );
      } else if (ins) {
        customerId = (ins as { id: string }).id;
        createdCount++;
        // In den Pool aufnehmen → Within-Batch-Dedup für Folge-Verträge.
        pool.push({ ...(cand as Record<string, unknown>), id: customerId });
      }
    }

    // Verknüpfung setzen, falls noch nicht/anders gesetzt.
    if (customerId && customerId !== (c.customer_id as string | null)) {
      const { error: linkErr } = await admin
        .from("contracts")
        .update({ customer_id: customerId })
        .eq("id", c.id as string)
        .eq("org_id", orgId);
      if (linkErr)
        console.error(
          "[takeover] contracts.update(customer_id) fehlgeschlagen (contract_id=" + (c.id as string) + "):",
          linkErr.code ?? "",
          linkErr.message
        );
    }
  }

  console.info(
    `[takeover] org=${orgId}: ${contracts.length} Verträge verarbeitet, ${createdCount} Kunden neu angelegt, Pool=${pool.length}`
  );

  // 4. Fahrzeuge der betroffenen Kennzeichen backfillen (leere Felder ergänzen).
  const plates = [...new Set(contracts.map((c) => c.plate as string).filter(Boolean))];
  for (const plate of plates) {
    const { data: vehicle, error: vSelErr } = await admin
      .from("vehicles")
      .select(
        "id, vehicle_type, manufacturer, model, daily_rate, deposit, km_at_intake, color, fin_number, weekly_rate, monthly_rate"
      )
      .eq("org_id", orgId)
      .eq("plate", plate)
      .maybeSingle();
    if (vSelErr)
      console.error(
        "[takeover] vehicles.select (backfill) fehlgeschlagen (plate=" + plate + "):",
        vSelErr.code ?? "",
        vSelErr.message
      );
    if (!vehicle) continue;

    const { data: vContracts, error: vcSelErr } = await admin
      .from("contracts")
      .select(
        "vehicle_type, daily_rate, deposit, pickup_date, km_pickup, km_return, vehicle_color, vehicle_fin, weekly_rate, monthly_rate"
      )
      .eq("org_id", orgId)
      .eq("plate", plate)
      .order("pickup_date", { ascending: false });
    if (vcSelErr)
      console.error(
        "[takeover] contracts.select (backfill) fehlgeschlagen (plate=" + plate + "):",
        vcSelErr.code ?? "",
        vcSelErr.message
      );

    const patch = buildVehicleBackfillFromContracts(
      vehicle as Parameters<typeof buildVehicleBackfillFromContracts>[0],
      (vContracts ?? []) as Parameters<typeof buildVehicleBackfillFromContracts>[1]
    );
    if (Object.keys(patch).length > 0) {
      const vid = (vehicle as { id: string }).id;
      const { error: vBackfillErr } = await admin
        .from("vehicles")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", vid)
        .eq("org_id", orgId);
      if (vBackfillErr)
        console.error(
          "[takeover] vehicles.update (backfill) fehlgeschlagen (plate=" + plate + "):",
          vBackfillErr.code ?? "",
          vBackfillErr.message
        );

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
        const { error: vTypeErr } = await admin
          .from("vehicles")
          .update({ vehicle_type: originalType })
          .eq("id", vid)
          .eq("org_id", orgId);
        if (vTypeErr)
          console.error(
            "[takeover] vehicles.update(vehicle_type restore) fehlgeschlagen (plate=" + plate + "):",
            vTypeErr.code ?? "",
            vTypeErr.message
          );
      }
    }
  }
}
