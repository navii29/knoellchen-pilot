# GO-LIVE Checkliste — Knöllchen-Pilot

Alles, was **vor der ersten Outreach-Mail** an die Münchner Vermietungen erledigt
sein muss. Code-seitig ist der Self-Serve-Funnel (Register → Onboarding →
Dashboard mit Beispieldaten) fertig; die folgenden Schritte sind externe
Konfiguration, die nicht im Repo liegt.

## 1. Datenbank (Supabase SQL-Editor)
- [ ] Sicherstellen, dass **alle** Migrationen `001`–`026` eingespielt sind.
- [ ] **Neu:** `supabase/migrations/026_demo_data.sql` ausführen (fügt
      `organizations.demo_seeded` + `organizations.demo_data` hinzu).
      Ohne diese Spalten schlägt das Demo-Seeding still fehl (Dashboard bleibt leer).

## 2. Supabase Auth (Dashboard → Authentication)
Der Signup funktioniert jetzt **mit und ohne** E-Mail-Bestätigung — bitte bewusst entscheiden:
- [ ] **Empfohlen für Trial:** Providers → Email → **„Confirm email" AUS**.
      → Nutzer:in ist nach „Konto erstellen" sofort eingeloggt (reibungslos).
- [ ] **Alternativ:** „Confirm email" AN lassen. Dann zeigt das Register-Formular
      „Postfach prüfen", der Bestätigungslink landet auf `/auth/callback` und legt
      die Organisation automatisch an. Erfordert zuverlässigen Mailversand (Punkt 4).
- [ ] **Site URL** = Produktionsdomain (z. B. `https://app.knoellchen-pilot.de`).
- [ ] **Redirect Allow List**: Prod-Domain + Vercel-Preview-Domains, inkl. `…/auth/callback`.

## 3. Vercel — Environment Variables
Alle Variablen aus `.env.local.example` in den Vercel-Project-Settings setzen. Kritisch:
- [ ] `NEXT_PUBLIC_APP_URL` = echte Prod-Domain (**nicht** localhost, **nicht** `*.vercel.app`).
- [ ] `EMAIL_TEST_OVERRIDE` = **leer** (Code ignoriert ihn in Production zusätzlich, aber sauber leer lassen).
- [ ] `PORTAL_JWT_SECRET` (min. 24 Zeichen, `openssl rand -hex 32`) — ohne ihn crasht das Kundenportal.
- [ ] `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`.
- [ ] `POSTMARK_SERVER_TOKEN`, `POSTMARK_DEFAULT_SENDER`, `POSTMARK_WEBHOOK_SECRET`.
- [ ] `CRON_SECRET` (schützt `/api/health`, das der tägliche Vercel-Cron aufruft).
- [ ] `PORTAL_COOKIE_DOMAIN` = `.knoellchen-pilot.de` (erst wenn Custom-Domain live ist).
- [ ] `NEXT_PUBLIC_BOOKING_URL` (Calendly), optional.

## 4. Postmark (Mailversand)
- [ ] Absender-Domain `knoellchen-pilot.de` verifizieren: **DKIM** + Return-Path/**SPF** DNS-Records.
- [ ] **DMARC**-Record setzen (Zustellbarkeit).
- [ ] Message-Stream **`outbound`** existiert.
- [ ] Absender `noreply@knoellchen-pilot.de` und `kundenportal@knoellchen-pilot.de` zugelassen.
- [ ] Testmail an Gmail **und** Outlook → landet im Posteingang (nicht Spam).

## 5. Domain
- [ ] Custom-Domain in Vercel verbinden; danach `NEXT_PUBLIC_APP_URL` + `PORTAL_COOKIE_DOMAIN` final setzen.

## 6. Smoke-Test (im Inkognito-Fenster, auf der Prod-URL)
- [ ] `/register` → Konto anlegen → Onboarding (alles überspringbar) → „Zum Dashboard".
- [ ] Dashboard zeigt **Beispieldaten** (volle Flotte, Strafzettel, Marge) + gelben „Beispieldaten"-Banner.
- [ ] „Beispieldaten entfernen" → Dashboard zeigt den **Erste-Schritte**-Empty-State.
- [ ] „Beispieldaten laden" im Empty-State → Daten sind wieder da.
- [ ] Login mit falschem Passwort → **deutsche** Fehlermeldung.
- [ ] Einen Vertrags- oder Strafzettel-**PDF** in Prod erzeugen (prüft, ob Chromium auf Vercel läuft).

## 7. Rechtlich / inhaltlich vor dem Versand
- [ ] **AVV/DPA-Vorlage** bereithalten — Kunden laden ab Tag 1 fremde Personendaten (Mieter, Führerschein) hoch.
- [ ] Mind. **ein echter Pilot-Kunde** existiert (sonst „Pilotphase"-Wording anpassen). ✅ bestätigt.
- [ ] **Echoes-Integration** ist aktuell ein Stub (Dummy-GPS, kein echter API-Key). Wenn keine echte
      Verbindung besteht: in `FeatureIntegrations.tsx` das Echoes-Tile von `status="connected"` auf
      `status="soon"` stellen, damit das „Verbunden"-Badge nicht überverspricht.
- [ ] Zielliste `leads/muenchen-autovermietungen.csv` final prüfen. Die Outreach-Mail selbst textest du.
