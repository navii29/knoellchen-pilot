"use client";

import { useRef, useState } from "react";
import { Field, StepShell, inputClass } from "./StepShell";
import type { CustomerLite } from "./OnboardingWizard";

type Mode = "scan" | "manual";

type ParsedData = {
  first_name?: string | null;
  last_name?: string | null;
  birthday?: string | null;
  street?: string | null;
  house_nr?: string | null;
  zip?: string | null;
  city?: string | null;
  license_nr?: string | null;
  license_class?: string | null;
  license_expiry?: string | null;
};

export const Step3Customer = ({
  onDone,
  onSkip,
  onBack,
}: {
  onDone: (c: CustomerLite) => void;
  onSkip: () => void;
  onBack: () => void;
}) => {
  const [mode, setMode] = useState<Mode>("scan");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [extra, setExtra] = useState<{
    birthday?: string | null;
    street?: string | null;
    house_nr?: string | null;
    zip?: string | null;
    city?: string | null;
    license_nr?: string | null;
    license_class?: string | null;
    license_expiry?: string | null;
    license_photo_path?: string | null;
  }>({});

  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onFileChosen = async (file: File) => {
    setError(null);
    setScanning(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("doc_type", "license");
      const res = await fetch("/api/customers/parse-document", {
        method: "POST",
        body: fd,
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        data?: ParsedData;
        storage_path?: string;
        error?: string;
      };
      if (!res.ok || !j.ok || !j.data) {
        setError(j.error ?? "Auslesen fehlgeschlagen.");
        setScanning(false);
        return;
      }
      setFirstName(j.data.first_name ?? "");
      setLastName(j.data.last_name ?? "");
      setExtra({
        birthday: j.data.birthday ?? null,
        street: j.data.street ?? null,
        house_nr: j.data.house_nr ?? null,
        zip: j.data.zip ?? null,
        city: j.data.city ?? null,
        license_nr: j.data.license_nr ?? null,
        license_class: j.data.license_class ?? null,
        license_expiry: j.data.license_expiry ?? null,
        license_photo_path: j.storage_path ?? null,
      });
      setScanned(true);
      setMode("manual");
    } catch {
      setError("Netzwerkfehler beim Hochladen.");
    } finally {
      setScanning(false);
    }
  };

  const submit = async () => {
    if (!lastName.trim()) {
      setError("Bitte geben Sie mindestens einen Nachnamen an.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim() || null,
          last_name: lastName.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          ...extra,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        customer?: { id: string; first_name: string | null; last_name: string | null; email: string | null };
        error?: string;
      };
      if (!res.ok || !j.ok || !j.customer) {
        setError(j.error ?? "Kunde konnte nicht gespeichert werden.");
        setLoading(false);
        return;
      }
      onDone({
        id: j.customer.id,
        first_name: j.customer.first_name,
        last_name: j.customer.last_name,
        email: j.customer.email,
      });
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
      setLoading(false);
    }
  };

  return (
    <StepShell
      eyebrow="Schritt 3 von 5"
      title="Ihr erster Kunde."
      subtitle="Scannen Sie den Führerschein und lassen Sie die Daten automatisch übernehmen — oder geben Sie sie manuell ein."
      primaryLabel="Kunden speichern"
      primaryLoading={loading}
      onPrimary={submit}
      onSkip={onSkip}
      onBack={onBack}
      error={error}
    >
      {!scanned && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-7">
          <button
            type="button"
            onClick={() => {
              setMode("scan");
              fileInputRef.current?.click();
            }}
            disabled={scanning}
            className={`relative overflow-hidden rounded-2xl ring-1 px-5 py-4 text-left transition-all ${
              mode === "scan"
                ? "bg-stone-900 text-white ring-stone-900 shadow-lg shadow-stone-900/10"
                : "bg-white text-stone-900 ring-stone-200 hover:ring-stone-300"
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  mode === "scan" ? "bg-white/10 text-teal-300" : "bg-teal-100 text-teal-700"
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M7 9h6M7 13h4M16 11h2M16 15h2" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-[14.5px] font-medium">Führerschein scannen</div>
                <div
                  className={`text-[12.5px] mt-0.5 ${
                    mode === "scan" ? "text-white/60" : "text-stone-500"
                  }`}
                >
                  {scanning ? "Wird ausgelesen…" : "Foto hochladen — KI füllt vor"}
                </div>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFileChosen(f);
              }}
            />
          </button>

          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`rounded-2xl ring-1 px-5 py-4 text-left transition-all ${
              mode === "manual"
                ? "bg-stone-900 text-white ring-stone-900 shadow-lg shadow-stone-900/10"
                : "bg-white text-stone-900 ring-stone-200 hover:ring-stone-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  mode === "manual" ? "bg-white/10 text-teal-300" : "bg-stone-100 text-stone-700"
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-[14.5px] font-medium">Manuell eingeben</div>
                <div
                  className={`text-[12.5px] mt-0.5 ${
                    mode === "manual" ? "text-white/60" : "text-stone-500"
                  }`}
                >
                  Name, E-Mail, Telefon
                </div>
              </div>
            </div>
          </button>
        </div>
      )}

      {scanned && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-teal-50 ring-1 ring-teal-200/70 text-[13.5px] text-teal-800 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Daten erfolgreich übernommen — bitte kurz prüfen und ergänzen.</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Vorname">
          <input
            className={inputClass}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Max"
          />
        </Field>
        <Field label="Nachname" required>
          <input
            className={inputClass}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Mustermann"
          />
        </Field>
        <Field label="E-Mail">
          <input
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="max@example.com"
            type="email"
          />
        </Field>
        <Field label="Telefon">
          <input
            className={inputClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0170 123 4567"
            inputMode="tel"
          />
        </Field>
      </div>

      <p className="mt-6 text-[13px] text-stone-500">
        Weitere Kunden können Sie jederzeit später hinzufügen.
      </p>
    </StepShell>
  );
};
