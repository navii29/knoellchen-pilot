import { createClient } from "@/lib/supabase/server";

// Helfer für Bulk-Aktionen aus den Dashboard-Listen.

// org_id des eingeloggten Dashboard-Users (RLS-Client für die Auth-Prüfung).
export const orgFromSession = async (): Promise<string | null> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();
  return profile ? (profile.org_id as string) : null;
};

// ids[] aus einem Request-Body säubern: nur Strings, dedupliziert.
export const parseIdList = (body: unknown): string[] => {
  const ids = (body as { ids?: unknown })?.ids;
  return Array.isArray(ids)
    ? Array.from(new Set(ids.filter((x): x is string => typeof x === "string")))
    : [];
};

export const MAX_BULK = 1000;
