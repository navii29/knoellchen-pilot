-- ============================================
-- KNÖLLCHEN-PILOT — Migration 060
-- Digitales Übergabeprotokoll. Bisher erfasst die Übergabe-Oberfläche nur
-- Fotos pro Position. Hier ergänzen wir die Vor-Ort-Erfassung um Zustand bei
-- Rückgabe und zwei Unterschriften (Vermieter + Mieter) je Vorgang sowie die
-- Speicherpfade der generierten Übergabeprotokoll-PDFs (Übergabe + Rückgabe).
--
-- Bereits vorhanden (Migration < 060, werden NICHT neu angelegt): km_pickup,
-- km_return, fuel_level_pickup, fuel_level_return, damages_at_handover
-- (= Zustand/Schäden bei Übergabe). Unterschriften werden als PNG-Data-URL
-- gespeichert — konsistent zu signature_data. Keine RLS-Änderung nötig
-- (contracts ist bereits RLS-geschützt).
-- ============================================

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS condition_at_return           TEXT,  -- Zustand/Schäden bei Rückgabe (Pickup nutzt damages_at_handover)
  ADD COLUMN IF NOT EXISTS handover_sig_lessor_pickup    TEXT,  -- Unterschrift Vermieter bei Übergabe (PNG-Data-URL)
  ADD COLUMN IF NOT EXISTS handover_sig_renter_pickup    TEXT,  -- Unterschrift Mieter bei Übergabe (PNG-Data-URL)
  ADD COLUMN IF NOT EXISTS handover_sig_lessor_return    TEXT,  -- Unterschrift Vermieter bei Rückgabe (PNG-Data-URL)
  ADD COLUMN IF NOT EXISTS handover_sig_renter_return    TEXT,  -- Unterschrift Mieter bei Rückgabe (PNG-Data-URL)
  ADD COLUMN IF NOT EXISTS handover_protocol_pickup_path TEXT,  -- Speicherpfad Übergabeprotokoll-PDF (Übergabe), generated-docs
  ADD COLUMN IF NOT EXISTS handover_protocol_return_path TEXT;  -- Speicherpfad Übergabeprotokoll-PDF (Rückgabe), generated-docs
