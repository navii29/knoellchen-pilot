import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseMarkReadBody } from "@/lib/operator-notify-ui";

// Operator-Benachrichtigungen: Ungelesen-Zähler (GET) + als-gelesen-markieren
// (POST). BEIDE über den RLS-Operator-Client (createClient), NIE über admin —
// die Policy "Operator notifications by org" (org_id = current_org_id(),
// Migration 067) ist die einzige Mandanten-Grenze. Reine Anzeige/Lese-Funktion:
// es wird ausschließlich read_at gesetzt, KEINE contract_extensions/Verträge.

const requireUser = async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? supabase : null;
};

// GET → { unread }: Anzahl ungelesener Benachrichtigungen der eigenen Org
// (RLS-scoped, kein manueller org_id-Filter nötig).
export const GET = async () => {
  const supabase = await requireUser();
  if (!supabase) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { count } = await supabase
    .from("operator_notifications")
    .select("*", { count: "exact", head: true })
    .is("read_at", null);

  return NextResponse.json({ unread: count ?? 0 });
};

// POST → markiert read_at. Body { id } markiert genau diesen Eintrag, sonst alle
// ungelesenen. RLS begrenzt den Update auf die eigene Org.
export const POST = async (req: Request) => {
  const supabase = await requireUser();
  if (!supabase) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = parseMarkReadBody(await req.json().catch(() => ({})));

  let q = supabase
    .from("operator_notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (id) q = q.eq("id", id);

  const { error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
};
