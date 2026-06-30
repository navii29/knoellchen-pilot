-- ============================================
-- KNÖLLCHEN-PILOT — Migration 072
-- 3D-Schadensmarker pro Vertrag + Übergabe/Rückgabe (pickup/return).
-- Eigenständige Tabelle, getrennt vom KI-Foto-Vergleich (in 2d wird KEIN
-- Aggregat-Zustand am Vertrag mitgeschrieben). Additiv — referenziert nichts
-- Bestehendes, nichts Bestehendes referenziert sie (noch nicht).
-- ============================================

CREATE TABLE IF NOT EXISTS damage_markers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES organizations(id) NOT NULL,

  type TEXT NOT NULL CHECK (type IN ('pickup', 'return')),
  -- Nur die 8 Außen-Zonen, die der Viewer (pointToZone) tatsächlich liefert.
  -- interior/dashboard sind reine Foto-Positionen, per 3D-Klick nicht erreichbar.
  zone TEXT NOT NULL CHECK (zone IN (
    'front', 'rear', 'left', 'right',
    'front_left', 'front_right', 'rear_left', 'rear_right'
  )),
  part_id TEXT,                  -- Bauteil-Key z. B. 'scheinwerfer_L'; NULL = nur grobe Zone
  x DOUBLE PRECISION NOT NULL,
  y DOUBLE PRECISION NOT NULL,
  z DOUBLE PRECISION NOT NULL,   -- lokale Geometrie-Koordinaten → Sphere re-rendern
  damage_type TEXT,              -- kratzer/delle/lack/glas/felge; NULL = nicht gewählt (App-validiert)
  severity TEXT CHECK (severity IN ('none', 'minor', 'major')),  -- NULL = nicht eingestuft

  -- Audit-Vorbereitung: wer den Marker gesetzt hat. 2d füllt die Spalte noch
  -- NICHT; SET NULL, damit ein gelöschter User die Marker nicht blockiert.
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE damage_markers ENABLE ROW LEVEL SECURITY;

-- Policy-Muster WÖRTLICH von 006_handover_photos übernommen.
DROP POLICY IF EXISTS "Damage markers by org" ON damage_markers;
CREATE POLICY "Damage markers by org" ON damage_markers
  FOR ALL USING (org_id = public.current_org_id())
         WITH CHECK (org_id = public.current_org_id());

-- Kein UNIQUE (mehrere Marker pro Zone/Seite erlaubt — anders als handover_photos).
CREATE INDEX IF NOT EXISTS idx_damage_markers_contract_type ON damage_markers(contract_id, type);
CREATE INDEX IF NOT EXISTS idx_damage_markers_org           ON damage_markers(org_id);
