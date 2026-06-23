import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getMembership } from "@/lib/team";

// GET — Mitglieder der eigenen Organisation auflisten.
export const GET = async () => {
  const me = await getMembership();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("id, full_name, email, role, created_at, permissions")
    .eq("org_id", me.orgId)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    role: me.role,
    me: me.userId,
    members: data ?? [],
  });
};

// POST — Mitglied anlegen (nur Owner). Wir legen Auth-User + Passwort an;
// der Inhaber teilt die Zugangsdaten; das Mitglied kann das Passwort danach
// über "Passwort vergessen?" selbst ändern. (Kein E-Mail-Versand im Produkt.)
export const POST = async (req: Request) => {
  const me = await getMembership();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (me.role !== "owner") {
    return NextResponse.json(
      { error: "Nur Inhaber können Mitglieder hinzufügen." },
      { status: 403 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
    full_name?: string;
    role?: string;
  };
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const fullName = (body.full_name ?? "").trim() || null;
  const role = body.role === "owner" ? "owner" : "member";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Bitte eine gültige E-Mail-Adresse angeben." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Passwort muss mindestens 8 Zeichen lang sein." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Auth-User anlegen (bestätigt, damit sofort Login möglich ist).
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (cErr || !created?.user) {
    const msg = cErr?.message ?? "Konnte den Zugang nicht anlegen.";
    const friendly = /already.*registered|exists/i.test(msg)
      ? "Diese E-Mail-Adresse hat bereits ein Konto und kann nicht erneut angelegt werden."
      : msg;
    return NextResponse.json({ error: friendly }, { status: 409 });
  }

  // Profil in der eigenen Org anlegen.
  const { error: pErr } = await admin.from("users").insert({
    id: created.user.id,
    org_id: me.orgId,
    full_name: fullName,
    email,
    role,
  });
  if (pErr) {
    // Rollback: angelegten Auth-User wieder entfernen, sonst verwaister Account.
    await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: created.user.id, email, role });
};
