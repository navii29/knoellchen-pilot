-- ============================================
-- Migration 024 — Sondervereinbarungen-System
-- Vordefinierte Textbausteine pro Organisation, auswählbar per Vertrag
-- ============================================

-- Templates pro Org
CREATE TABLE IF NOT EXISTS special_terms_templates (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  text        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'general',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_special_terms_org
  ON special_terms_templates(org_id, sort_order);

ALTER TABLE special_terms_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Special terms by org" ON special_terms_templates;
CREATE POLICY "Special terms by org" ON special_terms_templates
  FOR ALL USING (org_id = public.current_org_id())
         WITH CHECK (org_id = public.current_org_id());

-- Pro Vertrag: gewählte Templates + zusätzlicher Freitext
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS selected_special_terms UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS custom_special_terms   TEXT;

-- Standard-Templates für alle bestehenden Orgs anlegen.
-- Wird nur eingefügt, wenn die jeweilige Org noch keine Templates hat —
-- damit re-run idempotent ist.
DO $$
DECLARE
  o RECORD;
BEGIN
  FOR o IN SELECT id FROM organizations LOOP
    IF NOT EXISTS (SELECT 1 FROM special_terms_templates WHERE org_id = o.id) THEN
      INSERT INTO special_terms_templates (org_id, title, text, category, sort_order) VALUES
        (o.id, 'Nichtraucherfahrzeug',
         'Das Fahrzeug ist ein Nichtraucherfahrzeug. Bei Zuwiderhandlung gegen das Rauchverbot berechnen wir pauschal 250€ für eine Innenreinigung inkl. erforderlicher Ozonbehandlung.',
         'general', 10),
        (o.id, 'Versicherungsschutz Diebstahl',
         'Versicherungsschutz bei Diebstahl nur bei Vorhandensein des übergebenen original Fahrzeugschlüssels.',
         'general', 20),
        (o.id, 'Unterschlagungshaftung',
         'Im Falle einer Unterschlagung haftet der Mieter mit dem ursprünglichen Listenpreis. Bei einer gewerblichen Miete haftet der Geschäftsführer zusätzlich mit seinem Privatvermögen.',
         'general', 30),
        (o.id, 'Gewerbliche Miete Haftung',
         'Bei einer gewerblichen Miete haftet der Geschäftsführer der Mieterin für sämtliche Schäden, offene Zahlungen oder sonstige Ansprüche gegenüber der Vermieterin selbstschuldnerisch.',
         'general', 40),
        (o.id, 'Auslandsfahrten DACH',
         'Auslandsfahrten sind nur innerhalb des DACH-Verbandes zulässig.',
         'international', 50),
        (o.id, 'Auslandsfahrten untersagt',
         'Auslandsfahrten sind ausdrücklich untersagt. Versicherungsschutz nur in den Ländern gemäß Einreisebeschränkung.',
         'international', 60),
        (o.id, 'Reifenpflicht',
         'Der Mieter trägt die Pflicht zur Verwendung von einer der Witterung angepassten Bereifung (ggf. Winterreifen mit Schneeflockensymbol). Wir behalten uns vor, bei übermäßigem Reifenverschleiß diesen in Rechnung zu stellen.',
         'general', 70),
        (o.id, 'Tankregel Nachbetankung',
         'Bei nicht erfolgter Nachbetankung auf den Übergabebestand berechnen wir 3,00€ pro nachgetanktem Liter Kraftstoff.',
         'general', 80),
        (o.id, 'Launch-Control',
         'Mit der Verwendung von Launch-Control erlischt die Garantie und der Mieter haftet in vollem Umfang.',
         'sportscars', 90),
        (o.id, 'Nur öffentliche Straßen',
         'Nutzung ausschließlich auf öffentlichen Straßen. Keine Rennstrecke (Rennstrecke = Vollhaftung).',
         'sportscars', 100),
        (o.id, 'Glasschäden',
         'Glasschäden fallen ausdrücklich in die Haftung des Mieters.',
         'damage', 110),
        (o.id, 'Fahrzeug gereinigt zurückgeben',
         'Fahrzeug muss bei Rückgabe gereinigt sein.',
         'general', 120),
        (o.id, 'Keine Drittvermietung',
         'Eine Überlassung/Vermietung an Dritte ist untersagt.',
         'general', 130),
        (o.id, 'Fahrtauglichkeit',
         'Das Führen des Fahrzeuges ist ausschließlich im Vorhandensein der vollen Fahrtauglichkeit erlaubt. Das Führen unter Rauschmitteln ist ausdrücklich untersagt. Bei Missachtung haftet der Mieter in Höhe des vollen Listenpreises.',
         'general', 140),
        (o.id, 'Fahrzeugtausch',
         'Der Vermieter behält sich das Recht vor, je nach Verfügbarkeit einen Tausch des Fahrzeuges durchzuführen.',
         'general', 150),
        (o.id, 'Maut nicht inkludiert',
         'Hinweis: Maut nicht im Mietpreis inkludiert.',
         'general', 160);
    END IF;
  END LOOP;
END $$;
