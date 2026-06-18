import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { createMagicToken, portalBaseUrl } from "@/lib/portal-auth";

const requireAuth = async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();
  return profile ? { user, org_id: profile.org_id } : null;
};

type Ctx = { params: { id: string } };

/**
 * Erzeugt einen Auto-Login-Link für den Mieter zum Vertrag und gibt ihn zurück.
 * Kein E-Mail-Versand mehr — der Betrieb kopiert den Link und teilt ihn über
 * den eigenen Kanal (WhatsApp, eigene E-Mail, SMS). Der Link loggt den Mieter
 * per Single-Use-Magic-Token (24h gültig) automatisch ein und führt zum Vertrag.
 */
export const POST = async (_req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data: contract } = await admin
    .from("contracts")
    .select("id, contract_nr, customer_id")
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!contract)
    return NextResponse.json({ error: "Vertrag nicht gefunden" }, { status: 404 });
  if (!contract.customer_id)
    return NextResponse.json(
      { error: "Vertrag ist keinem Kundenkonto zugeordnet. Bitte zuerst einen Kunden eintragen." },
      { status: 400 }
    );

  const { data: login } = await admin
    .from("customer_logins")
    .select("id")
    .eq("org_id", auth.org_id)
    .eq("customer_id", contract.customer_id)
    .eq("active", true)
    .maybeSingle();
  if (!login)
    return NextResponse.json(
      {
        error:
          "Kein Portal-Zugang für diesen Kunden. Bitte zuerst unter Kunden einen Portal-Zugang anlegen.",
      },
      { status: 400 }
    );

  const { token, expires } = createMagicToken();
  const { error } = await admin
    .from("customer_logins")
    .update({ magic_token: token, magic_token_expires: expires.toISOString() })
    .eq("id", login.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const link = `${portalBaseUrl()}/api/portal/magic?token=${token}`;
  return NextResponse.json({ ok: true, link, expires_at: expires.toISOString() });
};
