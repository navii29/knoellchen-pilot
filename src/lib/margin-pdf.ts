import { jsPDF } from "jspdf";
import type { Organization } from "./types";
import type { FleetMargin } from "./margin";
import { fmtDate, fmtEur } from "./utils";

const PAGE = { w: 210, h: 297 };
const M = { left: 18, right: 18, top: 18, bottom: 18 };
const TEAL: [number, number, number] = [13, 148, 136];
const INK: [number, number, number] = [38, 38, 36];
const GRAY: [number, number, number] = [120, 120, 116];
const LIGHT: [number, number, number] = [225, 225, 222];
const EMERALD: [number, number, number] = [21, 128, 61];
const ROSE: [number, number, number] = [185, 28, 28];

const setColor = (doc: jsPDF, c: [number, number, number]) =>
  doc.setTextColor(c[0], c[1], c[2]);
const setDraw = (doc: jsPDF, c: [number, number, number]) =>
  doc.setDrawColor(c[0], c[1], c[2]);

export const generateMarginPdf = (args: {
  org: Organization;
  margin: FleetMargin;
}): ArrayBuffer => {
  const { org, margin } = args;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFont("helvetica", "normal");

  // Briefkopf
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

  setColor(doc, GRAY);
  doc.setFontSize(8);
  doc.text(`Erstellt am ${fmtDate(new Date().toISOString())}`, PAGE.w - M.right, M.top, {
    align: "right",
  });

  setDraw(doc, LIGHT);
  doc.setLineWidth(0.3);
  doc.line(M.left, y + 2, PAGE.w - M.right, y + 2);

  y += 10;

  // Titel
  setColor(doc, INK);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Margenauswertung", M.left, y);

  setColor(doc, GRAY);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Zeitraum: ${fmtDate(margin.from)} – ${fmtDate(margin.to)}  ·  ${margin.period_days} Tage  ·  ${margin.vehicle_count} Fahrzeuge`,
    M.left,
    y + 6
  );

  y += 14;

  // Summary boxes
  const boxW = (PAGE.w - M.left - M.right - 9) / 4;
  const drawSummary = (
    x: number,
    label: string,
    value: string,
    color: [number, number, number] = INK
  ) => {
    setDraw(doc, LIGHT);
    doc.roundedRect(x, y, boxW, 18, 2, 2);
    setColor(doc, GRAY);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text(label.toUpperCase(), x + 3, y + 5);
    setColor(doc, color);
    doc.setFontSize(12);
    doc.text(value, x + 3, y + 13);
    doc.setFont("helvetica", "normal");
  };
  drawSummary(M.left, "Ist-VK", fmtEur(margin.total_ist_vk));
  drawSummary(M.left + boxW + 3, "EK gesamt", fmtEur(margin.total_ek), GRAY);
  drawSummary(
    M.left + (boxW + 3) * 2,
    "Marge",
    fmtEur(margin.total_margin),
    margin.total_margin >= 0 ? EMERALD : ROSE
  );
  drawSummary(
    M.left + (boxW + 3) * 3,
    "Auslastung",
    `${margin.avg_utilization_pct.toFixed(0)}%`
  );

  y += 24;

  // Tabelle
  const COLS = [
    { x: M.left, w: 22, label: "Kennz.", align: "left" as const },
    { x: M.left + 22, w: 44, label: "Fahrzeug", align: "left" as const },
    { x: M.left + 66, w: 16, label: "Tage", align: "right" as const },
    { x: M.left + 82, w: 22, label: "EK", align: "right" as const },
    { x: M.left + 104, w: 22, label: "Soll-VK", align: "right" as const },
    { x: M.left + 126, w: 22, label: "Ist-VK", align: "right" as const },
    { x: M.left + 148, w: 22, label: "Marge", align: "right" as const },
    { x: M.left + 170, w: 16, label: "Ausl.", align: "right" as const },
  ];

  setDraw(doc, LIGHT);
  doc.setFillColor(245, 245, 244);
  doc.rect(M.left, y, PAGE.w - M.left - M.right, 7, "F");
  setColor(doc, GRAY);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  for (const c of COLS) {
    doc.text(c.label, c.align === "right" ? c.x + c.w : c.x + 1, y + 4.6, {
      align: c.align,
    });
  }
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  for (const v of margin.vehicles) {
    if (y > PAGE.h - M.bottom - 25) {
      doc.addPage();
      y = M.top;
    }
    setColor(doc, INK);
    doc.text(v.plate, COLS[0].x + 1, y + 4);
    doc.text(
      (doc.splitTextToSize(v.label, COLS[1].w - 2) as string[])[0] ?? v.label,
      COLS[1].x + 1,
      y + 4
    );
    doc.text(`${v.rented_days}/${v.period_days}`, COLS[2].x + COLS[2].w, y + 4, {
      align: "right",
    });
    setColor(doc, GRAY);
    doc.text(fmtEur(v.ek_total), COLS[3].x + COLS[3].w, y + 4, { align: "right" });
    doc.text(
      v.target_daily_rate != null ? fmtEur(v.soll_vk_total) : "—",
      COLS[4].x + COLS[4].w,
      y + 4,
      { align: "right" }
    );
    setColor(doc, INK);
    doc.text(fmtEur(v.ist_vk_total), COLS[5].x + COLS[5].w, y + 4, {
      align: "right",
    });
    setColor(doc, v.margin_eur >= 0 ? EMERALD : ROSE);
    doc.setFont("helvetica", "bold");
    doc.text(fmtEur(v.margin_eur), COLS[6].x + COLS[6].w, y + 4, {
      align: "right",
    });
    doc.setFont("helvetica", "normal");
    setColor(doc, INK);
    doc.text(
      `${v.utilization_pct.toFixed(0)}%`,
      COLS[7].x + COLS[7].w,
      y + 4,
      { align: "right" }
    );
    setDraw(doc, LIGHT);
    doc.setLineWidth(0.15);
    doc.line(M.left, y + 6, PAGE.w - M.right, y + 6);
    y += 6;
  }

  // Totals row
  if (y > PAGE.h - M.bottom - 20) {
    doc.addPage();
    y = M.top;
  }
  setDraw(doc, GRAY);
  doc.setLineWidth(0.4);
  doc.line(M.left, y, PAGE.w - M.right, y);
  y += 6;
  setColor(doc, INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Summe", COLS[0].x + 1, y);
  doc.text(
    `${margin.total_rented_days}/${margin.total_possible_days}`,
    COLS[2].x + COLS[2].w,
    y,
    { align: "right" }
  );
  doc.text(fmtEur(margin.total_ek), COLS[3].x + COLS[3].w, y, { align: "right" });
  doc.text(fmtEur(margin.total_soll_vk), COLS[4].x + COLS[4].w, y, {
    align: "right",
  });
  doc.text(fmtEur(margin.total_ist_vk), COLS[5].x + COLS[5].w, y, {
    align: "right",
  });
  setColor(doc, margin.total_margin >= 0 ? EMERALD : ROSE);
  doc.text(fmtEur(margin.total_margin), COLS[6].x + COLS[6].w, y, {
    align: "right",
  });
  setColor(doc, INK);
  doc.text(
    `${margin.avg_utilization_pct.toFixed(0)}%`,
    COLS[7].x + COLS[7].w,
    y,
    { align: "right" }
  );

  // Footer
  setColor(doc, GRAY);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${org.name} · ${org.street ?? ""} · ${org.zip ?? ""} ${org.city ?? ""}`.trim(),
    M.left,
    PAGE.h - 10
  );

  return doc.output("arraybuffer");
};
