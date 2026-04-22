# CLAUDE.md — Knöllchen-Pilot

## Was ist das?

SaaS-App für Autovermietungen die Strafzettel vollautomatisch verarbeitet.
Strafzettel rein (Upload oder E-Mail) → KI liest aus → Fahrer zuordnen → PDFs erstellen → Versenden → Zahlung tracken.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS
- **Backend:** Next.js API Routes (Route Handlers)
- **Datenbank:** Supabase (PostgreSQL + Auth + Storage)
- **KI:** Anthropic Claude Sonnet 4.6 (Vision API für Strafzettel-Auslesen)
- **PDF:** @react-pdf/renderer oder jspdf
- **Hosting:** Vercel
- **Payments:** Stripe (später)
- **E-Mail Inbound:** Mailgun Webhook (später)

## GitHub

Repo: navii29/knoellchen-pilot

## Projekt-Struktur

```
knoellchen-pilot/
├── app/
│   ├── layout.tsx                 # Root Layout mit Supabase Provider
│   ├── page.tsx                   # Landing Page (Marketing)
│   ├── login/page.tsx             # Login
│   ├── register/page.tsx          # Registrierung
│   └── dashboard/
│       ├── layout.tsx             # Dashboard Layout mit Sidebar
│       ├── page.tsx               # Dashboard Overview (Stats + Ticket-Liste)
│       ├── tickets/
│       │   └── [id]/page.tsx      # Ticket Detail
│       ├── vehicles/page.tsx      # Fahrzeuge verwalten
│       ├── bookings/page.tsx      # Buchungen verwalten + CSV Import
│       ├── upload/page.tsx        # Strafzettel hochladen
│       └── settings/page.tsx      # Einstellungen
├── components/
│   ├── landing/                   # Landing Page Komponenten
│   │   ├── Nav.tsx
│   │   ├── Hero.tsx
│   │   ├── Problem.tsx
│   │   ├── Solution.tsx
│   │   ├── DashboardPreview.tsx
│   │   ├── Pricing.tsx
│   │   ├── FAQ.tsx
│   │   └── FooterCTA.tsx
│   ├── dashboard/                 # Dashboard Komponenten
│   │   ├── Sidebar.tsx
│   │   ├── StatCard.tsx
│   │   ├── TicketList.tsx
│   │   ├── TicketRow.tsx
│   │   ├── StatusBadge.tsx
│   │   └── UploadModal.tsx
│   ├── ticket/                    # Ticket Detail Komponenten
│   │   ├── TicketDetail.tsx
│   │   ├── DriverCard.tsx
│   │   ├── ActionButtons.tsx
│   │   └── ConfidenceBanner.tsx
│   └── ui/                        # Shared UI Komponenten
│       ├── Button.tsx
│       └── Icon.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Supabase Browser Client
│   │   ├── server.ts              # Supabase Server Client
│   │   └── middleware.ts          # Auth Middleware
│   ├── anthropic.ts               # Claude Vision API Wrapper
│   ├── pdf-generator.ts           # PDF Erstellung
│   └── utils.ts                   # Helpers
├── app/api/
│   ├── tickets/
│   │   ├── route.ts               # GET (list), POST (create)
│   │   └── [id]/
│   │       ├── route.ts           # GET, PATCH, DELETE
│   │       ├── parse/route.ts     # POST — Claude Vision Auslesen
│   │       ├── match/route.ts     # POST — Fahrer zuordnen
│   │       └── documents/route.ts # POST — PDFs generieren
│   ├── bookings/
│   │   ├── route.ts               # GET, POST
│   │   └── import/route.ts        # POST — CSV Import
│   ├── vehicles/route.ts          # CRUD
│   └── webhook/
│       └── email/route.ts         # POST — Mailgun Inbound Webhook
├── .env.local.example
├── CLAUDE.md                      # Diese Datei
├── supabase-schema.sql            # Datenbank Schema
└── package.json
```

## Supabase Schema

```sql
-- Organizations (Multi-Tenant)
CREATE TABLE organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  street TEXT,
  zip TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  tax_number TEXT,
  processing_fee DECIMAL(10,2) DEFAULT 25.00,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Users
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'member', -- 'owner', 'member'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Vehicles
CREATE TABLE vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) NOT NULL,
  plate TEXT NOT NULL,
  vehicle_type TEXT, -- 'VW Golf VIII'
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, plate)
);

-- Bookings (wer hatte wann welches Auto)
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id),
  plate TEXT NOT NULL,
  renter_name TEXT NOT NULL,
  renter_email TEXT,
  renter_address TEXT,
  renter_birthday TEXT,
  renter_phone TEXT,
  renter_license TEXT,
  pickup_date DATE NOT NULL,
  return_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tickets (Strafzettel)
CREATE TABLE tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) NOT NULL,
  ticket_nr TEXT NOT NULL, -- KP-2041
  status TEXT DEFAULT 'neu', -- neu, zugeordnet, weiterbelastet, bezahlt
  
  -- Aus KI-Auslesen
  plate TEXT,
  vehicle_type TEXT,
  offense TEXT,
  offense_details TEXT,
  location TEXT,
  offense_date DATE,
  offense_time TEXT,
  authority TEXT,
  reference_nr TEXT, -- Aktenzeichen
  fine_amount DECIMAL(10,2),
  points INTEGER DEFAULT 0,
  deadline DATE,
  ai_confidence DECIMAL(3,2),
  ai_raw_response JSONB,
  
  -- Zuordnung
  booking_id UUID REFERENCES bookings(id),
  renter_name TEXT,
  renter_email TEXT,
  
  -- Dokumente
  processing_fee DECIMAL(10,2) DEFAULT 25.00,
  paid BOOLEAN DEFAULT false,
  reminder_level INTEGER DEFAULT 0, -- 0, 1, 2, 3
  
  -- Dateien (Supabase Storage Pfade)
  upload_path TEXT,        -- Original Scan/Foto
  letter_path TEXT,        -- Anschreiben PDF
  invoice_path TEXT,       -- Rechnung PDF
  questionnaire_path TEXT, -- Zeugenfragebogen PDF
  
  letter_sent BOOLEAN DEFAULT false,
  authority_sent BOOLEAN DEFAULT false,
  
  source TEXT DEFAULT 'upload', -- 'upload', 'email'
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Log
CREATE TABLE ticket_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id) NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_logs ENABLE ROW LEVEL SECURITY;

-- Policies: Jeder sieht nur seine eigene Organisation
CREATE POLICY "Users see own org" ON users
  FOR ALL USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Vehicles by org" ON vehicles
  FOR ALL USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Bookings by org" ON bookings
  FOR ALL USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Tickets by org" ON tickets
  FOR ALL USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Logs by ticket org" ON ticket_logs
  FOR ALL USING (ticket_id IN (SELECT id FROM tickets WHERE org_id = (SELECT org_id FROM users WHERE id = auth.uid())));

-- Indexes
CREATE INDEX idx_tickets_org ON tickets(org_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_bookings_plate_date ON bookings(plate, pickup_date, return_date);
CREATE INDEX idx_vehicles_plate ON vehicles(org_id, plate);
```

## API Endpoints

### POST /api/tickets/[id]/parse
Nimmt die upload_path aus dem Ticket, lädt das Bild aus Supabase Storage, schickt es an Claude Vision, speichert die extrahierten Daten.

Claude Vision Prompt:
```
Du bist ein Experte für deutsche Bußgeldbescheide und Anhörungsbögen.
Analysiere dieses Bild und extrahiere die Daten.
Antworte NUR mit JSON:
{
  "reference_nr": "Aktenzeichen",
  "authority": "Behörde",
  "plate": "Kennzeichen",
  "offense_date": "YYYY-MM-DD",
  "offense_time": "HH:MM",
  "location": "Tatort",
  "offense": "Verstoß",
  "offense_details": "Details",
  "fine_amount": 0.00,
  "points": 0,
  "deadline": "YYYY-MM-DD"
}
```

### POST /api/tickets/[id]/match
Sucht in bookings: WHERE plate = ticket.plate AND pickup_date <= ticket.offense_date AND return_date >= ticket.offense_date. Updatet ticket mit renter_name, renter_email, booking_id, status = 'zugeordnet'.

### POST /api/tickets/[id]/documents
Generiert 3 PDFs (Anschreiben, Rechnung, Zeugenfragebogen), speichert in Supabase Storage, updatet die Pfade im Ticket.

### POST /api/bookings/import
Akzeptiert CSV-Upload (Separator: Semikolon oder Komma). Erwartete Spalten: kennzeichen, mieter_name, mieter_email, mieter_adresse, abholdatum, rueckgabedatum. Erstellt/aktualisiert Bookings + Vehicles.

## Design

Das Design liegt im Ordner /design (oder als separate ZIP). Es besteht aus:
- landing.jsx + landing2.jsx — Landingpage (Nav, Hero, Problem, Solution, DashboardPreview, Pricing, FAQ, FooterCTA)
- dashboard.jsx — Sidebar + Dashboard + StatCards + TicketList
- detail.jsx — TicketDetail Drawer + UploadModal
- data.jsx — Mock-Daten (8 Tickets, 6 Drivers, Status-Konfiguration)
- icons.jsx — Icon-Komponente (nutzt lucide-react)
- app.jsx — App-Root mit Theme-System und View-Toggle

Design-Regeln:
- Primärfarbe: Teal (#0d9488)
- Font: System-UI Stack, font-display für Headings
- Tailwind CSS für alles
- lucide-react für Icons
- Status-Farben: Neu=Amber, Zugeordnet=Blue, Weiterbelastet=Violet, Bezahlt=Emerald

## .env.local

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
ANTHROPIC_API_KEY=sk-ant-...
```

## Workflow

1. User registriert sich → Supabase Auth → Organization wird erstellt
2. User lädt Fahrzeuge + Buchungen hoch (manuell oder CSV)
3. Strafzettel kommt rein (Upload in der App)
4. API /parse → Claude Vision liest den Strafzettel aus
5. API /match → Fahrer wird automatisch zugeordnet (oder manuell)
6. API /documents → 3 PDFs werden generiert
7. User reviewed und versendet (oder markiert als bezahlt)

## Befehle

```bash
npm run dev          # Lokaler Dev-Server
npm run build        # Production Build
npm run lint         # ESLint
```

## Wichtige Regeln

- TypeScript verwenden (.tsx/.ts)
- App Router (nicht Pages Router)
- Server Components wo möglich, Client Components mit 'use client' nur wenn nötig
- Supabase Client: @supabase/ssr für Server, @supabase/supabase-js für Client
- Alle API-Routes prüfen auth (Supabase Session)
- Multi-Tenant: IMMER nach org_id filtern
- Anthropic API NUR serverseitig aufrufen (nie im Client)
- Dateien in Supabase Storage, nicht lokal
