import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isDecommissioned } from "@/lib/vehicle";
import { normalizePlate } from "@/lib/plate";

/**
 * Fahrzeugsuche für die Vertragsanlage.
 * GET /api/vehicles/availability?q=<Suchtext>&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Liefert aktive (nicht ausgeflottete) Fahrzeuge, optional gefiltert nach
 * Kennzeichen/Hersteller/Modell, jeweils mit Verfügbarkeit im Zeitraum:
 * Konflikte = Verträge (nicht storniert), deren Belegungsfenster
 * pickup_date .. COALESCE(actual_return_date, return_date) sich überschneidet.
 */
export const GET = async (req: Request) => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const admin = createAdminClient();
  let query = admin
    .from("vehicles")
    .select(
      "id, plate, manufacturer, model, vehicle_type, color, first_registration, fuel_type, fin_number, category, status, decommission_date, daily_rate, weekly_rate, monthly_rate, deposit, pickup_location, power_ps, extra_km_price"
    )
    .eq("org_id", profile.org_id)
    .order("plate", { ascending: true })
    .limit(200);

  if (q) {
    const like = `%${q}%`;
    const parts = [
      `plate.ilike.${like}`,
      `manufacturer.ilike.${like}`,
      `model.ilike.${like}`,
      `vehicle_type.ilike.${like}`,
    ];
    // Kennzeichen werden kanonisch OHNE Leerzeichen gespeichert ("M-S 8271" ->
    // "M-S8271"). Damit eine Eingabe MIT Leerzeichen das gespeicherte Plate
    // findet, zusätzlich nach dem normalisierten Kennzeichen suchen.
    const np = normalizePlate(q);
    if (np && np.toLowerCase() !== q.toLowerCase()) parts.push(`plate.ilike.%${np}%`);
    query = query.or(parts.join(","));
  }

  const { data: vehicles, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Ausgeflottete raus (Status ODER erreichtes Ausflottungsdatum).
  const active = (vehicles ?? []).filter((v) => !isDecommissioned(v));

  // Belegungen im Fenster laden (nur wenn ein Zeitraum angefragt ist).
  type Conflict = {
    contract_nr: string | null;
    renter_name: string | null;
    pickup_date: string;
    return_date: string;
  };
  const conflictsByPlate = new Map<string, Conflict[]>();

  if (from && to && active.length) {
    const plates = active.map((v) => v.plate);
    const { data: contracts } = await admin
      .from("contracts")
      .select("plate, contract_nr, renter_name, pickup_date, return_date, actual_return_date, status")
      .eq("org_id", profile.org_id)
      .in("plate", plates)
      .neq("status", "storniert")
      // Überschneidung: Belegungsende >= from UND Belegungsstart <= to
      .lte("pickup_date", to);

    for (const c of contracts ?? []) {
      const occupiedUntil = c.actual_return_date ?? c.return_date;
      if (!occupiedUntil || occupiedUntil < from) continue;
      const list = conflictsByPlate.get(c.plate) ?? [];
      list.push({
        contract_nr: c.contract_nr,
        renter_name: c.renter_name,
        pickup_date: c.pickup_date,
        return_date: occupiedUntil,
      });
      conflictsByPlate.set(c.plate, list);
    }
  }

  const result = active.map((v) => {
    const conflicts = conflictsByPlate.get(v.plate) ?? [];
    return {
      id: v.id,
      plate: v.plate,
      name: [v.manufacturer, v.model].filter(Boolean).join(" ") || v.vehicle_type || "",
      vehicle_type: v.vehicle_type,
      // Reiche Stammdaten mitgeben, damit die Vertrags-Maske beim Auswählen die
      // echten Fahrzeugdaten übernimmt (statt leerer/irreführender Platzhalter).
      manufacturer: v.manufacturer,
      model: v.model,
      color: v.color,
      first_registration: v.first_registration,
      fuel_type: v.fuel_type,
      fin_number: v.fin_number,
      category: v.category,
      status: v.status,
      daily_rate: v.daily_rate,
      weekly_rate: v.weekly_rate,
      monthly_rate: v.monthly_rate,
      deposit: v.deposit,
      pickup_location: v.pickup_location,
      power_ps: v.power_ps,
      extra_km_price: v.extra_km_price,
      available: conflicts.length === 0,
      conflicts,
    };
  });

  // Freie zuerst, dann belegte.
  result.sort((a, b) => Number(b.available) - Number(a.available) || a.plate.localeCompare(b.plate));

  return NextResponse.json({ vehicles: result, period: from && to ? { from, to } : null });
};
