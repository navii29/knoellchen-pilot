-- Onboarding wizard state on organizations.
-- onboarding_completed: once true, dashboard renders normally.
-- onboarding_step: persists wizard progress so users can resume mid-flow (1–5).

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_step SMALLINT DEFAULT 1;

-- Existing organizations that already have data created before the wizard
-- rolled out should not be forced through it. Truly empty orgs still get
-- the wizard on next login.
UPDATE organizations o
SET onboarding_completed = true,
    onboarding_step = 5
WHERE NOT COALESCE(o.onboarding_completed, false)
  AND (
    EXISTS (SELECT 1 FROM vehicles v WHERE v.org_id = o.id)
    OR EXISTS (SELECT 1 FROM customers c WHERE c.org_id = o.id)
    OR EXISTS (SELECT 1 FROM contracts ct WHERE ct.org_id = o.id)
  );
