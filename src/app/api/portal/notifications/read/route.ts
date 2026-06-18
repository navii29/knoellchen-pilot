import { NextResponse } from "next/server";
import { requirePortal } from "@/lib/portal-auth";

// Markiert alle ungelesenen Benachrichtigungen des Kunden als gelesen.
// RLS-Update-Policy beschränkt auf die eigenen Zeilen.
export const POST = async () => {
  const ctx = await requirePortal();
  if (!ctx) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  await ctx.supa
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("customer_id", ctx.session.customer_id)
    .is("read_at", null);

  return NextResponse.json({ ok: true });
};
