import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { inboundEmailFor, slugify } from "@/lib/slug";

type Admin = ReturnType<typeof createAdminClient>;

const generateUniqueSlug = async (admin: Admin, base: string): Promise<string> => {
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

export type BootstrapResult = {
  org_id: string;
  slug: string;
  inbound_email: string;
  created: boolean;
};

/**
 * Stellt sicher, dass für den angemeldeten User eine Organisation + users-Row
 * existiert. Idempotent: existiert die Row bereits, wird sie nur zurückgegeben.
 *
 * org_name / full_name kommen entweder explizit (Register-Formular) oder als
 * Fallback aus user.user_metadata (gesetzt beim signUp) — so funktioniert der
 * Bootstrap sowohl im Direkt-Login-Flow als auch im E-Mail-Bestätigungs-Callback.
 */
export const ensureOrgForUser = async (
  user: User,
  opts?: { orgName?: string; fullName?: string | null }
): Promise<BootstrapResult> => {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("users")
    .select("id, org_id")
    .eq("id", user.id)
    .maybeSingle();
  if (existing) {
    const { data: org } = await admin
      .from("organizations")
      .select("slug, inbound_email")
      .eq("id", existing.org_id)
      .maybeSingle();
    return {
      org_id: existing.org_id as string,
      slug: (org?.slug as string) ?? "",
      inbound_email: (org?.inbound_email as string) ?? "",
      created: false,
    };
  }

  const meta = (user.user_metadata ?? {}) as { org_name?: string; full_name?: string };
  const orgName = (opts?.orgName ?? meta.org_name ?? "").trim();
  const fullName = opts?.fullName ?? meta.full_name ?? null;
  if (!orgName) throw new Error("org_name fehlt");

  const slug = await generateUniqueSlug(admin, orgName);
  const inbound = inboundEmailFor(slug);

  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({
      name: orgName,
      email: user.email,
      processing_fee: 25,
      slug,
      inbound_email: inbound,
    })
    .select("id, slug")
    .single();
  if (orgErr) throw new Error(orgErr.message);

  const { error: userErr } = await admin.from("users").insert({
    id: user.id,
    org_id: org.id,
    full_name: fullName,
    role: "owner",
  });
  if (userErr) throw new Error(userErr.message);

  return {
    org_id: org.id as string,
    slug: org.slug as string,
    inbound_email: inbound,
    created: true,
  };
};
