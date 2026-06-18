import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getPortalSession, hashPassword, verifyPassword } from "@/lib/portal-auth";

// In-Session-Passwortänderung (Kunde ändert selbst, kein Operator nötig).
export const POST = async (req: Request) => {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    old_password?: string;
    new_password?: string;
  };
  const oldPw = body.old_password ?? "";
  const newPw = body.new_password ?? "";
  if (newPw.length < 8) {
    return NextResponse.json({ error: "Neues Passwort min. 8 Zeichen" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: login } = await admin
    .from("customer_logins")
    .select("id, password_hash")
    .eq("customer_id", session.customer_id)
    .eq("org_id", session.org_id)
    .eq("active", true)
    .maybeSingle();
  if (!login || !login.password_hash) {
    return NextResponse.json({ error: "Kein Passwort gesetzt" }, { status: 400 });
  }

  const ok = await verifyPassword(oldPw, login.password_hash);
  if (!ok) return NextResponse.json({ error: "Aktuelles Passwort falsch" }, { status: 401 });

  await admin
    .from("customer_logins")
    .update({ password_hash: await hashPassword(newPw) })
    .eq("id", login.id);

  // Andere Geräte/Sessions beenden; die aktuelle bleibt aktiv.
  await admin
    .from("portal_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("customer_id", session.customer_id)
    .neq("id", session.session_id)
    .is("revoked_at", null);

  return NextResponse.json({ ok: true });
};
