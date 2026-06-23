import { MapPin, Phone, Mail } from "lucide-react";
import type { ContactContent } from "@/lib/site/types";

export function Contact({ content }: { content: ContactContent }) {
  const hasAddress = content.street || content.zip || content.city;
  return (
    <section className="bg-[var(--site-surface)]">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="font-[var(--site-font)] text-3xl font-bold text-[var(--site-ink)]">
          {content.title || "Kontakt"}
        </h2>
        <div className="mt-8 space-y-5 text-[var(--site-ink-soft)]">
          {content.name ? (
            <p className="text-lg font-semibold text-[var(--site-ink)]">
              {content.name}
            </p>
          ) : null}
          {hasAddress ? (
            <p className="flex items-start gap-3">
              <MapPin
                className="mt-0.5 h-5 w-5 shrink-0 text-[var(--site-primary)]"
                strokeWidth={1.5}
              />
              <span>
                {content.street ? (
                  <>
                    {content.street}
                    <br />
                  </>
                ) : null}
                {[content.zip, content.city].filter(Boolean).join(" ")}
              </span>
            </p>
          ) : null}
          {content.phone ? (
            <p className="flex items-center gap-3">
              <Phone
                className="h-5 w-5 shrink-0 text-[var(--site-primary)]"
                strokeWidth={1.5}
              />
              <a
                href={`tel:${content.phone.replace(/\s+/g, "")}`}
                className="hover:text-[var(--site-primary)]"
              >
                {content.phone}
              </a>
            </p>
          ) : null}
          {content.email ? (
            <p className="flex items-center gap-3">
              <Mail
                className="h-5 w-5 shrink-0 text-[var(--site-primary)]"
                strokeWidth={1.5}
              />
              <a
                href={`mailto:${content.email}`}
                className="hover:text-[var(--site-primary)]"
              >
                {content.email}
              </a>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
