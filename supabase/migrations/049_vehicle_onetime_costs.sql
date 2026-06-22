-- ============================================
-- KNÖLLCHEN-PILOT — Migration 049
-- Einmalkosten (EK) je Fahrzeug für die Margenrechnung + Leasingvertrag-Doc.
-- Die Einmalkosten werden in der Marge über die Haltedauer (Erstzulassung →
-- Aussteuerung) als anteilige Tageskosten umgelegt.
-- Alle Kostenfelder sind NUR für Inhaber sichtbar (App-Ebene).
-- ============================================

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS onetime_cost_supplier DECIMAL(10,2); -- Einmalkosten Lieferant
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS onetime_cost_pickup DECIMAL(10,2);   -- Kosten Abholung
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS onetime_cost_return DECIMAL(10,2);   -- Kosten Rückverbringung
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS leasing_doc_path TEXT;               -- eigener Leasingvertrag (Dokument)
