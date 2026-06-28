-- ============================================
-- KNÖLLCHEN-PILOT — Migration 068
-- Markenfarbe pro Organisation (für Vertrags-PDF-Branding). Nullable Hex-String
-- (z. B. "#0d9488"); leer/null = heutiges neutrales Design. Gesetzt wird die
-- Spalte ausschließlich über den owner-only org-PATCH (validiert als Hex).
-- Nur diese eine Spalte; keine RLS-Änderung (organizations ist bereits
-- RLS-geschützt).
-- ============================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_color TEXT;
