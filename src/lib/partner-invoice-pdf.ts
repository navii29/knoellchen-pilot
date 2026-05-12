import { jsPDF } from "jspdf";
import type { Organization } from "./types";
import type { SalesPartner } from "./partners";
import { fmtDate, fmtEur } from "./utils";

const PAGE = { w: 210, h: 297 };
const M = { left: 22, right: 18, top: 18, bottom: 18 };
const TEAL: [number, number, number] = [13, 148, 136];
const INK: [number, number, number] = [38, 38, 36];
const GRAY: [number, number, number] = [120, 120, 116];
const LIGHT: [number, number, number] = [225, 225, 222];

const setColor = (doc: jsPDF, c: [number, number, number]) =>
  doc.setTextColor(c[0], c[1], c[2]);
const setDraw = (doc: jsPDF, c: [number, number, number]) =>
  doc.setDrawColor(c[0], c[1], c[2]);

export type InvoiceItem = {
  contract_nr: string;
  plate: string;
  vehicle_type: string | null;
  renter_name: string;
  pickup_date: string;
  return_date: string;
  days: number;
  purchase_price_per_day: number | null;
  selling_price_per_day: number | null;
  computed_commission: number;
};

export type InvoiceArgs = {
  org: Organization;
  partner: SalesPartner;
  period: { from: string | null; to: string | null };
  items: InvoiceItem[];
  totals: {
    contract_count: number;
    total_days: number;
    total_purchase: number;
    total_selling: number;
    total_commission: number;
  };
  invoice_nr?: string;
};

const VAT_RATE = 19;

const formatPeriod = (from: string | null, to: string | null) => {
  if (from && to) return `${fmtDate(from)} – ${fmtDate(to)}`;
  if (from) return `ab ${fmtDate(from)}`;
  if (to) return `bis ${fmtDate(to)}`;
  return "Gesamtzeitraum";
};

export const generatePartnerInvoicePdf = (args: InvoiceArgs): ArrayBuffer => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFont("helvetica", "normal");

  const { org, partner, period, items, totals } = args;
  const invoiceNr = args.invoice_nr ?? `PR-${Date.now().toString(36).toUpperCase()}`;
  const today = new Date().toISOString().slice(0, 10);
  const periodLabel = formatPeriod(period.from, period.to);

  // ============================================
  // Briefkopf (Vermieter oben links)
  // ============================================
  setColor(doc, TEAL);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(org.name, M.left, M.top);

  setColor(doc, GRAY);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  let y = M.top + 5;
  for (const line of [
    [org.street, `${org.zip ?? ""} ${org.city ?? ""}`.trim()].filter(Boolean).join(" · "),
    [org.phone, org.email, org.tax_number ? `USt-IdNr. ${org.tax_number}` : null]
      .filter(Boolean)
      .join(" · "),
  ]) {
    if (line) {
      doc.text(line, M.left, y);
      y += 4;
    }
  }

  // Rechnungsnummer + Datum oben rechts
  setColor(doc, GRAY);
  doc.setFontSize(8);
  doc.text(`Rechnung Nr. ${invoiceNr}`, PAGE.w - M.right, M.top, { align: "right" });
  doc.text(`Datum: ${fmtDate(today)}`, PAGE.w - M.right, M.top + 4, { align: "right" });

  setDraw(doc, LIGHT);
  doc.setLineWidth(0.3);
  doc.line(M.left, y + 2, PAGE.w - M.right, y + 2);

  y = y + 10;

  // ============================================
  // Empfänger-Adresse (Partner)
  // ============================================
  setColor(doc, GRAY);
  doc.setFontSize(7.5);
  doc.text(
    `${org.name} · ${org.street ?? ""} · ${org.zip ?? ""} ${org.city ?? ""}`.trim(),
    M.left,
    y
  );

  setColor(doc, INK);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(partner.name, M.left, y + 8);

  setColor(doc, INK);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  let ay = y + 13;
  if (partner.contact_name) {
    doc.text(partner.contact_name, M.left, ay);
    ay += 4.5;
  }
  if (partner.address) {
    for (const line of partner.address.split("\n")) {
      doc.text(line, M.left, ay);
      ay += 4.5;
    }
  }
  if (partner.tax_number) {
    setColor(doc, GRAY);
    doc.setFontSize(8);
    doc.text(`Steuernummer: ${partner.tax_number}`, M.left, ay + 1);
    ay += 5;
  }

  y = Math.max(ay, y + 30);

  // ============================================
  // Titel
  // ============================================
  setColor(doc, INK);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Provisionsabrechnung", M.left, y + 8);

  setColor(doc, GRAY);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Zeitraum: ${periodLabel}`, M.left, y + 14);

  y += 22;

  // ============================================
  // Tabelle
  // ============================================
  const COLS = [
    { x: M.left, w: 25, label: "Vertrag", align: "left" as const },
    { x: M.left + 25, w: 22, label: "Kennz.", align: "left" as const },
    { x: M.left + 47, w: 38, label: "Mieter", align: "left" as const },
    { x: M.left + 85, w: 36, label: "Zeitraum", align: "left" as const },
    { x: M.left + 121, w: 11, label: "Tage", align: "right" as const },
    { x: M.left + 132, w: 18, label: "Einst.", align: "right" as const },
    { x: M.left + 150, w: 18, label: "VK", align: "right" as const },
    { x: M.left + 168, w: 22, label: "Provision", align: "right" as const },
  ];

  // Header
  setDraw(doc, LIGHT);
  doc.setFillColor(245, 245, 244);
  doc.rect(M.left, y, PAGE.w - M.left - M.right, 7, "F");
  setColor(doc, GRAY);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  for (const c of COLS) {
    doc.text(c.label, c.align === "right" ? c.x + c.w : c.x, y + 4.6, {
      align: c.align,
    });
  }
  y += 7;

  doc.setFont("helvetica", "normal");
  setColor(doc, INK);
  doc.setFontSize(8.5);

  if (items.length === 0) {
    setColor(doc, GRAY);
    doc.setFontSize(9);
    doc.text("Keine Verträge im gewählten Zeitraum.", M.left + 3, y + 6);
    y += 12;
  }

  for (const it of items) {
    if (y > PAGE.h - M.bottom - 50) {
      doc.addPage();
      y = M.top;
    }
    const cells = [
      it.contract_nr,
      it.plate,
      it.renter_name,
      `${fmtDate(it.pickup_date)}–${fmtDate(it.return_date)}`,
      String(it.days),
      it.purchase_price_per_day != null ? fmtEur(it.purchase_price_per_day) : "—",
      it.selling_price_per_day != null ? fmtEur(it.selling_price_per_day) : "—",
      fmtEur(it.computed_commission),
    ];
    setColor(doc, INK);
    doc.setFontSize(8.5);
    cells.forEach((value, i) => {
      const c = COLS[i];
      const x = c.align === "right" ? c.x + c.w : c.x;
      // Truncate long text
      const text =
        i === 2 || i === 3
          ? (doc.splitTextToSize(value, c.w) as string[])[0] ?? value
          : value;
      doc.text(text, x, y + 4, { align: c.align });
    });

    setDraw(doc, LIGHT);
    doc.setLineWidth(0.15);
    doc.line(M.left, y + 6.2, PAGE.w - M.right, y + 6.2);
    y += 6.2;
  }

  y += 4;

  // ============================================
  // Summen-Block (rechtsbündig)
  // ============================================
  const sumX = PAGE.w - M.right;
  const sumLabelX = sumX - 50;

  const net = totals.total_commission;
  const vat = Math.round(net * (VAT_RATE / 100) * 100) / 100;
  const gross = Math.round((net + vat) * 100) / 100;

  setColor(doc, GRAY);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  doc.text(`Verträge`, sumLabelX, y, { align: "right" });
  setColor(doc, INK);
  doc.text(String(totals.contract_count), sumX, y, { align: "right" });
  y += 5;

  setColor(doc, GRAY);
  doc.text(`Mietage gesamt`, sumLabelX, y, { align: "right" });
  setColor(doc, INK);
  doc.text(String(totals.total_days), sumX, y, { align: "right" });
  y += 5;

  setColor(doc, GRAY);
  doc.text(`Umsatz Endkunden (VK)`, sumLabelX, y, { align: "right" });
  setColor(doc, INK);
  doc.text(fmtEur(totals.total_selling), sumX, y, { align: "right" });
  y += 5;

  setColor(doc, GRAY);
  doc.text(`Einstandskosten (Partner)`, sumLabelX, y, { align: "right" });
  setColor(doc, INK);
  doc.text(fmtEur(totals.total_purchase), sumX, y, { align: "right" });
  y += 8;

  setDraw(doc, LIGHT);
  doc.line(sumLabelX - 15, y - 2, sumX, y - 2);

  setColor(doc, INK);
  doc.setFont("helvetica", "bold");
  doc.text("Provision netto", sumLabelX, y + 3, { align: "right" });
  doc.text(fmtEur(net), sumX, y + 3, { align: "right" });
  y += 8;

  setColor(doc, GRAY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`zzgl. ${VAT_RATE}% MwSt.`, sumLabelX, y, { align: "right" });
  doc.text(fmtEur(vat), sumX, y, { align: "right" });
  y += 5;

  setColor(doc, INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Gesamt brutto", sumLabelX, y + 2, { align: "right" });
  doc.text(fmtEur(gross), sumX, y + 2, { align: "right" });
  y += 12;

  // ============================================
  // Zahlungsziel + Footer
  // ============================================
  setColor(doc, INK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const dueDays = 14;
  const dueDate = new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  doc.text(
    `Zahlbar innerhalb von ${dueDays} Tagen, spätestens bis zum ${fmtDate(dueDate)}, ohne Abzug.`,
    M.left,
    y
  );

  // Footer
  setColor(doc, GRAY);
  doc.setFontSize(7.5);
  doc.text(
    `${org.name} · ${org.street ?? ""} · ${org.zip ?? ""} ${org.city ?? ""}`.trim(),
    M.left,
    PAGE.h - 12
  );
  doc.text(`Rechnung ${invoiceNr}`, PAGE.w - M.right, PAGE.h - 12, {
    align: "right",
  });

  return doc.output("arraybuffer");
};
