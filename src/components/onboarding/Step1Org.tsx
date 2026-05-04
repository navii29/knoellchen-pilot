"use client";

import { useState } from "react";
import { Field, StepShell, inputClass } from "./StepShell";
import type { OrgInit } from "./OnboardingWizard";

export const Step1Org = ({
  org,
  onDone,
  onSkip,
}: {
  org: OrgInit;
  onDone: () => void;
  onSkip: () => void;
}) => {
  const [name, setName] = useState(org.name);
  const [street, setStreet] = useState(org.street);
  const [zip, setZip] = useState(org.zip);
  const [city, setCity] = useState(org.city);
  const [phone, setPhone] = useState(org.phone);
  const [email, setEmail] = useState(org.email);
  const [taxNumber, setTaxNumber] = useState(org.tax_number);
  const [processingFee, setProcessingFee] = useState(String(org.processing_fee));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      setError("Bitte geben Sie einen Firmennamen an.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/org", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          street: street.trim() || null,
          zip: zip.trim() || null,
          city: city.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          tax_number: taxNumber.trim() || null,
          processing_fee: Number(processingFee.replace(",", ".")) || 25,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Speichern fehlgeschlagen.");
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
      eyebrow="Schritt 1 von 5"
      title="Willkommen! Erzählen Sie uns von Ihrem Unternehmen."
      subtitle="Diese Angaben erscheinen auf Ihren Rechnungen, Anschreiben an Mieter:innen und Behörden."
      primaryLabel="Speichern und weiter"
      primaryLoading={loading}
      onPrimary={submit}
      onSkip={onSkip}
      error={error}
    >
      <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
        <div className="sm:col-span-6">
          <Field label="Firmenname" required>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Musterauto Vermietung GmbH"
              autoFocus
            />
          </Field>
        </div>

        <div className="sm:col-span-4">
          <Field label="Straße und Hausnummer">
            <input
              className={inputClass}
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="Musterstraße 12"
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="PLZ">
            <input
              className={inputClass}
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="80331"
              inputMode="numeric"
            />
          </Field>
        </div>
        <div className="sm:col-span-6">
          <Field label="Ort">
            <input
              className={inputClass}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="München"
            />
          </Field>
        </div>

        <div className="sm:col-span-3">
          <Field label="Telefon">
            <input
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="089 123 456 78"
              inputMode="tel"
            />
          </Field>
        </div>
        <div className="sm:col-span-3">
          <Field label="E-Mail">
            <input
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kontakt@…"
              type="email"
            />
          </Field>
        </div>

        <div className="sm:col-span-3">
          <Field label="Steuernummer">
            <input
              className={inputClass}
              value={taxNumber}
              onChange={(e) => setTaxNumber(e.target.value)}
              placeholder="123/456/78901"
            />
          </Field>
        </div>
        <div className="sm:col-span-3">
          <Field
            label="Bearbeitungsgebühr"
            hint="netto, in Euro"
          >
            <div className="relative">
              <input
                className={`${inputClass} pr-10`}
                value={processingFee}
                onChange={(e) => setProcessingFee(e.target.value)}
                placeholder="25"
                inputMode="decimal"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[14px] text-stone-400">
                €
              </span>
            </div>
          </Field>
        </div>
      </div>
    </StepShell>
  );
};
