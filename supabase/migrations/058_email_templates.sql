-- ============================================
-- KNÖLLCHEN-PILOT — Migration 058
-- E-Mail-Vorlagen-Bibliothek: pro Use-Case eine vorgefertigte, freundliche
-- deutsche Vorlage (Mietvertrag, Check-in-Einladung, Rechnung, Zahlungs-
-- erinnerung, Rückgabe-Erinnerung, Kaution, freie Nachricht).
--
-- Die Defaults leben im Code (src/lib/email-templates.ts) — diese Tabelle hält
-- ausschließlich die PRO ORGANISATION angepassten Überschreibungen. Fehlt eine
-- Zeile, gilt der Code-Default ("Auf Standard zurücksetzen" = Zeile löschen).
--
-- Multi-Tenant: streng org-scoped über RLS (current_org_id()), analog zu den
-- übrigen Org-Tabellen (customers, contracts, …). Kein Plattform-Geheimnis hier.
-- ============================================

CREATE TABLE IF NOT EXISTS email_templates (
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  subject      TEXT,
  body         TEXT,
  updated_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (org_id, template_key)
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Email templates by org" ON email_templates;
CREATE POLICY "Email templates by org" ON email_templates
  FOR ALL USING (org_id = public.current_org_id())
         WITH CHECK (org_id = public.current_org_id());

CREATE INDEX IF NOT EXISTS idx_email_templates_org ON email_templates(org_id);

-- updated_at automatisch pflegen (set_updated_at() stammt aus Migration 003)
DROP TRIGGER IF EXISTS trg_email_templates_updated_at ON email_templates;
CREATE TRIGGER trg_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
