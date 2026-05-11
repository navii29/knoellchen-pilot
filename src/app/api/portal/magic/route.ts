import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  portalBaseUrl,
  setSessionCookie,
  signSessionToken,
} from "@/lib/portal-auth";

export const GET = async (req: Request) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(`${portalBaseUrl()}/portal/login?error=invalid`);
  }

  const admin = createAdminClient();
  const { data: login } = await admin
    .from("customer_logins")
    .select("id, customer_id, org_id, email, magic_token_expires, active")
    .eq("magic_token", token)
    .eq("active", true)
    .maybeSingle();

  if (!login || !login.magic_token_expires) {
    return NextResponse.redirect(`${portalBaseUrl()}/portal/login?error=invalid`);
  }
  if (new Date(login.magic_token_expires).getTime() < Date.now()) {
    return NextResponse.redirect(`${portalBaseUrl()}/portal/login?error=expired`);
  }

  // Token verbrauchen (Single-Use)
  await admin
    .from("customer_logins")
    .update({
      magic_token: null,
      magic_token_expires: null,
      last_login: new Date().toISOString(),
    })
    .eq("id", login.id);

  const sessionToken = await signSessionToken({
    customer_id: login.customer_id,
    org_id: login.org_id,
    email: login.email,
  });
  setSessionCookie(sessionToken);

  return NextResponse.redirect(`${portalBaseUrl()}/portal/dashboard`);
};
