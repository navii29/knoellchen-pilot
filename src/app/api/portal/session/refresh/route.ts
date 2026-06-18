import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import {
  PORTAL_COOKIE,
  REFRESH_COOKIE,
  hashRefresh,
  portalCookieOptions,
  portalRefreshCookieOptions,
  randomRefresh,
  signAccessToken,
} from "@/lib/portal-auth";

// Rotiert das Refresh-Token und stellt ein frisches Access-Token aus.
// (Admin-Client: läuft, wenn das Access-Token ggf. abgelaufen ist; portal_sessions
//  hat nur eine SELECT-RLS-Policy — siehe portal-auth Client-Note.)
export const POST = async () => {
  const refresh = cookies().get(REFRESH_COOKIE)?.value;
  if (!refresh) return NextResponse.json({ error: "Keine Session" }, { status: 401 });

  const admin = createAdminClient();
  const oldHash = hashRefresh(refresh);
  const { data: sess } = await admin
    .from("portal_sessions")
    .select("id, customer_id, org_id, login_id, expires_at, revoked_at")
    .eq("refresh_hash", oldHash)
    .maybeSingle();

  if (
    !sess ||
    sess.revoked_at ||
    new Date(sess.expires_at as string).getTime() < Date.now()
  ) {
    return NextResponse.json({ error: "Session ungültig" }, { status: 401 });
  }

  // Login muss noch aktiv sein — ein deaktivierter Login darf nicht weiter
  // refreshen (sonst überlebt eine Deaktivierung bis zum Refresh-Ablauf).
  const { data: login } = await admin
    .from("customer_logins")
    .select("email, active")
    .eq("id", sess.login_id)
    .maybeSingle();
  if (!login || !login.active) {
    return NextResponse.json({ error: "Session ungültig" }, { status: 401 });
  }

  const newRefresh = randomRefresh();
  // Atomare, bedingte Rotation: nur wenn der ALTE Hash noch gilt und die Session
  // nicht widerrufen ist. Schließt das Race-Fenster bei parallelen Refreshes —
  // der Verlierer bekommt 0 Zeilen und damit 401 (statt eine gültige Session zu
  // überschreiben).
  const { data: rotated } = await admin
    .from("portal_sessions")
    .update({ refresh_hash: hashRefresh(newRefresh), last_seen: new Date().toISOString() })
    .eq("id", sess.id)
    .eq("refresh_hash", oldHash)
    .is("revoked_at", null)
    .select("id");
  if (!rotated || rotated.length === 0) {
    return NextResponse.json({ error: "Session ungültig" }, { status: 401 });
  }

  const access = await signAccessToken({
    customer_id: sess.customer_id as string,
    org_id: sess.org_id as string,
    session_id: sess.id as string,
    email: login.email as string,
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(PORTAL_COOKIE, access, portalCookieOptions());
  res.cookies.set(REFRESH_COOKIE, newRefresh, portalRefreshCookieOptions());
  return res;
};
