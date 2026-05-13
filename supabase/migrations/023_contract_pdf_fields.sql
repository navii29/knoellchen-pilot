-- Migration 023: Neue Felder für 6-seitiges Mietvertrag-PDF

-- Organizations: Logo für Briefkopf
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_path TEXT;

-- Contracts: Erweiterte Vertragsfelder
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'bank_transfer';
  -- 'bank_transfer' | 'cash' | 'credit_card' | 'paypal' | 'invoice'
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS insurance_type TEXT DEFAULT 'full';
  -- 'full' (HP+TK+VK) | 'basic' (HP) | 'none'
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS insurance_deductible NUMERIC(10,2);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS special_terms TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS delivery_cost NUMERIC(10,2) DEFAULT 0;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS pickup_cost NUMERIC(10,2) DEFAULT 0;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS driver2_name TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS driver2_license TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS damages_at_handover TEXT DEFAULT 'Keine';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS keys_count INTEGER DEFAULT 1;
