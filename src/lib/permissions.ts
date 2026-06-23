// Frei konfigurierbare Mitarbeiter-Rechte (Migration 054).
//
// Der Inhaber (role='owner') hat IMMER alle Rechte. Für Mitarbeiter pflegt der
// Inhaber pro Person eine Rechte-Liste (users.permissions). Margen/Kosten/Partner
// sind BEWUSST nicht in diesem Katalog — sie bleiben strikt owner-only und sind
// nicht über die Rechte-Matrix vergebbar.

export type PermissionKey =
  | "settings"
  | "create_master_data"
  | "delete"
  | "import_export"
  | "monitoring";

export const PERMISSION_CATALOG: {
  key: PermissionKey;
  label: string;
  description: string;
}[] = [
  {
    key: "settings",
    label: "Einstellungen",
    description: "Zugriff auf den Einstellungen-Bereich.",
  },
  {
    key: "create_master_data",
    label: "Stammdaten anlegen",
    description: "Fahrzeuge & Kunden neu anlegen.",
  },
  {
    key: "delete",
    label: "Löschen",
    description: "Fahrzeuge, Kunden und Verträge löschen.",
  },
  {
    key: "import_export",
    label: "CSV-Import / Export",
    description: "Massen-Import und Export von Fahrzeugen/Kunden.",
  },
  {
    key: "monitoring",
    label: "Überwachung",
    description: "Überwachungs-Dashboard (Mitarbeiter-Aktivität).",
  },
];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_CATALOG.map(
  (p) => p.key
);

// Standard-Rechte eines Mitarbeiters (= bisherige Reichweite ohne owner-only).
// 'monitoring' ist standardmäßig nicht dabei.
export const MEMBER_DEFAULT_PERMISSIONS: PermissionKey[] = [
  "settings",
  "create_master_data",
  "delete",
  "import_export",
];

const isPermissionKey = (v: unknown): v is PermissionKey =>
  typeof v === "string" && (ALL_PERMISSION_KEYS as string[]).includes(v);

/** Eingehende Rechte-Liste säubern: nur bekannte Keys, dedupliziert. */
export const sanitizePermissions = (input: unknown): PermissionKey[] => {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.filter(isPermissionKey))];
};

/**
 * Hat der Nutzer das Recht? Inhaber (owner) immer; sonst muss der Key in der
 * Rechte-Liste stehen. Sichere Default: kein Recht.
 */
export const hasPermission = (
  m: { role?: string | null; permissions?: string[] | null } | null | undefined,
  key: PermissionKey
): boolean => {
  if (!m) return false;
  if (m.role === "owner") return true;
  return Array.isArray(m.permissions) && m.permissions.includes(key);
};
