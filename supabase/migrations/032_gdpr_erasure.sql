-- ════════════════════════════════════════════════════════════════
-- 032 — GDPR Art. 17 (Recht auf Löschung)
--   Kundenlöschung darf nicht durch verknüpfte Verträge blockiert werden.
--   FK contracts.customer_id von RESTRICT (Default) auf SET NULL umstellen:
--   der Vertrag behält seinen renter_name-Snapshot (handels-/steuerrechtliche
--   Aufbewahrungspflicht), verliert aber die Verknüpfung zum gelöschten Kunden.
--   (Die sensiblen Ausweis-/Führerschein-Dateien werden vom Delete-Endpoint
--    aus dem Storage entfernt; customer_logins haben bereits ON DELETE CASCADE.)
-- ════════════════════════════════════════════════════════════════

ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_customer_id_fkey;
ALTER TABLE contracts
  ADD CONSTRAINT contracts_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
