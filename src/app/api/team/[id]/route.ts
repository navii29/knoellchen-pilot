import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getMembership } from "@/lib/team";
import { sanitizePermissions } from "@/lib/permissions";

type Ctx = { params: { id: string } };

const ownerCount = async (
  admin: ReturnType<typeof createAdminClient>,
  orgId: string
): Promise<number> => {
  const { count } = await admin
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("role", "owner");
  return count ?? 0;
};

// PATCH — Rolle, Rechte und/oder Passwort eines Mitglieds ändern (nur Owner).
// Verhindert, dass der letzte Owner degradiert wird. Rechte (permissions) gelten
// nur für Mitarbeiter; Inhaber haben immer alle Rechte. Das Passwort-Reset
// erlaubt dem Inhaber, einem Mitarbeiter ohne E-Mail-Versand neue Zugangsdaten
// zu geben ("Passwort vergessen" benötigt SMTP, das oft nicht eingerichtet ist).
export const PATCH = async (req: Request, { params }: Ctx) => {
  const me = await getMembership();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (me.role !== "owner")
    return NextResponse.json({ error: "Nur Inhaber können Rollen/Rechte/Passwort ändern." }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    role?: string;
    permissions?: unknown;
    password?: unknown;
  };

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("users")
    .select("id, role")
    .eq("id", params.id)
    .eq("org_id", me.orgId)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: "Mitglied nicht gefunden" }, { status: 404 });

  // Passwort-Reset (Auth-User, org-geprüft über die target-Zeile oben).
  let passwordReset = false;
  if ("password" in body) {
    const pw = typeof body.password === "string" ? body.password : "";
    if (pw.length < 8)
      return NextResponse.json(
        { error: "Passwort muss mindestens 8 Zeichen lang sein." },
        { status: 400 }
      );
    const { error: pwErr } = await admin.auth.admin.updateUserById(params.id, {
      password: pw,
    });
    if (pwErr) return NextResponse.json({ error: pwErr.message }, { status: 500 });
    passwordReset = true;
  }

  const patch: Record<string, unknown> = {};

  if ("role" in body) {
    const role = body.role === "owner" ? "owner" : "member";
    if (target.role === "owner" && role === "member" && (await ownerCount(admin, me.orgId)) <= 1) {
      return NextResponse.json(
        { error: "Die Organisation braucht mindestens einen Inhaber." },
        { status: 400 }
      );
    }
    patch.role = role;
  }

  if ("permissions" in body) {
    patch.permissions = sanitizePermissions(body.permissions);
  }

  if (Object.keys(patch).length === 0 && !passwordReset)
    return NextResponse.json({ error: "Nichts zu ändern." }, { status: 400 });

  if (Object.keys(patch).length > 0) {
    const { error } = await admin
      .from("users")
      .update(patch)
      .eq("id", params.id)
      .eq("org_id", me.orgId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...patch, ...(passwordReset ? { password_reset: true } : {}) });
};

// DELETE — Mitglied entfernen (nur Owner). Kein Selbst-Entfernen, kein letzter Owner.
export const DELETE = async (_req: Request, { params }: Ctx) => {
  const me = await getMembership();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (me.role !== "owner")
    return NextResponse.json({ error: "Nur Inhaber können Mitglieder entfernen." }, { status: 403 });
  if (params.id === me.userId)
    return NextResponse.json(
      { error: "Sie können sich nicht selbst entfernen. Nutzen Sie dafür die Konto-Löschung." },
      { status: 400 }
    );

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("users")
    .select("id, role")
    .eq("id", params.id)
    .eq("org_id", me.orgId)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: "Mitglied nicht gefunden" }, { status: 404 });

  if (target.role === "owner" && (await ownerCount(admin, me.orgId)) <= 1) {
    return NextResponse.json(
      { error: "Der letzte Inhaber kann nicht entfernt werden." },
      { status: 400 }
    );
  }

  // Profil entfernen, dann den Auth-User.
  const { error: pErr } = await admin
    .from("users")
    .delete()
    .eq("id", params.id)
    .eq("org_id", me.orgId);
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
  await admin.auth.admin.deleteUser(params.id).catch(() => {});

  return NextResponse.json({ ok: true });
};
