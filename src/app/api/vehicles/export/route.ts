import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Vehicle } from "@/lib/types";

// CSV-Wert escapen (deutsches Excel: Semikolon-Trenner, UTF-8 mit BOM).
const esc = (v: unknown): string => {
  const s = v == null ? "" : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const GET = async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { data: profile } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 401 });
  const isOwner = (profile.role ?? "member") === "owner";

  const admin = createAdminClient();
  const { data } = await admin
    .from("vehicles")
    .select("*")
    .eq("org_id", profile.org_id)
    .order("plate", { ascending: true });
  const vehicles = (data ?? []) as Vehicle[];

  const cols: { key: keyof Vehicle; label: string }[] = [
    { key: "plate", label: "Kennzeichen" },
    { key: "manufacturer", label: "Hersteller" },
    { key: "model", label: "Modell" },
    { key: "vehicle_type", label: "Anzeige-Name" },
    { key: "category", label: "Geschäftslinie" },
    { key: "status", label: "Status" },
    { key: "color", label: "Farbe" },
    { key: "fuel_type", label: "Kraftstoff" },
    { key: "power_ps", label: "Leistung (PS)" },
    { key: "transmission", label: "Getriebe" },
    { key: "doors", label: "Türen" },
    { key: "seats", label: "Sitzplätze" },
    { key: "body_type", label: "Karosserie" },
    { key: "fin_number", label: "FIN" },
    { key: "hsn", label: "HSN" },
    { key: "tsn", label: "TSN" },
    { key: "first_registration", label: "Erstzulassung" },
    { key: "next_hu", label: "Nächste HU" },
    { key: "decommission_date", label: "Aussteuerung" },
    { key: "km_at_intake", label: "Km bei Einflottung" },
    { key: "max_km_total", label: "Max-km gesamt" },
    { key: "inclusive_km_month", label: "Inklusiv-km/Monat" },
    { key: "daily_rate", label: "Tagesmiete" },
    { key: "weekly_rate", label: "Wochenmiete" },
    { key: "monthly_rate", label: "Monatsmiete" },
    { key: "deposit", label: "Kaution" },
    // Kosten/Marge nur für Inhaber.
    ...(isOwner
      ? ([
          { key: "cost_monthly", label: "Kosten/Monat (EK)" },
          { key: "cost_daily", label: "Kosten/Tag (EK)" },
          { key: "target_daily_rate", label: "Soll-Tagespreis" },
        ] as { key: keyof Vehicle; label: string }[])
      : []),
  ];

  const header = cols.map((c) => esc(c.label)).join(";");
  const rows = vehicles.map((v) => cols.map((c) => esc(v[c.key])).join(";"));
  const csv = "﻿" + [header, ...rows].join("\r\n");

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fahrzeuge-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
};
