// Strikte Prüfung einer PNG-Data-URL: nach dem Präfix sind NUR Base64-Zeichen
// erlaubt. Verhindert HTML-Attribut-Breakout, wenn der Wert später in eine
// PDF-/HTML-Vorlage (img src) interpoliert wird. Wird für alle Unterschriften
// (Mieter + Vermieter) als Input-Validierung genutzt.
export const isPngDataUrl = (v: unknown): v is string =>
  typeof v === "string" && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(v);

export const fmtEur = (n: number | null | undefined): string => {
  if (n == null) return "—";
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
};

export const fmtDate = (d: string | null | undefined): string => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return d;
  }
};

export const fmtDateTime = (d: string | null | undefined, t?: string | null): string => {
  if (!d) return "—";
  const date = fmtDate(d);
  return t ? `${date} · ${t}` : date;
};

export const relTime = (iso: string): string => {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.floor(h / 24);
  if (d === 1) return "gestern";
  if (d < 30) return `vor ${d} Tagen`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `vor ${mo} Mon.`;
  return `vor ${Math.floor(mo / 12)} J.`;
};

export const initials = (name: string): string =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || "")
    .join("");

export const nextTicketNr = (): string =>
  `KP-${Date.now().toString().slice(-6)}`;

// Höfliche Briefanrede aus customer.salutation ableiten. Fällt sauber auf
// "Sehr geehrte/r Frau/Herr {Name}" zurück, wenn salutation unbekannt —
// vermeidet "Sehr geehrte:r"-Doppelpunktform.
export const formatSalutation = (
  salutation: string | null | undefined,
  surname: string | null | undefined
): string => {
  const name = (surname ?? "").trim();
  const s = (salutation ?? "").trim().toLowerCase();
  if (s === "herr")
    return name ? `Sehr geehrter Herr ${name}` : "Sehr geehrter Herr";
  if (s === "frau")
    return name ? `Sehr geehrte Frau ${name}` : "Sehr geehrte Frau";
  if (name) return `Sehr geehrte/r Frau/Herr ${name}`;
  return "Sehr geehrte Damen und Herren";
};
