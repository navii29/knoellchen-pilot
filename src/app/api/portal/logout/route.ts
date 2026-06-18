import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  PORTAL_COOKIE,
  REFRESH_COOKIE,
  portalCookieOptions,
  portalRefreshCookieOptions,
  revokeSession,
  verifyAccessToken,
} from "@/lib/portal-auth";

export const POST = async () => {
  // Aktuelle Session widerrufen (sofort tot), dann beide Cookies löschen.
  const token = cookies().get(PORTAL_COOKIE)?.value;
  if (token) {
    const claims = await verifyAccessToken(token);
    if (claims) await revokeSession(claims.session_id);
  }
  const res = NextResponse.json({ ok: true });
  // Mit denselben Optionen (insb. domain) löschen wie beim Set.
  res.cookies.set(PORTAL_COOKIE, "", { ...portalCookieOptions(), maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, "", { ...portalRefreshCookieOptions(), maxAge: 0 });
  return res;
};
