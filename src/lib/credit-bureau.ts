/**
 * credit-bureau.ts — Externe Bonitätsauskunft, provider-agnostisch.
 *
 * Der reine, deterministische Teil (Score-Bewertung, Mock-Adapter) hat KEINE
 * Seiteneffekte: kein Netzwerk, kein Date.now(), kein Math.random() — damit gut
 * testbar. `runCreditCheck` ist der einzige (asynchrone) Einstieg, der je nach
 * konfiguriertem Anbieter den Mock liefert oder einen echten Adapter aufruft.
 */

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

export type CreditSubject = {
  name: string;
  company?: string | null;
  birthday?: string | null;
  street?: string | null;
  zip?: string | null;
  city?: string | null;
  country?: string | null;
};

export type CreditDecision = "gruen" | "gelb" | "rot";

export type CreditResult = {
  provider: string;
  score: number | null;
  rating: string | null;
  decision: CreditDecision;
  summary: string;
  raw: unknown;
};

// ---------------------------------------------------------------------------
// Anbieterliste (für das Settings-Dropdown)
// ---------------------------------------------------------------------------

export const CREDIT_PROVIDERS: { key: string; label: string }[] = [
  { key: "mock", label: "Demo / Mock" },
  { key: "generic", label: "Generischer REST-Adapter" },
  { key: "schufa", label: "Schufa (B2B)" },
  { key: "creditreform", label: "Creditreform" },
  { key: "crif", label: "CRIF / Boniversum" },
];

// ---------------------------------------------------------------------------
// Reine Bewertung
// ---------------------------------------------------------------------------

/** Ampel aus dem Score: >=70 gruen, >=40 gelb, sonst rot. null → rot. */
export const creditDecisionFromScore = (score: number | null): CreditDecision => {
  if (score == null || Number.isNaN(score)) return "rot";
  if (score >= 70) return "gruen";
  if (score >= 40) return "gelb";
  return "rot";
};

/** Rating-Buchstabe nach Score-Band (analog Bonitätsklassen). */
const ratingFromScore = (score: number): string => {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 55) return "D";
  if (score >= 40) return "E";
  return "F";
};

/** Stabiler 32-bit-Hash (FNV-1a-Variante) — gleicher String → gleicher Wert. */
const stableHash = (input: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    // Math.imul für 32-bit-Multiplikation (FNV-Prime 16777619).
    h = Math.imul(h, 0x01000193);
  }
  // In den Bereich 0–99 falten, vorzeichenlos.
  return (h >>> 0) % 100;
};

/**
 * Deterministischer Mock — leitet einen stabilen Score (0–100) aus dem Namen
 * des Subjekts ab. Gleicher Name ⇒ gleicher Score. Rein, ohne Netzwerk/Zufall.
 */
export const mockCreditResult = (subject: CreditSubject): CreditResult => {
  const key = (subject.name ?? "").trim().toLowerCase();
  const score = stableHash(key);
  const rating = ratingFromScore(score);
  const decision = creditDecisionFromScore(score);
  const verdict =
    decision === "gruen"
      ? "gute Bonität"
      : decision === "gelb"
        ? "mittlere Bonität"
        : "schwache Bonität";
  const summary = `Demo-Auskunft (keine echte Prüfung): Score ${score}/100, Rating ${rating} — ${verdict}.`;
  return {
    provider: "mock",
    score,
    rating,
    decision,
    summary,
    raw: { demo: true, provider: "mock", score, rating, subject: subject.name },
  };
};

// ---------------------------------------------------------------------------
// Generischer REST-Adapter
// ---------------------------------------------------------------------------

/** Eine Zahl aus unbekanntem Feld defensiv lesen (akzeptiert auch Strings). */
const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return null;
};

/** Einen Score (0–100) aus üblichen Feldnamen einer REST-Antwort herauslesen. */
const extractScore = (data: Record<string, unknown>): number | null => {
  for (const k of ["score", "credit_score", "creditScore", "bonität", "bonitaet", "value"]) {
    const n = num(data[k]);
    if (n != null) return Math.max(0, Math.min(100, Math.round(n)));
  }
  return null;
};

/** Ein Rating (Buchstabe/Klasse) aus üblichen Feldnamen herauslesen. */
const extractRating = (data: Record<string, unknown>): string | null => {
  for (const k of ["rating", "credit_rating", "creditRating", "klasse", "class", "grade"]) {
    const v = data[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
};

const runGenericAdapter = async (
  apiKey: string | null,
  apiUrl: string | null,
  subject: CreditSubject
): Promise<CreditResult> => {
  if (!apiUrl || !apiUrl.trim())
    throw new Error(
      "Keine API-URL für den generischen Bonitäts-Adapter hinterlegt. Bitte in den Einstellungen ergänzen."
    );

  let res: Response;
  try {
    res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(subject),
    });
  } catch {
    throw new Error("Der Bonitäts-Anbieter ist nicht erreichbar. Bitte später erneut versuchen.");
  }

  if (!res.ok)
    throw new Error(
      `Der Bonitäts-Anbieter hat einen Fehler gemeldet (HTTP ${res.status}).`
    );

  let data: Record<string, unknown>;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    throw new Error("Die Antwort des Bonitäts-Anbieters konnte nicht gelesen werden.");
  }

  const score = extractScore(data);
  const rating = extractRating(data);
  const decision = creditDecisionFromScore(score);
  const summary =
    score != null
      ? `Bonitätsauskunft (generischer Adapter): Score ${score}/100${rating ? `, Rating ${rating}` : ""}.`
      : "Bonitätsauskunft (generischer Adapter): kein Score in der Antwort enthalten.";

  return { provider: "generic", score, rating, decision, summary, raw: data };
};

// ---------------------------------------------------------------------------
// Einstieg
// ---------------------------------------------------------------------------

export const runCreditCheck = async (opts: {
  provider: string | null;
  apiKey: string | null;
  apiUrl: string | null;
  subject: CreditSubject;
}): Promise<CreditResult> => {
  const provider = (opts.provider ?? "").trim().toLowerCase();

  if (!provider || provider === "mock") return mockCreditResult(opts.subject);

  if (provider === "generic")
    return runGenericAdapter(opts.apiKey, opts.apiUrl, opts.subject);

  if (provider === "schufa" || provider === "creditreform" || provider === "crif")
    throw new Error(
      `Adapter für ${provider} ist noch nicht verdrahtet. Bitte API-Zugang hinterlegen oder den generischen Adapter nutzen.`
    );

  throw new Error(`Unbekannter Bonitäts-Anbieter: ${provider}.`);
};
