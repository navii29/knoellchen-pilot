import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { bootstrapOrgForUser } from "@/lib/auth-bootstrap";

/**
 * Robuster Bestätigungs-Endpoint für E-Mail-Links (Passwort-Reset & Registrierung).
 * Nutzt token_hash + verifyOtp statt des PKCE-Code-Flows — funktioniert daher von
 * JEDEM Gerät/Browser (kein code_verifier nötig, der nur im anfordernden Browser
 * liegt). Die Mail-Vorlagen verlinken auf:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/dashboard
 */
export const GET = async (req: Request) => {
  const url = new URL(req.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next") || "/dashboard";
  // Open-Redirect verhindern: nur interne Pfade. Protokoll-relative URLs
  // (//evil.com, /\evil.com) werden vom Browser als externe Domain interpretiert.
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
      ? next
      : "/dashboard";

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL("/login?error=auth", url.origin));
  }

  const supabase = createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    return NextResponse.redirect(new URL("/login?error=auth", url.origin));
  }

  // Nach Bestätigung einer Neuregistrierung Org + Owner-Profil anlegen
  // (idempotent: beim Passwort-Reset existiert das Profil bereits → no-op).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await bootstrapOrgForUser(createAdminClient(), user).catch(() => undefined);
  }

  return NextResponse.redirect(new URL(safeNext, url.origin));
};
