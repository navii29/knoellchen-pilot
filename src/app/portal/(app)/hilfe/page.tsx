import { HelpCircle, Mail, Phone } from "lucide-react";
import { getPortalCustomer } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { Surface } from "@/components/portal/kit/Surface";
import { SectionLabel } from "@/components/portal/kit/SectionLabel";
import { SupportForm } from "@/components/portal/SupportForm";

export const dynamic = "force-dynamic";

const FAQ: { q: string; a: string }[] = [
  {
    q: `Wie unterschreibe ich meinen Mietvertrag?`,
    a: `Öffne unter „Mieten" deinen Vertrag und tippe auf „Vertrag unterschreiben". Du kannst direkt mit dem Finger unterschreiben.`,
  },
  {
    q: `Wie funktioniert der Self-Check-in?`,
    a: `Im Vertrag auf „Self-Check-in starten" — du fotografierst Führerschein, Ausweis und das Fahrzeug und unterschreibst. Das dauert nur wenige Minuten.`,
  },
  {
    q: `Wie gebe ich das Fahrzeug zurück?`,
    a: `Im aktiven Vertrag auf „Self-Check-out" — Fotos, Kilometerstand und Tankfüllung erfassen, fertig.`,
  },
  {
    q: `Was mache ich bei einem Strafzettel?`,
    a: `Unter „Strafzettel" siehst du Details und Betrag. Du kannst bestätigen, dass du gefahren bist, oder Einspruch einlegen (Ich war nicht der Fahrer).`,
  },
  {
    q: `Wie melde ich einen Schaden?`,
    a: `Im aktiven Vertrag auf „Schaden melden" — beschreibe den Vorfall und füge Fotos hinzu.`,
  },
  {
    q: `Kann ich die Miete verlängern?`,
    a: `Ja, im aktiven Vertrag auf „Miete verlängern" — wähle ein neues Rückgabedatum, die Mehrkosten werden dir angezeigt.`,
  },
];

export default async function HilfePage() {
  const ctx = await getPortalCustomer();
  if (!ctx) return null;

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("name, phone, email")
    .eq("id", ctx.session.org_id)
    .single();

  return (
    <div className="px-5 py-4 space-y-4">
      <h1 className="font-display text-[22px] tracking-tightest font-bold text-ink px-1">Hilfe</h1>

      <div>
        <SectionLabel>Häufige Fragen</SectionLabel>
        <Surface padding="p-0" className="overflow-hidden">
          <div className="divide-y divide-hairline">
            {FAQ.map((f, i) => (
              <details key={i} className="group">
                <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer list-none text-[14px] font-medium text-ink">
                  <HelpCircle size={15} className="text-signal shrink-0" />
                  <span className="flex-1">{f.q}</span>
                  <span className="text-ink-muted group-open:rotate-90 transition-transform">›</span>
                </summary>
                <div className="px-4 pb-3 pl-11 text-[13px] text-ink-soft leading-snug">{f.a}</div>
              </details>
            ))}
          </div>
        </Surface>
      </div>

      {(org?.phone || org?.email) && (
        <div>
          <SectionLabel>Kontakt</SectionLabel>
          <Surface className="space-y-2">
            {org?.phone && (
              <a href={`tel:${org.phone}`} className="flex items-center gap-2 text-[14px] text-ink">
                <Phone size={15} className="text-ink-muted" />
                {org.phone}
              </a>
            )}
            {org?.email && (
              <a
                href={`mailto:${org.email}`}
                className="flex items-center gap-2 text-[14px] text-ink"
              >
                <Mail size={15} className="text-ink-muted" />
                {org.email}
              </a>
            )}
          </Surface>
        </div>
      )}

      <SupportForm />
    </div>
  );
}
