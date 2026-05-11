import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/portal-auth";

export const POST = async () => {
  clearSessionCookie();
  return NextResponse.json({ ok: true });
};
