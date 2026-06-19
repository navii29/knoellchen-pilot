// Lokales Render-Skript zum visuellen Prüfen der Vertrags-PDF (Signaturen auf
// Seiten 1/3/4/6). Nicht Teil der App. Aufruf: npx tsx scripts/render-contract-sample.ts
import { writeFileSync } from "node:fs";
import { generateContractPdf } from "../src/lib/contract-pdf";

// Test-"Unterschrift" als SVG-Data-URI (kursiver Schriftzug) — repräsentiert die Tinte.
const sig =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='90'><text x='8' y='62' font-family='Segoe Script, cursive' font-size='46' font-style='italic' fill='%23111'>Lukas Becker</text></svg>`
  );

const landlordSig =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='90'><text x='8' y='62' font-family='Segoe Script, cursive' font-size='44' font-style='italic' fill='%23111'>M. Wagner</text></svg>`
  );

const org = {
  name: "Stadtflotte München GmbH",
  street: "Bayerstraße 12",
  zip: "80335",
  city: "München",
  rental_terms: null,
  logo_path: null,
  landlord_signature_data: landlordSig,
  landlord_signature_name: "Markus Wagner",
} as any;

const contract = {
  contract_nr: "MV-2026-0184",
  renter_name: "Lukas Becker",
  renter_address: "Sonnenstraße 24",
  renter_phone: "+49 175 8765432",
  renter_email: "lukas.becker@example.de",
  renter_license_nr: "B 8765 432109",
  pickup_date: "2026-04-20",
  pickup_time: "09:30",
  return_date: "2026-04-23",
  return_time: "18:00",
  plate: "M-AV 5678",
  daily_rate: 49,
  total_amount: 147,
  deposit: 250,
  km_limit: 900,
  payment_method: "card",
  insurance_type: "full",
  insurance_deductible: 1000,
  keys_count: 2,
  damages_at_handover: "Keine",
  km_pickup: 24812,
  fuel_level_pickup: "Voll",
  special_terms: "—",
  custom_special_terms: "Rückgabe vollgetankt.\nKeine Fahrten ins Ausland.",
  selected_special_terms: [],
  pickup_photos: [],
  driver2_name: null,
  driver2_license: null,
  delivery_cost: 0,
  pickup_cost: 0,
} as any;

const customer = {
  title: "Herr",
  first_name: "Lukas",
  last_name: "Becker",
  street: "Sonnenstraße",
  house_nr: "24",
  zip: "80331",
  city: "München",
  country: "Deutschland",
  phone: "+49 175 8765432",
  email: "lukas.becker@example.de",
  license_nr: "B 8765 432109",
  id_card_nr: "L01X00T47",
} as any;

const vehicle = {
  manufacturer: "VW",
  model: "Polo Style 1.0 TSI",
  vehicle_type: "VW Polo",
  power_ps: 95,
  fuel_type: "Benzin",
  fin_number: "WVWZZZ1KZAW123456",
  accessories: "Winterreifen",
  inclusive_km_month: 9000,
  extra_km_price: 0.18,
} as any;

const main = async () => {
  const buf = await generateContractPdf({
    org,
    contract,
    customer,
    vehicle,
    tires: null,
    logoPngBase64: null,
    signaturePngBase64: sig,
    specialTerms: [],
  });
  writeFileSync("/tmp/contract-sample.pdf", buf);
  console.log("OK → /tmp/contract-sample.pdf", buf.length, "bytes");
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
