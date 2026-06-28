import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { computeReturnSummary } from "@/lib/km";
import { resolveEffectiveDailyRate } from "@/lib/daily-rate";
import { normalizePlate } from "@/lib/plate";
import { myRole } from "@/lib/team";
import { redactContractPartner } from "@/lib/redact";
import type { Contract } from "@/lib/types";

const requireAuth = async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();
  return profile ? { user, org_id: profile.org_id } : null;
};

export const PATCH = async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const allowed = [
    "contract_nr",
    "plate",
    "vehicle_type",
    "renter_name",
    "renter_email",
    "renter_phone",
    "renter_address",
    "renter_birthday",
    "renter_license_nr",
    "renter_license_class",
    "renter_license_expiry",
    "pickup_date",
    "pickup_time",
    "return_date",
    "return_time",
    "actual_return_date",
    "daily_rate",
    "total_amount",
    "deposit",
    "km_pickup",
    "km_return",
    "km_limit",
    "status",
    "notes",
    "contract_pdf_path",
    "payment_method",
    "insurance_type",
    "insurance_deductible",
    "special_terms",
    "delivery_cost",
    "pickup_cost",
    "driver2_name",
    "driver2_license",
    "damages_at_handover",
    "keys_count",
    "selected_special_terms",
    "custom_special_terms",
  ];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) update[k] = body[k];

  // Zahlungsstatus streng validieren; paid_at IMMER server-seitig ableiten
  // (kein Vertrauen auf Client-Zeitstempel in einem Abrechnungs-Datensatz).
  if ("payment_status" in body) {
    const ps = body.payment_status;
    if (ps === "bezahlt") {
      update.payment_status = "bezahlt";
      update.paid_at = new Date().toISOString();
    } else if (ps === "offen" || ps === null) {
      update.payment_status = ps;
      update.paid_at = null;
    } else {
      return NextResponse.json({ error: "Ungültiger Zahlungsstatus" }, { status: 400 });
    }
  }

  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: "Nichts zu aktualisieren" }, { status: 400 });

  if (typeof update.plate === "string") update.plate = normalizePlate(update.plate);
  update.updated_at = new Date().toISOString();

  const admin = createAdminClient();

  // Bei Änderung von km-/Datums-Feldern komplette Rückgabe-Aufstellung neu berechnen
  const recalcTriggers = [
    "km_pickup",
    "km_return",
    "km_limit",
    "plate",
    "pickup_date",
    "return_date",
    "actual_return_date",
  ];
  const kmFieldTouched = recalcTriggers.some((k) => k in body);
  if (kmFieldTouched) {
    const { data: current } = await admin
      .from("contracts")
      .select(
        "km_pickup, km_return, km_limit, plate, org_id, pickup_date, return_date, actual_return_date, original_return_date, daily_rate"
      )
      .eq("id", params.id)
      .eq("org_id", auth.org_id)
      .maybeSingle();

    if (current) {
      const plate = typeof update.plate === "string" ? update.plate : current.plate;
      const kmPickup =
        "km_pickup" in update ? (update.km_pickup as number | null) : (current.km_pickup as number | null);
      const kmReturn =
        "km_return" in update ? (update.km_return as number | null) : (current.km_return as number | null);
      const kmLimit =
        "km_limit" in update ? (update.km_limit as number | null) : (current.km_limit as number | null);
      const pickupDate =
        "pickup_date" in update ? (update.pickup_date as string) : (current.pickup_date as string);
      const plannedReturn =
        "return_date" in update ? (update.return_date as string) : (current.return_date as string);
      const actualReturn =
        "actual_return_date" in update
          ? (update.actual_return_date as string | null)
          : (current.actual_return_date as string | null);

      if (pickupDate && plannedReturn && String(plannedReturn) < String(pickupDate))
        return NextResponse.json(
          { error: "Rückgabedatum darf nicht vor dem Abholdatum liegen." },
          { status: 400 }
        );
      if (actualReturn && pickupDate && String(actualReturn) < String(pickupDate))
        return NextResponse.json(
          { error: "Tatsächliche Rückgabe darf nicht vor der Abholung liegen." },
          { status: 400 }
        );

      let price: number | null = null;
      let inclusiveKmMonth: number | null = null;
      let vehicleRate: number | null = null;
      if (plate) {
        const { data: v } = await admin
          .from("vehicles")
          .select("extra_km_price, inclusive_km_month, daily_rate")
          .eq("org_id", auth.org_id)
          .eq("plate", plate)
          .maybeSingle();
        if (v?.extra_km_price != null) price = Number(v.extra_km_price);
        if (v?.inclusive_km_month != null) inclusiveKmMonth = Number(v.inclusive_km_month);
        vehicleRate = (v?.daily_rate as number | null) ?? null;
      }
      // Effektiver Tagespreis (geteilte Regel) + festgeschriebenes Ursprungsdatum.
      const dailyRate = resolveEffectiveDailyRate({
        contractRate: current.daily_rate as number | null,
        vehicleRate,
      });
      const originalReturn = current.original_return_date as string | null;

      // Nur volle Aufstellung wenn Rückgabe erfolgt ist (actualReturn + km_return).
      // Sonst nur einfach extra_km_cost zurücksetzen.
      if (actualReturn && pickupDate && plannedReturn) {
        const summary = computeReturnSummary({
          pickupDate,
          plannedReturnDate: plannedReturn,
          actualReturnDate: actualReturn,
          kmPickup,
          kmReturn,
          inclusiveKmMonth,
          kmLimitOverride: kmLimit,
          pricePerKm: price,
          originalReturnDate: originalReturn,
          dailyRate,
        });
        update.actual_days = summary.actualDays;
        update.actual_km_allowed = summary.allowedKm;
        update.km_driven = summary.drivenKm;
        update.km_excess = summary.excessKm;
        update.extra_km_cost = summary.cost;
        update.extra_days_cost = summary.extraDaysCost;
      } else {
        // Vor Rückgabe: nur Driven aktualisieren falls beide km bekannt
        if (
          kmPickup != null &&
          kmReturn != null &&
          Number(kmReturn) >= Number(kmPickup)
        ) {
          update.km_driven = Number(kmReturn) - Number(kmPickup);
        }
        update.extra_km_cost = null;
        update.extra_days_cost = null;
      }
    }
  }

  const { data, error } = await admin
    .from("contracts")
    .update(update)
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Mitarbeiter bekommen keine Partner-Verrechnung in der Antwort.
  const isOwner = (await myRole()) === "owner";
  return NextResponse.json({
    ok: true,
    contract: redactContractPartner(data as Contract, isOwner),
  });
};

export const DELETE = async (_req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const admin = createAdminClient();
  const { error } = await admin
    .from("contracts")
    .delete()
    .eq("id", params.id)
    .eq("org_id", auth.org_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
};
