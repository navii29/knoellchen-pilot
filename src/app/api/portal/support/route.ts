import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getPortalSession } from "@/lib/portal-auth";

// Supportnachricht des Kunden an die Vermietung.
export const POST = async (req: Request) => {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { message?: string };
  const message = (body.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "Nachricht fehlt" }, { status: 400 });
  if (message.length > 4000)
    return NextResponse.json({ error: "Nachricht zu lang" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("support_messages").insert({
    customer_id: session.customer_id,
    org_id: session.org_id,
    message,
    status: "offen",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
};
