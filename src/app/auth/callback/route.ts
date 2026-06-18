import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth-Callback für Supabase: tauscht den Code (Passwort-Reset oder
 * E-Mail-Bestätigung) gegen eine Session und leitet weiter.
 *   - Passwort-Reset  → ?next=/reset  (neues Passwort setzen)
 *   - E-Mail bestätigt → /dashboard
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

  // next ist nur ein interner Pfad — niemals offene Weiterleitung erlauben.
  const safeNext = next.startsWith("/") ? next : "/dashboard";
  return NextResponse.redirect(new URL(safeNext, url.origin));
};
