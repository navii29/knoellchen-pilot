// Listet existierende Orgs und legt — falls genau eine existiert —
// Test-Fahrzeug + Test-Buchung passend zum generierten Anhörungsbogen an.
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE env vars in .env.local");
  process.exit(1);
}

const supa = createClient(url, key, { auth: { persistSession: false } });

const TEST_DATA = {
  vehicle: {
    plate: "M-KP 2847",
    vehicle_type: "VW Golf VIII",
    color: "weiß",
  },
  booking: {
    plate: "M-KP 2847",
    renter_name: "Anna Schmidt",
    renter_email: "anna.schmidt@example.de",
    renter_address: "Maximilianstraße 14, 80539 München",
    renter_phone: "+49 151 23456789",
    renter_birthday: "1989-06-12",
    renter_license: "B 0123456789",
    pickup_date: "2026-04-14",
    return_date: "2026-04-16",
  },
};

(async () => {
  const { data: orgs, error } = await supa
    .from("organizations")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("DB-Fehler:", error.message);
    console.error(
      "  → Hast du das supabase-schema.sql in Supabase eingespielt?"
    );
    process.exit(1);
  }

  if (!orgs || orgs.length === 0) {
    console.log("Noch keine Organisation in der Datenbank.");
    console.log("  → Bitte registriere dich erst auf http://localhost:3000/register");
    console.log("  → Danach dieses Script erneut ausführen: node scripts/seed-test-booking.js");
    process.exit(0);
  }

  const org = orgs[0];
  console.log(`Verwende Org: ${org.name} (${org.id})`);

  await supa
    .from("vehicles")
    .upsert(
      { org_id: org.id, ...TEST_DATA.vehicle },
      { onConflict: "org_id,plate" }
    );

  const { data: existing } = await supa
    .from("bookings")
    .select("id")
    .eq("org_id", org.id)
    .eq("plate", TEST_DATA.booking.plate)
    .eq("pickup_date", TEST_DATA.booking.pickup_date)
    .maybeSingle();

  if (existing) {
    console.log("→ Test-Buchung existiert bereits (id=" + existing.id + ")");
  } else {
    const { data, error: insertErr } = await supa
      .from("bookings")
      .insert({ org_id: org.id, ...TEST_DATA.booking })
      .select("id")
      .single();
    if (insertErr) {
      console.error("Insert-Fehler:", insertErr.message);
      process.exit(1);
    }
    console.log("✓ Test-Buchung angelegt (id=" + data.id + ")");
  }

  console.log("");
  console.log("Buchungs-Daten:");
  console.table(TEST_DATA.booking);
  console.log("");
  console.log("→ Lade jetzt /tmp/teststrafzettel.pdf hoch:");
  console.log("  http://localhost:3000/dashboard/upload");
})();
