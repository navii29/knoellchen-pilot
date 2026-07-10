-- #3 Behörden-Postanschrift am Ticket erfassen (bisher nur Name in `authority`).
-- Der Zeugenfragebogen geht an die Behörde und braucht die volle Anschrift im
-- Empfängerfeld (DIN-5008-Fensterkuvert). Straße/PLZ/Ort strukturiert, damit der
-- Empfängerblock sauber gerendert werden kann.
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS authority_street TEXT,
  ADD COLUMN IF NOT EXISTS authority_zip    TEXT,
  ADD COLUMN IF NOT EXISTS authority_city   TEXT;
