-- ============================================
-- KNÖLLCHEN-PILOT — Migration 016
-- KI-generierte Mietverträge mit digitaler Unterschrift.
-- AGB pro Org editierbar, signierte PDFs in eigenem Bucket.
-- ============================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS rental_terms TEXT;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS signed_contract_path TEXT,
  ADD COLUMN IF NOT EXISTS signature_data       TEXT,
  ADD COLUMN IF NOT EXISTS signed_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_ip            TEXT;

CREATE INDEX IF NOT EXISTS idx_contracts_signed_at
  ON contracts(signed_at)
  WHERE signed_at IS NOT NULL;

-- Privater Bucket für generierte Verträge (signierte PDFs).
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-docs', 'generated-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Default-AGB-Text für bestehende Orgs ohne eigene Mietbedingungen
UPDATE organizations
SET rental_terms = $$§ 1 Vertragsgegenstand
Der Vermieter überlässt dem Mieter das auf Seite 1 bezeichnete Fahrzeug für den vereinbarten Zeitraum gegen Entgelt zur Nutzung. Eine Untervermietung oder Überlassung an Dritte ist ohne schriftliche Zustimmung des Vermieters untersagt.

§ 2 Übergabe und Rückgabe
Das Fahrzeug wird in technisch und optisch einwandfreiem Zustand übergeben. Festgestellte Vorschäden werden im Übergabeprotokoll dokumentiert. Die Rückgabe hat spätestens zum vereinbarten Zeitpunkt im selben Zustand und mit gleichem Tankfüllstand am vereinbarten Ort zu erfolgen. Bei verspäteter Rückgabe wird der Tagespreis je angefangenem Tag in Rechnung gestellt.

§ 3 Mietzeit und Mietzins
Die Miete beginnt und endet zu den auf Seite 1 angegebenen Zeitpunkten. Der Mietzins wird im Voraus oder bei Übergabe fällig, sofern nichts anderes vereinbart ist. Eine Kaution in vereinbarter Höhe wird bei Übergabe hinterlegt und nach mängelfreier Rückgabe binnen 14 Tagen erstattet.

§ 4 Kilometerregelung
Im Mietpreis sind die im Vertrag genannten Inklusivkilometer enthalten. Mehrkilometer werden zum vereinbarten Preis pro Kilometer abgerechnet. Der Tachostand bei Übergabe und Rückgabe wird im Übergabeprotokoll festgehalten.

§ 5 Tankregelung
Das Fahrzeug ist im selben Tankzustand zurückzugeben, in dem es übernommen wurde („voll an voll"). Bei abweichender Rückgabe werden fehlende Liter zuzüglich einer Servicepauschale von 25,00 € berechnet.

§ 6 Versicherung und Selbstbeteiligung
Das Fahrzeug ist haftpflicht-, teil- und vollkaskoversichert. Im Schadensfall trägt der Mieter eine Selbstbeteiligung von 1.000,00 € (Vollkasko) bzw. 300,00 € (Teilkasko) je Schadensereignis. Bei grober Fahrlässigkeit oder Vorsatz, Trunkenheit, Drogeneinfluss oder Fahrerflucht haftet der Mieter unbegrenzt.

§ 7 Pflichten des Mieters
Der Mieter verpflichtet sich, das Fahrzeug schonend zu behandeln, regelmäßig den Ölstand und die Reifen zu prüfen, die Verkehrsregeln einzuhalten und nur Fahrer:innen mit gültiger Fahrerlaubnis das Fahrzeug zu überlassen. Rauchen, Tiertransport ohne Vereinbarung und gewerbliche Personenbeförderung sind untersagt. Auslandsfahrten bedürfen der vorherigen schriftlichen Zustimmung.

§ 8 Schadenmeldepflicht
Jeder Unfall, Schaden, Diebstahl oder Brand ist unverzüglich, spätestens innerhalb von 24 Stunden, dem Vermieter und der Polizei zu melden. Ein Schadenformular ist vom Mieter vollständig auszufüllen. Bei Verletzung der Meldepflicht haftet der Mieter für entstehende Mehrkosten.

§ 9 Bußgelder und Verkehrsverstöße
Bußgelder, Verwarnungsgelder und sonstige Folgen von Verkehrsverstößen während der Mietzeit trägt der Mieter. Der Vermieter ist berechtigt, eine Bearbeitungsgebühr von 25,00 € netto je Vorgang zu erheben.

§ 10 Haftung
Die Haftung des Vermieters beschränkt sich auf Vorsatz und grobe Fahrlässigkeit, soweit nicht zwingende gesetzliche Vorschriften entgegenstehen. Für leichte Fahrlässigkeit haftet der Vermieter nur bei Verletzung wesentlicher Vertragspflichten und der Höhe nach begrenzt auf den vorhersehbaren, vertragstypischen Schaden.

§ 11 Außerordentliche Kündigung
Der Vermieter kann den Vertrag fristlos kündigen, wenn der Mieter mit der Zahlung in Verzug ist, das Fahrzeug vertragswidrig nutzt oder gegen wesentliche Pflichten dieses Vertrags verstößt.

§ 12 Schlussbestimmungen
Es gilt deutsches Recht. Erfüllungsort und Gerichtsstand ist der Sitz des Vermieters, soweit der Mieter Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen ist. Sollten einzelne Bestimmungen dieses Vertrags unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.$$
WHERE rental_terms IS NULL;
