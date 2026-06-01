// Zentrale externe Links der Landingpage.
//
// Den Buchungslink hier aendern ODER ohne Code-Aenderung ueber die Env-Var
// NEXT_PUBLIC_BOOKING_URL (z.B. in den Vercel-Project-Settings) ueberschreiben.
// Aktuell: Calendly 30-Minuten-Termin mit dem Gruender.
export const BOOKING_URL =
  process.env.NEXT_PUBLIC_BOOKING_URL ??
  "https://calendly.com/f-edlmair-cooodex/30min";
