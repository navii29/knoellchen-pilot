-- ============================================
-- KNÖLLCHEN-PILOT — Migration 051
-- Folgefahrzeug / Nachfolge: wenn ein Auto ausgesteuert wird, der Mieter aber
-- bleibt (Auto-Abo/Langzeit), bekommt er rechtzeitig ein Nachfolge-Fahrzeug
-- zugeteilt — inkl. automatisch angelegtem Anschluss-Mietvertrag.
-- ============================================

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS successor_status TEXT; -- null/offen | zugeteilt | ersatzlos
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS successor_vehicle_id UUID REFERENCES vehicles(id);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS successor_contract_id UUID REFERENCES contracts(id);
