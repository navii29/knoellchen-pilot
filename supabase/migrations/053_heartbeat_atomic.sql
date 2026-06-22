-- ============================================
-- KNÖLLCHEN-PILOT — Migration 053
-- Heartbeat-Akkumulation atomar machen. Vorher las die Route active_seconds +
-- last_active, rechnete in JS und schrieb per upsert zurück (Read-Modify-Write).
-- Bei mehreren Tabs / gleichzeitigen Pings gingen Gutschriften verloren oder
-- wurden doppelt verbucht (Lost/Double Update). Diese Funktion erledigt Lücken-
-- berechnung (gedeckelt) und Schreiben in EINER atomaren Anweisung.
-- ============================================

CREATE OR REPLACE FUNCTION public.record_heartbeat(
  p_user_id UUID,
  p_org_id UUID,
  p_day DATE,
  p_path TEXT,
  p_idle_gap_s INTEGER,
  p_max_add_s INTEGER
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_activity_daily (user_id, org_id, day, active_seconds, last_active, current_path)
  VALUES (p_user_id, p_org_id, p_day, 0, now(), p_path)
  ON CONFLICT (user_id, day) DO UPDATE SET
    -- Lücke seit dem zuletzt gespeicherten last_active, > 0 und < Idle-Schwelle,
    -- pro Ping auf p_max_add_s gedeckelt. Atomar gegen die bestehende Zeile.
    active_seconds = user_activity_daily.active_seconds + (
      CASE
        WHEN EXTRACT(EPOCH FROM (now() - user_activity_daily.last_active)) > 0
         AND EXTRACT(EPOCH FROM (now() - user_activity_daily.last_active)) < p_idle_gap_s
        THEN LEAST(EXTRACT(EPOCH FROM (now() - user_activity_daily.last_active)), p_max_add_s)::int
        ELSE 0
      END
    ),
    last_active = now(),
    current_path = EXCLUDED.current_path;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_heartbeat(UUID, UUID, DATE, TEXT, INTEGER, INTEGER) TO authenticated, service_role;
