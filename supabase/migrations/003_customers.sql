-- ============================================
-- KNÖLLCHEN-PILOT — Migration 003
-- Kundenverwaltung: zentrale Mieter-Datenbank.
-- Verträge können Kunden referenzieren statt Daten neu einzutippen.
-- ============================================

CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) NOT NULL,

  salutation TEXT,                -- "Herr" | "Frau" | "Divers" | null
  title TEXT,                     -- akademischer Titel
  first_name TEXT,
  last_name TEXT NOT NULL,
  birthday DATE,

  street TEXT,
  house_nr TEXT,
  zip TEXT,
  city TEXT,
  country TEXT DEFAULT 'Deutschland',

  email TEXT,
  phone TEXT,

  license_nr TEXT,
  license_class TEXT,
  license_expiry DATE,
  id_card_nr TEXT,

  license_photo_path TEXT,
  id_card_photo_path TEXT,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers by org" ON customers;
CREATE POLICY "Customers by org" ON customers
  FOR ALL USING (org_id = public.current_org_id())
         WITH CHECK (org_id = public.current_org_id());

CREATE INDEX IF NOT EXISTS idx_customers_org        ON customers(org_id);
CREATE INDEX IF NOT EXISTS idx_customers_last_name  ON customers(org_id, last_name);
CREATE INDEX IF NOT EXISTS idx_customers_email      ON customers(org_id, email);

-- Trigger: updated_at automatisch setzen
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Verträge können auf Kunden zeigen (optional — Bestand bleibt funktionsfähig)
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
CREATE INDEX IF NOT EXISTS idx_contracts_customer ON contracts(customer_id);

-- Storage-Bucket für Führerschein-/Ausweis-Fotos
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-documents', 'customer-documents', false)
ON CONFLICT (id) DO NOTHING;
