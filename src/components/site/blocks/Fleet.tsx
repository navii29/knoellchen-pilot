import { Car, Users, Fuel, Cog } from "lucide-react";
import type { PublicVehicle } from "@/lib/site/types";

// Fleet-Block: zeigt die org-eigenen Fahrzeuge mit NUR neutralen Anzeigefeldern.
// Kosten/Margen/EK/Partner-Preise sind hier nicht verfügbar (PublicVehicle
// enthält sie gar nicht erst). daily_rate ist der öffentliche Tagespreis.

const title = (v: PublicVehicle) =>
  v.vehicle_type ||
  [v.manufacturer, v.model].filter(Boolean).join(" ") ||
  "Fahrzeug";

const fmtPrice = (n: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

export function Fleet({
  heading,
  subline,
  vehicles,
}: {
  heading?: string;
  subline?: string;
  vehicles: PublicVehicle[];
}) {
  return (
    <section className="bg-[var(--site-bg)]">
      <div className="mx-auto max-w-6xl px-6 py-16">
        {heading ? (
          <h2 className="font-[var(--site-font)] text-3xl font-bold text-[var(--site-ink)]">
            {heading}
          </h2>
        ) : null}
        {subline ? (
          <p className="mt-2 text-[var(--site-ink-soft)]">{subline}</p>
        ) : null}

        {vehicles.length === 0 ? (
          <p className="mt-8 text-[var(--site-ink-soft)]">
            Aktuell sind keine Fahrzeuge hinterlegt.
          </p>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v) => (
              <article
                key={v.id}
                className="overflow-hidden rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface)] shadow-sm"
              >
                <div className="flex h-40 items-center justify-center bg-[var(--site-muted)]">
                  <Car
                    className="h-16 w-16 text-[var(--site-primary)] opacity-60"
                    strokeWidth={1.25}
                  />
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-[var(--site-ink)]">
                    {title(v)}
                  </h3>
                  <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[var(--site-ink-soft)]">
                    {v.seats ? (
                      <div className="inline-flex items-center gap-1.5">
                        <Users className="h-4 w-4" strokeWidth={1.5} />
                        {v.seats} Sitze
                      </div>
                    ) : null}
                    {v.fuel_type ? (
                      <div className="inline-flex items-center gap-1.5">
                        <Fuel className="h-4 w-4" strokeWidth={1.5} />
                        {v.fuel_type}
                      </div>
                    ) : null}
                    {v.transmission ? (
                      <div className="inline-flex items-center gap-1.5">
                        <Cog className="h-4 w-4" strokeWidth={1.5} />
                        {v.transmission}
                      </div>
                    ) : null}
                  </dl>
                  {v.daily_rate ? (
                    <p className="mt-4 text-sm text-[var(--site-ink-soft)]">
                      ab{" "}
                      <span className="text-base font-semibold text-[var(--site-ink)]">
                        {fmtPrice(v.daily_rate)}
                      </span>{" "}
                      / Tag
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
