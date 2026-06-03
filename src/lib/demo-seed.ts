import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";

// Erzeugt eine realistische, fiktive Beispiel-Vermietung, damit ein frisch
// registrierter Trial-Account sofort ein lebendiges Dashboard sieht (volle
// Flotte, laufende Verträge, Strafzettel in allen Status, Marge, Preisregeln,
// Alerts). Alle Daten sind erfunden — keine echten Kennzeichen/Behörden-
// Bankdaten. Erzeugte Zeilen-IDs werden in organizations.demo_data abgelegt,
// damit "Beispieldaten entfernen" sie zielgenau wieder löscht.

export type DemoData = Record<string, string[]>;

const TABLES_DELETE_ORDER = [
  "ticket_logs",
  "tickets",
  "damage_reports",
  "vehicle_tires",
  "vehicle_events",
  "contracts",
  "pricing_rules",
  "customers",
  "vehicles",
] as const;

export type SeedOutcome = { seeded: boolean; reason?: string };

export const seedDemoData = async (orgId: string): Promise<SeedOutcome> => {
  const admin = createAdminClient();

  const { data: org } = await admin
    .from("organizations")
    .select("demo_seeded")
    .eq("id", orgId)
    .maybeSingle();
  if (!org) return { seeded: false, reason: "org-not-found" };
  if ((org as { demo_seeded?: boolean }).demo_seeded) {
    return { seeded: false, reason: "already-seeded" };
  }

  // Keine Beispieldaten über echte Daten kippen.
  const [{ count: tCount }, { count: cCount }] = await Promise.all([
    admin.from("tickets").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    admin.from("contracts").select("id", { count: "exact", head: true }).eq("org_id", orgId),
  ]);
  if ((tCount ?? 0) > 0 || (cCount ?? 0) > 0) {
    return { seeded: false, reason: "has-data" };
  }

  const now = new Date();
  const d = (offsetDays: number) => {
    const x = new Date(now);
    x.setDate(x.getDate() + offsetDays);
    return x.toISOString().slice(0, 10);
  };
  const ts = (offsetDays: number) => {
    const x = new Date(now);
    x.setDate(x.getDate() + offsetDays);
    return x.toISOString();
  };

  const vid = Array.from({ length: 8 }, () => randomUUID());
  const cuid = Array.from({ length: 6 }, () => randomUUID());
  const coid = Array.from({ length: 9 }, () => randomUUID());
  const tid = Array.from({ length: 8 }, () => randomUUID());
  const lid = Array.from({ length: 11 }, () => randomUUID());
  const drid = [randomUUID(), randomUUID()];
  const prid = [randomUUID(), randomUUID(), randomUUID()];
  const veid = [randomUUID()];
  const trid = [randomUUID(), randomUUID()];

  const ids: DemoData = {
    vehicles: vid,
    customers: cuid,
    contracts: coid,
    tickets: tid,
    ticket_logs: lid,
    damage_reports: drid,
    pricing_rules: prid,
    vehicle_events: veid,
    vehicle_tires: trid,
  };

  // vehicle_type wird per Trigger aus manufacturer/model gebaut.
  // decommission_date ist eine generierte Spalte (first_registration + 180) —
  // niemals direkt setzen; stattdessen first_registration zurückdatieren.
  const vehicles = [
    { id: vid[0], org_id: orgId, plate: "M-AB 1234", manufacturer: "VW", model: "Golf VIII", color: "Schwarz", status: "aktiv", category: "Kompaktklasse", first_registration: d(-700), power_ps: 150, fuel_type: "Diesel", transmission: "Automatik", seats: 5, km_at_intake: 18200, daily_rate: 59, base_daily_rate: 59, weekly_rate: 349, monthly_rate: 1190, deposit: 500, cost_daily: 21, cost_monthly: 430, target_daily_rate: 65 },
    { id: vid[1], org_id: orgId, plate: "M-CD 5678", manufacturer: "Audi", model: "A4 Avant", color: "Grau", status: "aktiv", category: "Mittelklasse", first_registration: d(-540), power_ps: 204, fuel_type: "Diesel", transmission: "Automatik", seats: 5, km_at_intake: 9400, daily_rate: 79, base_daily_rate: 79, weekly_rate: 469, monthly_rate: 1590, deposit: 800, cost_daily: 28, cost_monthly: 560, target_daily_rate: 89 },
    { id: vid[2], org_id: orgId, plate: "M-EF 9012", manufacturer: "BMW", model: "320i", color: "Weiß", status: "aktiv", category: "Mittelklasse", first_registration: d(-400), power_ps: 184, fuel_type: "Benzin", transmission: "Automatik", seats: 5, km_at_intake: 12750, daily_rate: 75, base_daily_rate: 75, weekly_rate: 449, monthly_rate: 1490, deposit: 800, cost_daily: 27, cost_monthly: 540, target_daily_rate: 85 },
    { id: vid[3], org_id: orgId, plate: "M-GH 3456", manufacturer: "Mercedes-Benz", model: "C 200", color: "Silber", status: "aktiv", category: "Mittelklasse", first_registration: d(-620), power_ps: 204, fuel_type: "Benzin", transmission: "Automatik", seats: 5, km_at_intake: 21100, daily_rate: 82, base_daily_rate: 82, deposit: 900, cost_daily: 29, cost_monthly: 580, target_daily_rate: 92 },
    { id: vid[4], org_id: orgId, plate: "M-IJ 7890", manufacturer: "VW", model: "Passat Variant", color: "Blau", status: "aktiv", category: "Mittelklasse", first_registration: d(-480), power_ps: 150, fuel_type: "Diesel", transmission: "Schaltgetriebe", seats: 5, km_at_intake: 33400, daily_rate: 65, base_daily_rate: 65, deposit: 600, cost_daily: 23, cost_monthly: 470, target_daily_rate: 72 },
    { id: vid[5], org_id: orgId, plate: "M-KL 2468", manufacturer: "Škoda", model: "Octavia", color: "Rot", status: "werkstatt", category: "Kompaktklasse", first_registration: d(-820), power_ps: 150, fuel_type: "Diesel", transmission: "Automatik", seats: 5, km_at_intake: 48900, daily_rate: 55, base_daily_rate: 55, deposit: 500, cost_daily: 20, cost_monthly: 410, target_daily_rate: 60 },
    { id: vid[6], org_id: orgId, plate: "M-MN 1357", manufacturer: "Tesla", model: "Model 3", color: "Weiß", status: "aktiv", category: "Oberklasse", first_registration: d(-168), power_ps: 283, fuel_type: "Elektro", transmission: "Automatik", seats: 5, km_at_intake: 5200, daily_rate: 99, base_daily_rate: 99, deposit: 1000, cost_daily: 31, cost_monthly: 640, target_daily_rate: 115 },
    { id: vid[7], org_id: orgId, plate: "M-OP 8642", manufacturer: "Fiat", model: "500", color: "Türkis", status: "aktiv", category: "Kleinwagen", first_registration: d(-900), power_ps: 69, fuel_type: "Benzin", transmission: "Schaltgetriebe", seats: 4, km_at_intake: 27600, daily_rate: 39, base_daily_rate: 39, deposit: 300, cost_daily: 14, cost_monthly: 300, target_daily_rate: 45 },
  ];

  const customers = [
    { id: cuid[0], org_id: orgId, salutation: "Herr", first_name: "Stefan", last_name: "Müller", birthday: "1985-04-12", street: "Leopoldstraße", house_nr: "45", zip: "80802", city: "München", country: "Deutschland", email: "s.mueller@example.de", phone: "+49 89 1200501", license_nr: "B0123456789", license_class: "B", license_expiry: "2031-04-11" },
    { id: cuid[1], org_id: orgId, salutation: "Frau", first_name: "Tanja", last_name: "Schmidt", birthday: "1990-09-23", street: "Sendlinger Straße", house_nr: "12", zip: "80331", city: "München", country: "Deutschland", email: "t.schmidt@example.de", phone: "+49 89 1200502", license_nr: "B0987654321", license_class: "B", license_expiry: "2029-08-01" },
    { id: cuid[2], org_id: orgId, salutation: "Herr", first_name: "Lukas", last_name: "Weber", birthday: "1982-01-30", street: "Türkenstraße", house_nr: "78", zip: "80799", city: "München", country: "Deutschland", email: "l.weber@example.de", phone: "+49 89 1200503", license_nr: "B0456712389", license_class: "B", license_expiry: "2027-12-15" },
    { id: cuid[3], org_id: orgId, salutation: "Frau", first_name: "Maria", last_name: "Wagner", birthday: "1995-06-17", street: "Schwanthalerstraße", house_nr: "3", zip: "80336", city: "München", country: "Deutschland", email: "m.wagner@example.de", phone: "+49 89 1200504", license_nr: "B0654329871", license_class: "B", license_expiry: "2030-05-20" },
    { id: cuid[4], org_id: orgId, salutation: "Herr", first_name: "Peter", last_name: "Becker", birthday: "1978-11-05", street: "Maximilianstraße", house_nr: "22", zip: "80539", city: "München", country: "Deutschland", email: "p.becker@example.de", phone: "+49 89 1200505", license_nr: "B0789123456", license_class: "B", license_expiry: "2028-03-09" },
    { id: cuid[5], org_id: orgId, salutation: "Herr", first_name: "Jonas", last_name: "Hofmann", birthday: "1992-02-28", street: "Rosenheimer Straße", house_nr: "101", zip: "81667", city: "München", country: "Deutschland", email: "j.hofmann@example.de", phone: "+49 89 1200506", license_nr: "B0321987654", license_class: "B", license_expiry: "2032-01-19" },
  ];

  // 5 laufende (aktiv, Zeitraum umfasst heute) + 4 abgeschlossene (Historie).
  const contracts = [
    { id: coid[0], org_id: orgId, contract_nr: "MV-2026-0001", vehicle_id: vid[0], customer_id: cuid[0], plate: "M-AB 1234", vehicle_type: "VW Golf VIII", renter_name: "Stefan Müller", renter_email: "s.mueller@example.de", pickup_date: d(-10), return_date: d(4), daily_rate: 59, total_amount: 826, deposit: 500, status: "aktiv", created_at: ts(-10), updated_at: ts(-10) },
    { id: coid[1], org_id: orgId, contract_nr: "MV-2026-0002", vehicle_id: vid[1], customer_id: cuid[1], plate: "M-CD 5678", vehicle_type: "Audi A4 Avant", renter_name: "Tanja Schmidt", renter_email: "t.schmidt@example.de", pickup_date: d(-6), return_date: d(8), daily_rate: 79, total_amount: 1106, deposit: 800, status: "aktiv", created_at: ts(-6), updated_at: ts(-6) },
    { id: coid[2], org_id: orgId, contract_nr: "MV-2026-0003", vehicle_id: vid[2], customer_id: cuid[2], plate: "M-EF 9012", vehicle_type: "BMW 320i", renter_name: "Lukas Weber", renter_email: "l.weber@example.de", pickup_date: d(-3), return_date: d(11), daily_rate: 75, total_amount: 1050, deposit: 800, status: "aktiv", created_at: ts(-3), updated_at: ts(-3) },
    { id: coid[3], org_id: orgId, contract_nr: "MV-2026-0004", vehicle_id: vid[3], customer_id: cuid[3], plate: "M-GH 3456", vehicle_type: "Mercedes-Benz C 200", renter_name: "Maria Wagner", renter_email: "m.wagner@example.de", pickup_date: d(-1), return_date: d(6), daily_rate: 82, total_amount: 574, deposit: 900, status: "aktiv", created_at: ts(-1), updated_at: ts(-1) },
    { id: coid[4], org_id: orgId, contract_nr: "MV-2026-0005", vehicle_id: vid[6], customer_id: cuid[4], plate: "M-MN 1357", vehicle_type: "Tesla Model 3", renter_name: "Peter Becker", renter_email: "p.becker@example.de", pickup_date: d(-2), return_date: d(5), daily_rate: 99, total_amount: 693, deposit: 1000, status: "aktiv", created_at: ts(-2), updated_at: ts(-2) },
    { id: coid[5], org_id: orgId, contract_nr: "MV-2026-0006", vehicle_id: vid[4], customer_id: cuid[5], plate: "M-IJ 7890", vehicle_type: "VW Passat Variant", renter_name: "Jonas Hofmann", renter_email: "j.hofmann@example.de", pickup_date: d(-40), return_date: d(-26), actual_return_date: d(-26), daily_rate: 65, total_amount: 910, deposit: 600, status: "abgeschlossen", created_at: ts(-40), updated_at: ts(-26) },
    { id: coid[6], org_id: orgId, contract_nr: "MV-2026-0007", vehicle_id: vid[0], customer_id: cuid[1], plate: "M-AB 1234", vehicle_type: "VW Golf VIII", renter_name: "Tanja Schmidt", renter_email: "t.schmidt@example.de", pickup_date: d(-60), return_date: d(-50), actual_return_date: d(-50), daily_rate: 59, total_amount: 590, deposit: 500, status: "abgeschlossen", created_at: ts(-60), updated_at: ts(-50) },
    { id: coid[7], org_id: orgId, contract_nr: "MV-2026-0008", vehicle_id: vid[7], customer_id: cuid[0], plate: "M-OP 8642", vehicle_type: "Fiat 500", renter_name: "Stefan Müller", renter_email: "s.mueller@example.de", pickup_date: d(-25), return_date: d(-18), actual_return_date: d(-18), daily_rate: 39, total_amount: 273, deposit: 300, status: "abgeschlossen", created_at: ts(-25), updated_at: ts(-18) },
    { id: coid[8], org_id: orgId, contract_nr: "MV-2026-0009", vehicle_id: vid[2], customer_id: cuid[3], plate: "M-EF 9012", vehicle_type: "BMW 320i", renter_name: "Maria Wagner", renter_email: "m.wagner@example.de", pickup_date: d(-75), return_date: d(-66), actual_return_date: d(-66), daily_rate: 75, total_amount: 675, deposit: 800, status: "abgeschlossen", created_at: ts(-75), updated_at: ts(-66) },
  ];

  const feeBreak = { processing_fee: 25, fee_net: 21.01, fee_vat: 3.99, fee_gross: 25 };
  const tickets = [
    // 2x neu (frisch ausgelesen, noch nicht zugeordnet)
    { id: tid[0], org_id: orgId, ticket_nr: "KP-2041", status: "neu", plate: "M-EF 9012", vehicle_type: "BMW 320i", offense: "Parken im Halteverbot", offense_details: "Eingeschränktes Halteverbot, Zeichen 286", location: "Sendlinger Str. 14, München", offense_date: d(-1), offense_time: "14:22", authority: "Kreisverwaltungsreferat München", reference_nr: "KVR-2026-884213", fine_amount: 25, points: 0, deadline: d(13), ai_confidence: 0.96, source: "upload", created_at: ts(-1) },
    { id: tid[1], org_id: orgId, ticket_nr: "KP-2042", status: "neu", plate: "M-GH 3456", vehicle_type: "Mercedes-Benz C 200", offense: "Parken in zweiter Reihe", offense_details: "Behinderung des fließenden Verkehrs", location: "Maximilianstr. 30, München", offense_date: d(-2), offense_time: "09:48", authority: "Kreisverwaltungsreferat München", reference_nr: "KVR-2026-884197", fine_amount: 55, points: 0, deadline: d(12), ai_confidence: 0.91, source: "email", created_at: ts(-2) },
    // 2x zugeordnet (Fahrer gefunden, aktive Verträge)
    { id: tid[2], org_id: orgId, ticket_nr: "KP-2039", status: "zugeordnet", plate: "M-AB 1234", vehicle_type: "VW Golf VIII", offense: "Geschwindigkeit innerorts +21 km/h", offense_details: "Nach Toleranzabzug 21 km/h zu schnell", location: "Lindwurmstr., München", offense_date: d(-5), offense_time: "18:03", authority: "Polizeipräsidium München", reference_nr: "PP-2026-55120", fine_amount: 115, points: 1, deadline: d(9), ai_confidence: 0.94, contract_id: coid[0], renter_name: "Stefan Müller", renter_email: "s.mueller@example.de", source: "upload", created_at: ts(-4) },
    { id: tid[3], org_id: orgId, ticket_nr: "KP-2038", status: "zugeordnet", plate: "M-CD 5678", vehicle_type: "Audi A4 Avant", offense: "Falschparken", offense_details: "Parken auf Schwerbehindertenparkplatz", location: "Theresienhöhe 5, München", offense_date: d(-4), offense_time: "11:15", authority: "Kreisverwaltungsreferat München", reference_nr: "KVR-2026-883940", fine_amount: 55, points: 0, deadline: d(10), ai_confidence: 0.89, contract_id: coid[1], renter_name: "Tanja Schmidt", renter_email: "t.schmidt@example.de", source: "upload", created_at: ts(-6) },
    // 2x weiterbelastet (an Mieter berechnet, Anschreiben raus)
    { id: tid[4], org_id: orgId, ticket_nr: "KP-2034", status: "weiterbelastet", plate: "M-IJ 7890", vehicle_type: "VW Passat Variant", offense: "Rotlichtverstoß", offense_details: "Qualifizierter Rotlichtverstoß (> 1 s)", location: "Landsberger Str., München", offense_date: d(-32), offense_time: "07:51", authority: "Polizeipräsidium München", reference_nr: "PP-2026-54021", fine_amount: 200, points: 1, deadline: d(-4), ai_confidence: 0.97, contract_id: coid[5], renter_name: "Jonas Hofmann", renter_email: "j.hofmann@example.de", ...feeBreak, total_charge: 225, charge_fine: true, charge_fee: true, letter_sent: true, source: "upload", created_at: ts(-9) },
    { id: tid[5], org_id: orgId, ticket_nr: "KP-2031", status: "weiterbelastet", plate: "M-OP 8642", vehicle_type: "Fiat 500", offense: "Parken auf Gehweg", offense_details: "Unzulässiges Gehwegparken", location: "Rosenheimer Str. 90, München", offense_date: d(-22), offense_time: "16:30", authority: "Kreisverwaltungsreferat München", reference_nr: "KVR-2026-881204", fine_amount: 55, points: 0, deadline: d(-2), ai_confidence: 0.93, contract_id: coid[7], renter_name: "Stefan Müller", renter_email: "s.mueller@example.de", ...feeBreak, total_charge: 80, charge_fine: true, charge_fee: true, letter_sent: true, source: "upload", created_at: ts(-11) },
    // 2x bezahlt (abgeschlossen, Zahlung erhalten)
    { id: tid[6], org_id: orgId, ticket_nr: "KP-2025", status: "bezahlt", plate: "M-EF 9012", vehicle_type: "BMW 320i", offense: "Geschwindigkeit außerorts +16 km/h", offense_details: "Nach Toleranzabzug 16 km/h zu schnell", location: "B2R bei München", offense_date: d(-70), offense_time: "13:40", authority: "Bußgeldstelle Augsburg", reference_nr: "BSA-2026-12044", fine_amount: 70, points: 0, deadline: d(-44), ai_confidence: 0.95, contract_id: coid[8], renter_name: "Maria Wagner", renter_email: "m.wagner@example.de", ...feeBreak, total_charge: 95, charge_fine: true, charge_fee: true, paid: true, letter_sent: true, authority_sent: true, source: "upload", created_at: ts(-12) },
    { id: tid[7], org_id: orgId, ticket_nr: "KP-2022", status: "bezahlt", plate: "M-AB 1234", vehicle_type: "VW Golf VIII", offense: "Parken im Halteverbot", offense_details: "Absolutes Halteverbot, Zeichen 283", location: "Marienplatz, München", offense_date: d(-55), offense_time: "10:05", authority: "Kreisverwaltungsreferat München", reference_nr: "KVR-2026-879510", fine_amount: 25, points: 0, deadline: d(-29), ai_confidence: 0.98, contract_id: coid[6], renter_name: "Tanja Schmidt", renter_email: "t.schmidt@example.de", ...feeBreak, total_charge: 50, charge_fine: true, charge_fee: true, paid: true, letter_sent: true, source: "upload", created_at: ts(-13) },
  ];

  const ticketLogs = [
    { id: lid[0], ticket_id: tid[0], action: "upload", details: {}, created_at: ts(-1) },
    { id: lid[1], ticket_id: tid[0], action: "parsed", details: { confidence: 0.96 }, created_at: ts(-1) },
    { id: lid[2], ticket_id: tid[1], action: "inbound", details: { subject: "Anhörungsbogen M-GH 3456" }, created_at: ts(-2) },
    { id: lid[3], ticket_id: tid[2], action: "matched", details: { renter_name: "Stefan Müller" }, created_at: ts(-4) },
    { id: lid[4], ticket_id: tid[3], action: "matched", details: { renter_name: "Tanja Schmidt" }, created_at: ts(-6) },
    { id: lid[5], ticket_id: tid[4], action: "sent_renter", details: { to: "j.hofmann@example.de" }, created_at: ts(-8) },
    { id: lid[6], ticket_id: tid[5], action: "documents", details: {}, created_at: ts(-10) },
    { id: lid[7], ticket_id: tid[5], action: "sent_renter", details: { to: "s.mueller@example.de" }, created_at: ts(-10) },
    { id: lid[8], ticket_id: tid[6], action: "sent_authority", details: { to: "bussgeldstelle@example.de" }, created_at: ts(-11) },
    { id: lid[9], ticket_id: tid[6], action: "paid", details: {}, created_at: ts(-7) },
    { id: lid[10], ticket_id: tid[7], action: "paid", details: {}, created_at: ts(-5) },
  ];

  const damageReports = [
    { id: drid[0], org_id: orgId, contract_id: coid[5], vehicle_id: vid[4], date: d(-27), time: "17:20", location: "Parkhaus Stachus, München", description: "Kratzer an der hinteren Stoßstange links bei Rückgabe festgestellt (Computer-Vision-Vergleich, Konfidenz 94 %).", status: "reguliert", photos: [] },
    { id: drid[1], org_id: orgId, contract_id: coid[2], vehicle_id: vid[2], date: d(-2), time: "08:10", location: "Mittlerer Ring, München", description: "Steinschlag in der Windschutzscheibe, vom Mieter gemeldet. Werkstatttermin offen.", status: "offen", photos: [] },
  ];

  const pricingRules = [
    { id: prid[0], org_id: orgId, name: "Sommer-Hochsaison", type: "season", adjustment_percent: 15, start_date: d(-5), end_date: d(80), active: true },
    { id: prid[1], org_id: orgId, name: "Wochenend-Aufschlag", type: "weekday", adjustment_percent: 10, weekdays: [5, 6, 7], active: true },
    { id: prid[2], org_id: orgId, name: "Knappe Verfügbarkeit", type: "demand", adjustment_percent: 12, min_fleet_available: 3, active: true },
  ];

  const vehicleEvents = [
    { id: veid[0], org_id: orgId, vehicle_id: vid[1], type: "tuev", date: d(-360), description: "Hauptuntersuchung (HU/AU)", next_due_date: d(12), provider: "TÜV SÜD" },
  ];

  const vehicleTires = [
    { id: trid[0], org_id: orgId, vehicle_id: vid[7], type: "summer", brand: "Continental", size: "185/55 R15", is_current: true, tread_depth_fl: 2.5, tread_depth_fr: 2.8, tread_depth_rl: 3.1, tread_depth_rr: 3.0, condition: "worn", mounted_at: d(-200) },
    { id: trid[1], org_id: orgId, vehicle_id: vid[0], type: "summer", brand: "Michelin", size: "205/55 R16", is_current: true, tread_depth_fl: 6.5, tread_depth_fr: 6.4, tread_depth_rl: 6.8, tread_depth_rr: 6.7, condition: "good", mounted_at: d(-120) },
  ];

  // Reihenfolge respektiert FKs.
  const steps: Array<[string, object[]]> = [
    ["vehicles", vehicles],
    ["customers", customers],
    ["contracts", contracts],
    ["tickets", tickets],
    ["ticket_logs", ticketLogs],
    ["damage_reports", damageReports],
    ["pricing_rules", pricingRules],
    ["vehicle_events", vehicleEvents],
    ["vehicle_tires", vehicleTires],
  ];

  for (const [table, rows] of steps) {
    const { error } = await admin.from(table).insert(rows);
    if (error) {
      // Best-effort-Rollback der bereits angelegten Demo-Zeilen.
      await unseedByIds(ids).catch(() => null);
      throw new Error(`demo-seed ${table}: ${error.message}`);
    }
  }

  await admin
    .from("organizations")
    .update({ demo_seeded: true, demo_data: ids })
    .eq("id", orgId);

  return { seeded: true };
};

const unseedByIds = async (ids: DemoData): Promise<void> => {
  const admin = createAdminClient();
  for (const table of TABLES_DELETE_ORDER) {
    const list = ids[table];
    if (list && list.length) {
      await admin.from(table).delete().in("id", list);
    }
  }
};

export const unseedDemoData = async (orgId: string): Promise<void> => {
  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("demo_data")
    .eq("id", orgId)
    .maybeSingle();
  const ids = ((org as { demo_data?: DemoData } | null)?.demo_data ?? {}) as DemoData;
  await unseedByIds(ids);
  await admin
    .from("organizations")
    .update({ demo_seeded: false, demo_data: null })
    .eq("id", orgId);
};
