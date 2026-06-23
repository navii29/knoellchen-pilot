import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasPermission, type PermissionKey } from "@/lib/permissions";

export type Membership = {
  userId: string;
  orgId: string;
  role: string; // 'owner' | 'member'
  permissions: string[]; // frei konfigurierbare Rechte (owner: implizit alle)
};

/** Aktuelle Org-Mitgliedschaft des eingeloggten Dashboard-Nutzers. */
export const getMembership = async (): Promise<Membership | null> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("users")
    .select("org_id, role, permissions")
    .eq("id", user.id)
    .single();
  if (!profile) return null;
  return {
    userId: user.id,
    orgId: profile.org_id,
    role: profile.role ?? "member",
    permissions: Array.isArray(profile.permissions) ? profile.permissions : [],
  };
};

/** Rolle des aktuellen Nutzers ('owner' | 'member'); 'member' als sichere Default. */
export const myRole = async (): Promise<string> =>
  (await getMembership())?.role ?? "member";

/** Hat der aktuelle Nutzer das angegebene Recht? (Inhaber immer.) */
export const can = async (key: PermissionKey): Promise<boolean> =>
  hasPermission(await getMembership(), key);

/**
 * Rechte-Gate für API-Routen:
 *   const gate = await requirePermission("delete");
 *   if (!gate.ok) return gate.res;
 */
export const requirePermission = async (
  key: PermissionKey
): Promise<{ ok: true; m: Membership } | { ok: false; res: NextResponse }> => {
  const m = await getMembership();
  if (!m)
    return { ok: false, res: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  if (!hasPermission(m, key))
    return {
      ok: false,
      res: NextResponse.json({ error: "Keine Berechtigung für diese Aktion." }, { status: 403 }),
    };
  return { ok: true, m };
};

/**
 * Rechte-Gate für Server-Component-Seiten: leitet Nutzer ohne das Recht auf
 * /dashboard um.
 */
export const requirePermissionPage = async (
  key: PermissionKey
): Promise<Membership> => {
  const m = await getMembership();
  if (!m) redirect("/login");
  if (!hasPermission(m, key)) redirect("/dashboard");
  return m;
};

/**
 * Owner-Gate für API-Routen. Verwendung:
 *   const gate = await ownerOnly();
 *   if (!gate.ok) return gate.res;
 *   // ab hier ist gate.m garantiert ein Inhaber
 */
export const ownerOnly = async (): Promise<
  { ok: true; m: Membership } | { ok: false; res: NextResponse }
> => {
  const m = await getMembership();
  if (!m)
    return { ok: false, res: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  if (m.role !== "owner")
    return {
      ok: false,
      res: NextResponse.json({ error: "Nur Inhaber dürfen das." }, { status: 403 }),
    };
  return { ok: true, m };
};

/**
 * Owner-Gate für Server-Component-Seiten: leitet Mitarbeiter auf /dashboard um.
 *   export default async function Page() { await requireOwnerPage(); ... }
 */
export const requireOwnerPage = async (): Promise<Membership> => {
  const m = await getMembership();
  if (!m) redirect("/login");
  if (m.role !== "owner") redirect("/dashboard");
  return m;
};
