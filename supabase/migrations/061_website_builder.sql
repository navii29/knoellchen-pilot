-- ============================================
-- KNÖLLCHEN-PILOT — Migration 061
-- Website-Builder ("Mietseite"): jede Organisation kann eine öffentliche
-- Mini-Website im Plattform-Design veröffentlichen. Datenmodell für Phase 1:
--   sites        — eine Site pro Org (Template, Theme, Veröffentlichungs-Status)
--   site_pages   — Seiten der Site (Home = path '', plus Unterseiten)
--   site_blocks  — Inhaltsblöcke pro Seite (hero, fleet, contact, …)
--
-- Multi-Tenant: streng org-scoped über RLS (current_org_id()), analog zu den
-- übrigen Org-Tabellen (vehicles, contracts, email_templates, …).
--
-- WICHTIG: KEINE anonyme/öffentliche SELECT-Policy. Der öffentliche Renderer
-- (/m/[slug]) liest serverseitig über den Service-Role-Admin-Client und filtert
-- selbst auf published = true + Org-Slug. Diese Server-Filterung IST die
-- Zugriffskontrolle für die öffentliche Seite. Der Slug + logo_path liegen
-- bereits auf organizations (Migration 002 / 023).
-- ============================================

-- Eine Site pro Organisation.
CREATE TABLE IF NOT EXISTS sites (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  template        TEXT NOT NULL DEFAULT 'modern',
  theme           JSONB NOT NULL DEFAULT '{}'::jsonb,
  published       BOOLEAN NOT NULL DEFAULT false,
  seo_title       TEXT,
  seo_description TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seiten der Site. Home-Seite hat path '' (leer).
CREATE TABLE IF NOT EXISTS site_pages (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id     UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  path        TEXT NOT NULL,
  sort        INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (site_id, path)
);

-- Inhaltsblöcke pro Seite (typisierter content via JSONB).
CREATE TABLE IF NOT EXISTS site_blocks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id     UUID NOT NULL REFERENCES site_pages(id) ON DELETE CASCADE,
  site_id     UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  sort        INT NOT NULL DEFAULT 0,
  content     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row Level Security
ALTER TABLE sites       ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_pages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_blocks ENABLE ROW LEVEL SECURITY;

-- Policies: jede Org verwaltet ausschließlich ihre eigenen Zeilen.
-- (Öffentliches Lesen läuft NICHT über RLS, sondern serverseitig im Renderer.)
DROP POLICY IF EXISTS "Sites by org" ON sites;
CREATE POLICY "Sites by org" ON sites
  FOR ALL USING (org_id = public.current_org_id())
         WITH CHECK (org_id = public.current_org_id());

DROP POLICY IF EXISTS "Site pages by org" ON site_pages;
CREATE POLICY "Site pages by org" ON site_pages
  FOR ALL USING (org_id = public.current_org_id())
         WITH CHECK (org_id = public.current_org_id());

DROP POLICY IF EXISTS "Site blocks by org" ON site_blocks;
CREATE POLICY "Site blocks by org" ON site_blocks
  FOR ALL USING (org_id = public.current_org_id())
         WITH CHECK (org_id = public.current_org_id());

-- Indexe
CREATE INDEX IF NOT EXISTS idx_sites_org        ON sites(org_id);
CREATE INDEX IF NOT EXISTS idx_site_pages_site  ON site_pages(site_id);
CREATE INDEX IF NOT EXISTS idx_site_blocks_page ON site_blocks(page_id, sort);

-- updated_at automatisch pflegen (set_updated_at() stammt aus Migration 003)
DROP TRIGGER IF EXISTS trg_sites_updated_at ON sites;
CREATE TRIGGER trg_sites_updated_at
  BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
