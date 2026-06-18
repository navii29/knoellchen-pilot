-- ════════════════════════════════════════════════════════════════
-- 034 — Konto-Löschung (DSGVO Art. 17, Selbstbedienung)
--   Löscht eine komplette Organisation samt aller Daten in EINER
--   Transaktion (alles-oder-nichts). Kind-Tabellen (Fotos, Events,
--   Reifen, Logs, Logins) hängen per ON DELETE CASCADE an ihren
--   Eltern und werden automatisch mitgelöscht — daher hier nur die
--   Top-Level-Tabellen in FK-sicherer Reihenfolge.
--   auth.users wird separat über die Admin-API im Endpoint entfernt
--   (saubere Session-/Auth-Bereinigung), NACHDEM public.users weg ist.
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION delete_org(p_org uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM tickets                 WHERE org_id = p_org; -- cascade: ticket_logs
  DELETE FROM damage_reports          WHERE org_id = p_org;
  DELETE FROM contracts               WHERE org_id = p_org; -- cascade: handover_photos
  DELETE FROM customers               WHERE org_id = p_org; -- cascade: customer_logins
  DELETE FROM bookings                WHERE org_id = p_org;
  DELETE FROM pricing_rules           WHERE org_id = p_org;
  DELETE FROM special_terms_templates WHERE org_id = p_org;
  DELETE FROM vehicles                WHERE org_id = p_org; -- cascade: vehicle_photos/events/tires→tire_photos/partner_pricing
  DELETE FROM sales_partners          WHERE org_id = p_org;
  DELETE FROM users                   WHERE org_id = p_org;
  DELETE FROM organizations           WHERE id = p_org;
END;
$$;
