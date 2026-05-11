import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/server";

const trimOrNull = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
};

const ALLOWED = [
  "first_name",
  "last_name",
  "street",
  "house_nr",
  "zip",
  "city",
  "country",
  "email",
  "phone",
] as const;

export const PATCH = async (req: Request) => {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const update: Record<string, unknown> = {};
  for (const k of ALLOWED) {
    if (k in body) update[k] = trimOrNull(body[k]);
  }
  if (update.last_name === null) {
    return NextResponse.json({ error: "Nachname darf nicht leer sein" }, { status: 400 });
  }
  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("customers")
    .update(update)
    .eq("id", session.customer_id)
    .eq("org_id", session.org_id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, customer: data });
};
