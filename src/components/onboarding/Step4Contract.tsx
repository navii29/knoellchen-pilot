"use client";

import { useMemo, useState } from "react";
import { Field, StepShell, inputClass } from "./StepShell";
import type { CustomerLite, VehicleLite } from "./OnboardingWizard";

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const customerLabel = (c: CustomerLite) =>
  [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || "Unbenannt";

const vehicleLabel = (v: VehicleLite) =>
  [v.manufacturer, v.model].filter(Boolean).join(" ").trim()
    ? `${v.plate} — ${[v.manufacturer, v.model].filter(Boolean).join(" ")}`
    : v.plate;

export const Step4Contract = ({
  vehicles,
  customers,
  onDone,
  onSkip,
  onBack,
}: {
  vehicles: VehicleLite[];
  customers: CustomerLite[];
  onDone: () => void;
  onSkip: () => void;
  onBack: () => void;
}) => {
  const firstVehicleId = vehicles[0]?.id ?? "";
  const firstCustomerId = customers[0]?.id ?? "";
  const [vehicleId, setVehicleId] = useState(firstVehicleId);
  const [customerId, setCustomerId] = useState(firstCustomerId);
  const [pickupDate, setPickupDate] = useState(today());
  const [returnDate, setReturnDate] = useState(inDays(3));
  const [dailyRate, setDailyRate] = useState("59");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === vehicleId) ?? null,
    [vehicleId, vehicles]
  );
  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId) ?? null,
    [customerId, customers]
  );

  const totalAmount = useMemo(() => {
    const rate = Number(dailyRate.replace(",", ".")) || 0;
    if (!pickupDate || !returnDate) return 0;
    const ms =
      new Date(returnDate).getTime() - new Date(pickupDate).getTime();
    const days = Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
    return rate * days;
  }, [dailyRate, pickupDate, returnDate]);

  const noVehicles = vehicles.length === 0;
  const noCustomers = customers.length === 0;
  const cannotProceed = noVehicles || noCustomers;

  const submit = async () => {
    if (!selectedVehicle) {
      setError("Bitte wählen Sie ein Fahrzeug.");
      return;
    }
    if (!selectedCustomer) {
      setError("Bitte wählen Sie einen Kunden.");
      return;
    }
    if (!pickupDate || !returnDate) {
      setError("Bitte geben Sie Abhol- und Rückgabedatum an.");
      return;
    }
    if (new Date(returnDate) < new Date(pickupDate)) {
      setError("Rückgabe darf nicht vor Abholung liegen.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const renterName = customerLabel(selectedCustomer);
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plate: selectedVehicle.plate,
          customer_id: selectedCustomer.id,
          vehicle_type: [selectedVehicle.manufacturer, selectedVehicle.model]
            .filter(Boolean)
            .join(" ") || null,
          renter_name: renterName,
          renter_email: selectedCustomer.email ?? null,
          pickup_date: pickupDate,
          return_date: returnDate,
          daily_rate: Number(dailyRate.replace(",", ".")) || null,
          total_amount: totalAmount || null,
          status: "aktiv",
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        contract?: unknown;
        error?: string;
      };
      if (!res.ok || !j.ok) {
        setError(j.error ?? "Vertrag konnte nicht gespeichert werden.");
        setLoading(false);
        return;
      }
      onDone();
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
      setLoading(false);
    }
  };

  return (
    <StepShell
      eyebrow="Schritt 4 von 5"
      title="Ihr erster Vertrag."
      subtitle="So sehen Sie sofort, wie Knöllchen-Pilot Verträge mit Fahrzeugen und Kunden verknüpft."
      primaryLabel="Vertrag anlegen"
      primaryLoading={loading}
      primaryDisabled={cannotProceed}
      onPrimary={submit}
      onSkip={onSkip}
      onBack={onBack}
      error={error}
    >
      {cannotProceed && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-amber-50 ring-1 ring-amber-200 text-[13.5px] text-amber-900">
          {noVehicles && "Sie haben noch kein Fahrzeug angelegt. "}
          {noCustomers && "Sie haben noch keinen Kunden angelegt. "}
          Gehen Sie zurück oder überspringen Sie diesen Schritt.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Fahrzeug" required>
          <select
            className={inputClass}
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            disabled={noVehicles}
          >
            {noVehicles && <option value="">– kein Fahrzeug verfügbar –</option>}
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {vehicleLabel(v)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Kunde" required>
          <select
            className={inputClass}
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            disabled={noCustomers}
          >
            {noCustomers && <option value="">– kein Kunde verfügbar –</option>}
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {customerLabel(c)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Abholdatum" required>
          <input
            className={inputClass}
            type="date"
            value={pickupDate}
            onChange={(e) => setPickupDate(e.target.value)}
          />
        </Field>
        <Field label="Rückgabedatum" required>
          <input
            className={inputClass}
            type="date"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
          />
        </Field>
        <Field label="Tagespreis" hint="netto">
          <div className="relative">
            <input
              className={`${inputClass} pr-10`}
              value={dailyRate}
              onChange={(e) => setDailyRate(e.target.value)}
              inputMode="decimal"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[14px] text-stone-400">
              €
            </span>
          </div>
        </Field>
        <div className="flex items-end">
          <div className="w-full px-4 py-3 rounded-xl bg-stone-100 ring-1 ring-stone-200/60">
            <div className="text-[12px] uppercase tracking-[0.08em] text-stone-500 font-medium">
              Gesamtsumme
            </div>
            <div className="font-display text-[24px] tracking-[-0.02em] text-stone-900 font-medium leading-tight">
              {totalAmount.toLocaleString("de-DE", {
                style: "currency",
                currency: "EUR",
                minimumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>
      </div>
    </StepShell>
  );
};
