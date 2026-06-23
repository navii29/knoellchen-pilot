import type { SupabaseClient } from "@supabase/supabase-js";
import { inboundEmailFor, slugify } from "@/lib/slug";

const generateUniqueSlug = async (
  admin: SupabaseClient,
  base: string
): Promise<string> => {
  const root = slugify(base);
  let candidate = root;
  for (let i = 2; i < 100; i++) {
    const { data } = await admin
      .from("organizations")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${root}-${i}`;
  }
  return `${root}-${Date.now().toString(36)}`;
};

type BootstrapUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

type BootstrapResult =
  | { ok: true; org_id: string; created: boolean; slug?: string; inbound_email?: string }
  | { error: string };

/**
 * Legt für einen frisch registrierten Nutzer Organisation + Owner-Profil an.
 * Idempotent: existiert bereits ein Profil, passiert nichts (Rückgabe ok).
 * org_name/full_name kommen aus dem Override (Direkt-Registrierung) ODER aus den
 * user_metadata (nach E-Mail-Bestätigung im Auth-Callback — da gibt es keinen
 * Request-Body). Wird von /api/auth/bootstrap UND vom Auth-Callback genutzt.
 */
export const bootstrapOrgForUser = async (
  admin: SupabaseClient,
  user: BootstrapUser,
  override?: { orgName?: string | null; fullName?: string | null }
): Promise<BootstrapResult> => {
  const { data: existing } = await admin
    .from("users")
    .select("id, org_id")
    .eq("id", user.id)
    .maybeSingle();
  if (existing) return { ok: true, org_id: existing.org_id as string, created: false };

  const md = (user.user_metadata ?? {}) as Record<string, unknown>;
  const orgName = (
    override?.orgName ?? (typeof md.org_name === "string" ? md.org_name : "")
  )
    ?.toString()
    .trim();
  const fullName =
    (override?.fullName ?? (typeof md.full_name === "string" ? md.full_name : null))
      ?.toString()
      .trim() || null;
  if (!orgName) return { error: "org_name fehlt" };

  const slug = await generateUniqueSlug(admin, orgName);
  const inbound = inboundEmailFor(slug);

  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({
      name: orgName,
      email: user.email ?? null,
      processing_fee: 25,
      slug,
      inbound_email: inbound,
    })
    .select("id, slug")
    .single();
  if (orgErr) return { error: orgErr.message };

  const { error: userErr } = await admin.from("users").insert({
    id: user.id,
    org_id: org.id,
    full_name: fullName,
    email: user.email ?? null,
    role: "owner",
  });
  if (userErr) return { error: userErr.message };

  return {
    ok: true,
    org_id: org.id as string,
    created: true,
    slug: org.slug as string,
    inbound_email: inbound,
  };
};
