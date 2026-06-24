import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import {
  PORTAL_COOKIE,
  REFRESH_COOKIE,
  checkRateLimit,
  createSession,
  ipFromHeaders,
  portalCookieOptions,
  portalRefreshCookieOptions,
  resetRateLimit,
  verifyPassword,
} from "@/lib/portal-auth";

export const POST = async (req: Request) => {
  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ error: "E-Mail und Passwort erforderlich" }, { status: 400 });
  }

  // Rate-Limit pro IP+Email: 5 Versuche / Minute
  const ip = ipFromHeaders();
  const limit = checkRateLimit(`portal-login:${ip}:${email}`, 5, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Zu viele Versuche. Bitte in ${limit.retry_after_s}s erneut probieren.` },
      { status: 429 }
    );
  }

  const admin = createAdminClient();
  // customer_logins ist UNIQUE(org_id, email) — dieselbe E-Mail kann also in
  // MEHREREN Orgs existieren. Ohne Org-Kontext im Login-Request laden wir ALLE
  // aktiven Treffer und verifizieren das Passwort gegen jeden Kandidaten. Der
  // ERSTE Treffer mit passendem Passwort bestimmt die Session. So sperren sich
  // gleichnamige Kunden zweier Orgs nicht gegenseitig aus (maybeSingle würde bei
  // 2 Zeilen einen Fehler werfen). Es wird nicht verraten, in welcher Org der
  // Account liegt.
  const { data: logins } = await admin
    .from("customer_logins")
    .select("id, customer_id, org_id, email, password_hash, active")
    .eq("email", email)
    .eq("active", true);

  let login: NonNullable<typeof logins>[number] | null = null;
  for (const candidate of logins ?? []) {
    if (!candidate.password_hash) continue;
    if (await verifyPassword(password, candidate.password_hash)) {
      login = candidate;
      break;
    }
  }
  if (!login) {
    // Generische Fehlermeldung — verrät nicht, ob die E-Mail (in irgendeiner Org)
    // existiert.
    return NextResponse.json({ error: "E-Mail oder Passwort falsch" }, { status: 401 });
  }

  resetRateLimit(`portal-login:${ip}:${email}`);

  const { access, refresh } = await createSession(
    {
      id: login.id,
      customer_id: login.customer_id,
      org_id: login.org_id,
      email: login.email,
    },
    { userAgent: headers().get("user-agent"), ip }
  );

  await admin
    .from("customer_logins")
    .update({ last_login: new Date().toISOString() })
    .eq("id", login.id);

  // Cookies direkt auf der Response setzen (zuverlässiger als cookies().set()
  // in Route-Handlern unter Next 14).
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PORTAL_COOKIE, access, portalCookieOptions());
  res.cookies.set(REFRESH_COOKIE, refresh, portalRefreshCookieOptions());
  return res;
};
