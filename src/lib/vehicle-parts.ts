// Bauteil-Erkennung (Weg A): leitet aus einer normalisierten Treffer-Koordinate
// {lon, lat, vert} ∈ [0,1] ein benanntes Karosserieteil ab. PUR — keine three/
// React-Importe, daher unit-testbar.
//
// Kanonischer Raum (vom Viewer aus der ABGENOMMENEN Achsen-Kalibrierung erzeugt):
//   lon   1 = vorne,  0 = hinten
//   lat   1 = links,  0 = rechts,  0.5 = Mitte
//   vert  1 = oben,   0 = unten
//
// Die Boxen sind eine GROBE Erstschätzung und werden am echten Modell iterativ
// justiert (der Viewer zeigt pro Marker lon/lat/vert als Justierhilfe).

export type Side = "L" | "R" | "C";

export type PartBox = {
  id: string; // stabil, z. B. "scheinwerfer_L"
  name: string; // deutsches Basis-Label, z. B. "Scheinwerfer"
  side: Side;
  lon: [number, number];
  lat: [number, number];
  vert: [number, number];
};

export type PartHit = { partId: string; partLabel: string; side: Side };

// Rohdefinition: L/R-Teile EINMAL auf der linken Seite (lat hoch) definiert und
// automatisch zur rechten Seite gespiegelt (lat → 1−lat). Mitte-Teile: side "C".
// Reihenfolge = PRIORITÄT (erster Treffer gewinnt): spezifisch/klein zuerst,
// groß zuletzt → Räder → Leuchten → Spiegel → Scheiben → Grill → Stoßstangen →
// Türen → Kotflügel → Schweller → Hauben → Dach.
type RawPart = {
  name: string;
  side: "LR" | "C";
  lon: [number, number];
  vert: [number, number];
  lat: [number, number]; // LR: linkes Band (z. B. [0.74, 1]); C: Mittel-Range
};

const RAW_PARTS: RawPart[] = [
  { name: "Felge/Rad vorne", side: "LR", lon: [0.6, 0.8], vert: [0.0, 0.26], lat: [0.7, 1.0] },
  { name: "Felge/Rad hinten", side: "LR", lon: [0.16, 0.34], vert: [0.0, 0.26], lat: [0.7, 1.0] },
  { name: "Scheinwerfer", side: "LR", lon: [0.88, 1.0], vert: [0.28, 0.56], lat: [0.6, 1.0] },
  { name: "Rückleuchte", side: "LR", lon: [0.0, 0.12], vert: [0.28, 0.56], lat: [0.6, 1.0] },
  { name: "Außenspiegel", side: "LR", lon: [0.55, 0.7], vert: [0.52, 0.74], lat: [0.74, 1.0] },
  { name: "Frontscheibe", side: "C", lon: [0.56, 0.74], vert: [0.6, 0.95], lat: [0.12, 0.88] },
  { name: "Heckscheibe", side: "C", lon: [0.2, 0.34], vert: [0.6, 0.92], lat: [0.12, 0.88] },
  { name: "Seitenscheibe", side: "LR", lon: [0.34, 0.58], vert: [0.6, 0.92], lat: [0.78, 1.0] },
  { name: "Kühlergrill", side: "C", lon: [0.9, 1.0], vert: [0.18, 0.46], lat: [0.34, 0.66] },
  { name: "Frontstoßstange", side: "C", lon: [0.86, 1.0], vert: [0.0, 0.26], lat: [0.1, 0.9] },
  { name: "Heckstoßstange", side: "C", lon: [0.0, 0.14], vert: [0.0, 0.26], lat: [0.1, 0.9] },
  { name: "Vordertür", side: "LR", lon: [0.42, 0.6], vert: [0.18, 0.62], lat: [0.74, 1.0] },
  { name: "Hintertür", side: "LR", lon: [0.28, 0.42], vert: [0.18, 0.62], lat: [0.74, 1.0] },
  { name: "Kotflügel vorne", side: "LR", lon: [0.6, 0.8], vert: [0.26, 0.52], lat: [0.74, 1.0] },
  { name: "Kotflügel hinten", side: "LR", lon: [0.16, 0.34], vert: [0.26, 0.52], lat: [0.74, 1.0] },
  { name: "Schweller", side: "LR", lon: [0.34, 0.6], vert: [0.0, 0.18], lat: [0.74, 1.0] },
  { name: "Motorhaube", side: "C", lon: [0.72, 0.92], vert: [0.4, 0.66], lat: [0.1, 0.9] },
  { name: "Kofferraumklappe", side: "C", lon: [0.06, 0.22], vert: [0.38, 0.66], lat: [0.1, 0.9] },
  { name: "Dach", side: "C", lon: [0.34, 0.6], vert: [0.8, 1.0], lat: [0.1, 0.9] },
];

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

const mirror = (r: [number, number]): [number, number] => [1 - r[1], 1 - r[0]];

// RAW → konkrete Boxen (L/R gespiegelt). Reihenfolge bleibt = Priorität.
export const PART_BOXES: PartBox[] = RAW_PARTS.flatMap((p): PartBox[] => {
  if (p.side === "C") {
    return [{ id: slug(p.name), name: p.name, side: "C" as const, lon: p.lon, lat: p.lat, vert: p.vert }];
  }
  return [
    { id: `${slug(p.name)}_L`, name: p.name, side: "L" as const, lon: p.lon, lat: p.lat, vert: p.vert },
    { id: `${slug(p.name)}_R`, name: p.name, side: "R" as const, lon: p.lon, lat: mirror(p.lat), vert: p.vert },
  ];
});

const within = (v: number, r: [number, number]) => v >= r[0] && v <= r[1];

/**
 * Normalisierte Koordinate → erstes passendes Bauteil (Prioritätsreihenfolge der
 * Boxen). Kein Treffer → null (der Viewer fällt dann auf die grobe Zone zurück).
 */
export function resolvePart(c: { lon: number; lat: number; vert: number }): PartHit | null {
  for (const b of PART_BOXES) {
    if (within(c.lon, b.lon) && within(c.lat, b.lat) && within(c.vert, b.vert)) {
      return { partId: b.id, partLabel: b.name, side: b.side };
    }
  }
  return null;
}

export const partDisplay = (name: string, side: Side): string =>
  side === "L" ? `${name} links` : side === "R" ? `${name} rechts` : name;

// Dropdown-Optionen (stabile Reihenfolge = Box-Reihenfolge, L/R benachbart).
export const PART_OPTIONS: { id: string; label: string }[] = PART_BOXES.map((b) => ({
  id: b.id,
  label: partDisplay(b.name, b.side),
}));

const _labelById = new Map(PART_OPTIONS.map((o) => [o.id, o.label]));
export const partLabelById = (id: string): string => _labelById.get(id) ?? id;
