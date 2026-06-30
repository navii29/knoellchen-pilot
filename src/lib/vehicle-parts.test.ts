import { describe, it, expect } from "vitest";
import { resolvePart, PART_BOXES, PART_OPTIONS, partLabelById } from "./vehicle-parts";

describe("resolvePart — Bauteil aus normalisierter Koordinate {lon,lat,vert}", () => {
  const cases: Array<[string, { lon: number; lat: number; vert: number }, string | null]> = [
    ["Dach (oben, Mitte)", { lon: 0.47, lat: 0.5, vert: 0.9 }, "dach"],
    ["Scheinwerfer links (vorne, außen links, niedrig)", { lon: 0.95, lat: 0.8, vert: 0.42 }, "scheinwerfer_L"],
    ["Scheinwerfer rechts (gespiegelt)", { lon: 0.95, lat: 0.2, vert: 0.42 }, "scheinwerfer_R"],
    ["Frontstoßstange (ganz vorne, unten, Mitte)", { lon: 0.93, lat: 0.5, vert: 0.1 }, "frontstossstange"],
    ["Vordertür links (Seite, vorne-mittig)", { lon: 0.5, lat: 0.85, vert: 0.4 }, "vordertuer_L"],
    ["Tür/Kotflügel-Grenze: lon 0.62 (noch Tür)", { lon: 0.62, lat: 0.85, vert: 0.4 }, "vordertuer_L"],
    ["Tür/Kotflügel-Grenze: lon 0.75 am Rad (Kotflügel, vert=Blechhöhe)", { lon: 0.75, lat: 0.85, vert: 0.4 }, "kotfluegel_vorne_L"],
    ["Felge/Rad vorne links (Seite, ganz unten)", { lon: 0.7, lat: 0.8, vert: 0.1 }, "felge_rad_vorne_L"],
    ["Heckscheibe (hinten, oben, Mitte)", { lon: 0.27, lat: 0.5, vert: 0.75 }, "heckscheibe"],
    ["Rückleuchte rechts (ganz hinten, außen rechts)", { lon: 0.06, lat: 0.2, vert: 0.42 }, "rueckleuchte_R"],
    ["Mitte/innen → kein Bauteil (Fallback)", { lon: 0.5, lat: 0.5, vert: 0.5 }, null],
  ];
  for (const [label, c, expected] of cases) {
    it(label, () => {
      expect(resolvePart(c)?.partId ?? null).toBe(expected);
    });
  }

  it("L/R-Symmetrie: zu jeder linken Box existiert die rechte und umgekehrt", () => {
    const ids = new Set(PART_BOXES.map((b) => b.id));
    for (const b of PART_BOXES) {
      if (b.side === "L") expect(ids.has(b.id.replace(/_L$/, "_R"))).toBe(true);
      if (b.side === "R") expect(ids.has(b.id.replace(/_R$/, "_L"))).toBe(true);
    }
  });

  it("gespiegelte R-Box ist das lat-Spiegelbild der L-Box", () => {
    const l = PART_BOXES.find((b) => b.id === "vordertuer_L")!;
    const r = PART_BOXES.find((b) => b.id === "vordertuer_R")!;
    expect(r.lat).toEqual([1 - l.lat[1], 1 - l.lat[0]]);
    expect(r.lon).toEqual(l.lon);
    expect(r.vert).toEqual(l.vert);
  });

  it("PART_OPTIONS deckt alle Boxen ab und liefert lesbare Labels", () => {
    expect(PART_OPTIONS.length).toBe(PART_BOXES.length);
    expect(partLabelById("scheinwerfer_L")).toBe("Scheinwerfer links");
    expect(partLabelById("scheinwerfer_R")).toBe("Scheinwerfer rechts");
    expect(partLabelById("dach")).toBe("Dach");
  });
});
