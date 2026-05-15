import { NextResponse } from "next/server";
import { PORTAL_COOKIE, portalCookieOptions } from "@/lib/portal-auth";

export const POST = async () => {
  const res = NextResponse.json({ ok: true });
  // Mit denselben Optionen (insb. domain) löschen wie beim Set, sonst
  // legt der Browser ein zweites Cookie an und das alte bleibt aktiv.
  res.cookies.set(PORTAL_COOKIE, "", { ...portalCookieOptions(), maxAge: 0 });
  return res;
};
