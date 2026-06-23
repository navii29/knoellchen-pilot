import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { notifyOnce } from "@/lib/notify";

// Täglicher Cron: Verträge, deren Rückgabedatum überschritten ist.
//
// WICHTIG: Es wird NICHTS automatisch geschlossen. Ein stilles Auto-Schließen
// birgt das Risiko, dass eine vergessene Verlängerung unbemerkt "durchrutscht"
// (Vertrag gilt als beendet, obwohl das Fahrzeug noch draußen ist). Stattdessen:
//   - Der Vertrag bleibt 'aktiv' und damit im Dashboard als überfällig sichtbar.
//   - Der Mieter wird einmalig erinnert (zurückgeben oder Verlängerung anfragen).
//   - Der Betreiber bestätigt die Rückgabe MANUELL ("Rückgabe erfassen") oder
//     genehmigt eine Verlängerung.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const fmtDe = (iso: string) => {
  const parts = iso.split("-");
  return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : iso;
};

export const GET = async (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    const isVercelCron = req.headers.get("x-vercel-cron") !== null;
    if (auth !== `Bearer ${secret}` && !isVercelCron) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  let notified = 0;

  // Aktive Verträge, deren Rückgabedatum vor heute liegt (striktes <: erst am Tag
  // NACH dem Rückgabedatum, nie am letzten Miettag). Verlängerungen sind
  // automatisch berücksichtigt, da das return_date beim Genehmigen vorgeschoben
  // wurde — solche Verträge sind dann nicht mehr überfällig.
  const { data: overdue } = await admin
    .from("contracts")
    .select("id, customer_id, org_id, plate, return_date")
    .eq("status", "aktiv")
    .lt("return_date", today)
    .not("customer_id", "is", null);

  for (const c of overdue ?? []) {
    // notifyOnce dedupliziert über type + link → keine tägliche Spam-Erinnerung.
    const ok = await notifyOnce({
      customer_id: c.customer_id,
      org_id: c.org_id,
      type: "return_overdue",
      title: "Rückgabe überfällig",
      body: `Dein Fahrzeug ${c.plate} ist seit dem ${fmtDe(
        c.return_date as string
      )} zur Rückgabe fällig. Bitte gib es zurück oder beantrage eine Verlängerung.`,
      link: `/portal/contracts/${c.id}`,
    });
    if (ok) notified++;
  }

  return NextResponse.json({ ok: true, notified });
};
