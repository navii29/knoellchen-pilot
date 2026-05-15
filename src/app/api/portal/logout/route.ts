import { NextResponse } from "next/server";
import { PORTAL_COOKIE } from "@/lib/portal-auth";

export const POST = async () => {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PORTAL_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
};
