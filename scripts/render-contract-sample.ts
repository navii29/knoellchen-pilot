// Lokales Render-Skript zum visuellen Prüfen der Vertrags-PDF (Signaturen auf
// Seiten 1/3/4/6). Nicht Teil der App. Aufruf: npx tsx scripts/render-contract-sample.ts
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { generateContractPdf } from "../src/lib/contract-pdf";

// Minimaler PNG-Encoder (nur node:zlib) — erzeugt eine echte PNG-Data-URL mit
// einem wellenförmigen Strich als Unterschrift-Platzhalter. So bleibt das Skript
// prod-treu: die App akzeptiert ausschließlich PNG-Data-URLs (kein SVG).
const crcTable = (() => {
  const t = new Array<number>(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf: Buffer) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const pngChunk = (type: string, data: Buffer) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
};
const strokePng = (w: number, h: number, freq: number) => {
  const stride = w * 4 + 1; // 1 Filter-Byte je Zeile + RGBA
  const raw = Buffer.alloc(stride * h, 0);
  const ink = (x: number, y: number) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const o = y * stride + 1 + x * 4;
    raw[o] = 17;
    raw[o + 1] = 24;
    raw[o + 2] = 39;
    raw[o + 3] = 255;
  };
  for (let x = 0; x < w; x++) {
    const y = Math.round(h / 2 + Math.sin(x / freq) * (h / 4));
    for (let dy = -1; dy <= 1; dy++) ink(x, y + dy);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // Bit-Tiefe
  ihdr[9] = 6; // Farbtyp RGBA
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
  return "data:image/png;base64," + png.toString("base64");
};

// Test-"Unterschriften" als echte PNGs (Mieter + Vermieter, leicht versch. Wellen).
const sig = strokePng(300, 80, 9);

const landlordSig = strokePng(280, 80, 6);

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
