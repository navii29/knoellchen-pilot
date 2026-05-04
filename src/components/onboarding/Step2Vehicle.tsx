"use client";

import { useState } from "react";
import { Field, StepShell, inputClass } from "./StepShell";
import { MANUFACTURERS } from "@/lib/vehicle";
import type { VehicleLite } from "./OnboardingWizard";

export const Step2Vehicle = ({
  onDone,
  onSkip,
  onBack,
}: {
  onDone: (v: VehicleLite) => void;
  onSkip: () => void;
  onBack: () => void;
}) => {
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [plate, setPlate] = useState("");
  const [firstRegistration, setFirstRegistration] = useState("");
  const [color, setColor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!plate.trim()) {
      setError("Bitte geben Sie ein Kennzeichen an.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plate: plate.trim().toUpperCase(),
          manufacturer: manufacturer || null,
          model: model.trim() || null,
          first_registration: firstRegistration || null,
          color: color.trim() || null,
          status: "aktiv",
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Fahrzeug konnte nicht gespeichert werden.");
        setLoading(false);
        return;
      }
      const j = (await res.json()) as {
        vehicle?: { id: string; plate: string; manufacturer: string | null; model: string | null };
      };
      if (!j.vehicle) {
        setError("Unerwartete Antwort vom Server.");
        setLoading(false);
        return;
      }
      onDone({
        id: j.vehicle.id,
        plate: j.vehicle.plate,
        manufacturer: j.vehicle.manufacturer,
        model: j.vehicle.model,
      });
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
      setLoading(false);
    }
  };

  return (
    <StepShell
      eyebrow="Schritt 2 von 5"
      title="Ihr erstes Fahrzeug."
      subtitle="Fügen Sie ein Fahrzeug hinzu, damit Sie gleich Verträge anlegen können. Weitere Fahrzeuge können Sie jederzeit später ergänzen."
      primaryLabel="Fahrzeug speichern"
      primaryLoading={loading}
      onPrimary={submit}
      onSkip={onSkip}
      onBack={onBack}
      error={error}
    >
      <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
        <div className="sm:col-span-3">
          <Field label="Hersteller">
            <select
              className={inputClass}
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
            >
              <option value="">– bitte wählen –</option>
              {MANUFACTURERS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="sm:col-span-3">
          <Field label="Modell">
            <input
              className={inputClass}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="z. B. Golf VIII"
            />
          </Field>
        </div>

        <div className="sm:col-span-3">
          <Field label="Kennzeichen" required>
            <input
              className={`${inputClass} uppercase`}
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              placeholder="M-AB 1234"
              autoFocus
            />
          </Field>
        </div>
        <div className="sm:col-span-3">
          <Field label="Erstzulassung">
            <input
              className={inputClass}
              value={firstRegistration}
              onChange={(e) => setFirstRegistration(e.target.value)}
              type="date"
            />
          </Field>
        </div>

        <div className="sm:col-span-3">
          <Field label="Farbe">
            <input
              className={inputClass}
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="z. B. Schwarz"
            />
          </Field>
        </div>
      </div>
    </StepShell>
  );
};
