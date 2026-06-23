import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { bootstrapOrgForUser } from "@/lib/auth-bootstrap";

/**
 * Auth-Callback für Supabase: tauscht den Code (Passwort-Reset oder
 * E-Mail-Bestätigung) gegen eine Session und leitet weiter.
 *   - Passwort-Reset  → ?next=/reset  (neues Passwort setzen)
 *   - E-Mail bestätigt → /dashboard (legt bei Bedarf Org + Owner-Profil an)
 */
export const GET = async (req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth", url.origin));
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=auth", url.origin));
  }

  // Nach E-Mail-Bestätigung einer Neuregistrierung gibt es noch kein Profil —
  // Org + Owner-Profil werden hier aus den user_metadata angelegt (idempotent:
  // bestehende Profile, z. B. beim Passwort-Reset, bleiben unberührt).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await bootstrapOrgForUser(createAdminClient(), user).catch(() => undefined);
  }

  // next ist nur ein interner Pfad — niemals offene Weiterleitung erlauben.
  // Protokoll-relative URLs (//evil.com, /\evil.com) ausschließen.
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
      ? next
      : "/dashboard";
  return NextResponse.redirect(new URL(safeNext, url.origin));
};
