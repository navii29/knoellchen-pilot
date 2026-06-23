"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, Loader2 } from "lucide-react";
import type { SiteTemplate } from "@/lib/site/types";

const TEMPLATES: Array<{
  key: SiteTemplate;
  label: string;
  description: string;
  swatch: string;
}> = [
  {
    key: "modern",
    label: "Modern",
    description: "Luftig und hell, Teal-Akzent, klare Hierarchie.",
    swatch: "#0d9488",
  },
  {
    key: "klassisch",
    label: "Klassisch",
    description: "Serios und ruhig, gedecktes Blau, klassische Anmutung.",
    swatch: "#1d4ed8",
  },
  {
    key: "bold",
    label: "Bold",
    description: "Kraftig und kontrastreich, warmer Akzent, groe Headlines.",
    swatch: "#ea580c",
  },
];

export function WebsiteClient({
  slug,
  orgName,
  initialTemplate,
  initialPublished,
  hasSite,
}: {
  slug: string | null;
  orgName: string;
  initialTemplate: SiteTemplate | null;
  initialPublished: boolean;
  hasSite: boolean;
}) {
  const [template, setTemplate] = useState<SiteTemplate | null>(initialTemplate);
  const [published, setPublished] = useState(initialPublished);
  const [siteExists, setSiteExists] = useState(hasSite);
  const [busy, setBusy] = useState<null | "init" | "publish">(null);
  const [error, setError] = useState<string | null>(null);

  const initTemplate = async (key: SiteTemplate) => {
    setBusy("init");
    setError(null);
    try {
      const res = await fetch("/api/site/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: key }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Fehler beim Speichern");
      setTemplate(key);
      setSiteExists(true);
      if (typeof json?.site?.published === "boolean")
        setPublished(json.site.published);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setBusy(null);
    }
  };

  const togglePublished = async () => {
    const next = !published;
    setBusy("publish");
    setError(null);
    try {
      const res = await fetch("/api/site/init", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Fehler beim Speichern");
      setPublished(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setBusy(null);
    }
  };

  const publicUrl = slug ? `/m/${slug}` : null;

  return (
    <div className="space-y-6">
      <div className="rounded-card border border-hairline bg-paper p-6">
        <h2 className="text-lg font-semibold text-ink">Mietseite</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Eine offentliche Mini-Website fur {orgName || "Ihre Vermietung"} im
          Plattform-Design. Wahlen Sie ein Template — Inhalte werden aus Ihren
          eigenen Daten (Name, Logo, Fahrzeuge, Kontakt) vorbefullt. Den
          Inhaltseditor gibt es in Kurze.
        </p>

        {error ? (
          <p className="mt-4 rounded-input border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {TEMPLATES.map((t) => {
            const active = template === t.key;
            return (
              <button
                key={t.key}
                type="button"
                disabled={busy !== null}
                onClick={() => initTemplate(t.key)}
                className={`relative rounded-input border p-4 text-left transition-colors disabled:opacity-60 ${
                  active
                    ? "border-signal ring-1 ring-signal/30 bg-signal-soft"
                    : "border-hairline bg-paper hover:border-ink/30"
                }`}
              >
                {active ? (
                  <span className="absolute right-3 top-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-signal text-white">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                ) : null}
                <span
                  className="mb-3 block h-8 w-8 rounded-full"
                  style={{ backgroundColor: t.swatch }}
                  aria-hidden
                />
                <span className="block font-medium text-ink">{t.label}</span>
                <span className="mt-1 block text-xs text-ink-muted">
                  {t.description}
                </span>
              </button>
            );
          })}
        </div>
        {busy === "init" ? (
          <p className="mt-3 inline-flex items-center gap-2 text-sm text-ink-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Wird angelegt…
          </p>
        ) : null}
      </div>

      <div className="rounded-card border border-hairline bg-paper p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-medium text-ink">Veroffentlichen</h3>
            <p className="mt-1 text-sm text-ink-muted">
              {published
                ? "Ihre Mietseite ist offentlich erreichbar."
                : "Die Seite ist nur fur Sie sichtbar, bis Sie veroffentlichen."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={published}
            disabled={!siteExists || busy !== null}
            onClick={togglePublished}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
              published ? "bg-signal" : "bg-hairline"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                published ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {!siteExists ? (
          <p className="mt-3 text-xs text-ink-muted">
            Bitte zuerst ein Template wahlen.
          </p>
        ) : null}

        {publicUrl ? (
          <div className="mt-5 flex items-center gap-3 border-t border-hairline pt-4">
            <Link
              href={publicUrl}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-signal hover:text-signal-strong"
            >
              <ExternalLink className="h-4 w-4" />
              Seite offnen — /m/{slug}
            </Link>
          </div>
        ) : (
          <p className="mt-4 text-xs text-ink-muted">
            Es ist noch kein Slug fur Ihre Organisation hinterlegt.
          </p>
        )}
      </div>
    </div>
  );
}
