-- ============================================
-- KNÖLLCHEN-PILOT — Begleitdatei zu Migration 069 (Zusatztage)
-- MANUELLER Schritt — NICHT automatisch ausführen.
-- Reihenfolge: erst 069_contract_extra_days.sql (Schema) einspielen, dann diese
-- Prüf-Query ANSCHAUEN, dann ggf. den präzisen Fix, dann den pauschalen Backfill.
-- Setzt original_return_date für Bestandsverträge (bei Neuanlage setzt es der
-- Code bereits).
-- ============================================

-- ---------------------------------------------------------------------------
-- 1) PRÜF-QUERY (nur SELECT, ungefährlich): laufende, noch nicht zurückgegebene
--    Verträge mit GENEHMIGTER Verlängerung, bei denen der pauschale Backfill die
--    Verlängerungstage verlieren würde (return_date ist bereits das verlängerte).
-- ---------------------------------------------------------------------------
SELECT c.id, c.contract_nr, c.status,
       c.pickup_date,
       c.return_date              AS aktuelles_return,  -- = verlängert
       MIN(e.current_return_date) AS echtes_original     -- vor der Verlängerung
FROM contracts c
JOIN contract_extensions e
  ON e.contract_id = c.id AND e.status = 'bestaetigt'
WHERE c.actual_return_date IS NULL          -- noch nicht zurückgegeben
  AND c.original_return_date IS NULL        -- noch nicht gesetzt
  AND e.current_return_date IS NOT NULL
GROUP BY c.id, c.contract_nr, c.status, c.pickup_date, c.return_date
ORDER BY c.return_date;

-- ---------------------------------------------------------------------------
-- 2) PRÄZISER FIX (UPDATE) — nur ausführen, wenn die Prüf-Query Treffer hatte.
--    Setzt für diese Fälle das ECHTE Originaldatum (ältestes current_return_date
--    der genehmigten Verlängerung), damit ihre Verlängerungstage abgerechnet
--    werden. Greift nur auf noch offene, noch nicht gesetzte Verträge.
-- ---------------------------------------------------------------------------
UPDATE contracts c
SET original_return_date = sub.orig
FROM (
  SELECT contract_id, MIN(current_return_date) AS orig
  FROM contract_extensions
  WHERE status = 'bestaetigt' AND current_return_date IS NOT NULL
  GROUP BY contract_id
) sub
WHERE c.id = sub.contract_id
  AND c.actual_return_date IS NULL
  AND c.original_return_date IS NULL;

-- ---------------------------------------------------------------------------
-- 3) PAUSCHALER BACKFILL (UPDATE) — für alle übrigen Verträge ohne Originaldatum.
--    Setzt original_return_date = aktuelles return_date. Bereits durch-verlängerte/
--    abgeschlossene Verträge bleiben damit unberechnet (so gewollt — sind durch).
--    Dank "IS NULL" werden die in Schritt 2 präzise gesetzten NICHT überschrieben.
-- ---------------------------------------------------------------------------
UPDATE contracts SET original_return_date = return_date WHERE original_return_date IS NULL;
