import { NextResponse } from "next/server";
import {
  PORTAL_COOKIE,
  REFRESH_COOKIE,
  getPortalSession,
  portalCookieOptions,
  portalRefreshCookieOptions,
  revokeAllForCustomer,
} from "@/lib/portal-auth";

// Logout-everywhere: widerruft ALLE Sessions dieses Kunden (alle Geräte).
export const POST = async () => {
  const session = await getPortalSession();
  if (session) await revokeAllForCustomer(session.customer_id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PORTAL_COOKIE, "", { ...portalCookieOptions(), maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, "", { ...portalRefreshCookieOptions(), maxAge: 0 });
  return res;
};
