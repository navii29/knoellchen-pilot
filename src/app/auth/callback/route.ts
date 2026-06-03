import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureOrgForUser } from "@/lib/org-bootstrap";

export const dynamic = "force-dynamic";

/**
 * Landeziel des Supabase-Bestätigungslinks (emailRedirectTo).
 * Tauscht den ?code gegen eine Session, legt — falls noch nicht vorhanden —
 * Organisation + users-Row aus den signUp-Metadaten an und leitet ins
 * Dashboard weiter. Damit funktioniert der Signup-Flow sowohl MIT als auch
 * OHNE aktivierte E-Mail-Bestätigung in Supabase.
 */
export const GET = async (req: Request) => {
  const url = new URL(req.url);
  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || url.origin;
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await ensureOrgForUser(user).catch(() => null);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
};
