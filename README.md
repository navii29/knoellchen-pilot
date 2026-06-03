# Knöllchen-Pilot

KI-Plattform für Autovermietungen. Knöllchen-Pilot automatisiert die lästigen
Back-Office-Prozesse rund um Fahrzeugvermietung: Strafzettel werden per Computer
Vision ausgelesen, dem richtigen Mieter zugeordnet und mit fertigen PDFs (Anschreiben,
Rechnung, Zeugenfragebogen) weiterbelastet. Dazu kommen Fahrzeug-Übergabe und
Schadenerkennung per Foto-Vergleich, Mietverträge mit digitaler Unterschrift, ein
Kundenportal für Mieter, dynamisches Pricing, ein Flottenkalender, ein KI-Assistent
sowie Anbindungen an LexOffice und die Echoes-GPS-Telematik.

## Tech-Stack

- **Next.js 14** (App Router, React, TypeScript, Tailwind CSS)
- **Supabase** (PostgreSQL, Auth, Storage)
- **Anthropic Claude** (Vision für OCR & Schadenerkennung)
- **Postmark** (E-Mail-Versand & Inbound)
- **Vercel** (Hosting + Cron)

## Lokales Setup

Voraussetzung: Node.js 18+ (LTS empfohlen).

```bash
npm install
cp .env.local.example .env.local   # Werte eintragen, siehe Kommentare in der Datei
npm run dev
```

App läuft anschließend unter http://localhost:3000.

Mindestens nötig für einen funktionierenden Start: die Supabase-Keys, der
`ANTHROPIC_API_KEY` und `PORTAL_JWT_SECRET` (sonst crasht das Kundenportal —
erzeugen mit `openssl rand -hex 32`). Details zu allen Variablen stehen als
Kommentare in `.env.local.example`.

## Externe Voraussetzungen (vor Production)

- **Supabase Auth:** E-Mail-Bestätigung aktivieren, Site-URL und Redirect-URLs
  auf die echte Domain setzen (nicht localhost / nicht *.vercel.app).
- **Postmark:** Sender-Domain verifizieren (DKIM/Return-Path), ggf. Inbound-Webhook
  einrichten.
- **Vercel:** alle Env-Vars im Projekt hinterlegen; `NEXT_PUBLIC_APP_URL` auf die
  echte Domain; `EMAIL_TEST_OVERRIDE` LEER lassen.

Vollständige Go-Live-Checkliste: siehe `docs/GO-LIVE.md`.

## Befehle

```bash
npm run dev     # Dev-Server (Hot Reload)
npm run build   # Production-Build
npm run start   # Production-Server (nach build)
npm run lint    # ESLint
```

## Repo

`navii29/knoellchen-pilot`
