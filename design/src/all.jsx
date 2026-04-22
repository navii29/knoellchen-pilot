// Simple Icon component using lucide UMD.
// Renders an <i data-lucide="..."> and calls lucide.createIcons() after mount.
const Icon = ({ name, size = 20, className = '', strokeWidth = 1.75, style }) => {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!ref.current || !window.lucide) return;
    ref.current.innerHTML = `<i data-lucide="${name}" style="width:${size}px;height:${size}px;stroke-width:${strokeWidth}"></i>`;
    try { window.lucide.createIcons({ attrs: { 'stroke-width': strokeWidth }, nameAttr: 'data-lucide' }); } catch (e) {}
    // size on resulting svg
    const svg = ref.current.querySelector('svg');
    if (svg) {
      svg.setAttribute('width', size);
      svg.setAttribute('height', size);
      svg.setAttribute('stroke-width', strokeWidth);
    }
  }, [name, size, strokeWidth]);
  return <span ref={ref} className={`inline-flex items-center justify-center shrink-0 ${className}`} style={{ width: size, height: size, lineHeight: 0, ...style }} />;
};

window.Icon = Icon;


// ============================================

// Mock data for the dashboard

const TICKETS = [
  {
    id: 'KP-2041',
    status: 'neu',
    plate: 'M-KP 2847',
    vehicle: 'VW Golf VIII · weiß',
    offense: 'Parken im Halteverbot',
    location: 'Leopoldstraße 82, München',
    date: '14.04.2026 · 10:42',
    authority: 'Kreisverwaltungsreferat München',
    amount: 25.00,
    fee: 25.00,
    deadline: '28.04.2026',
    driverMatched: false,
    documentsReady: false,
    received: 'vor 23 Min.',
    source: 'E-Mail',
    confidence: 0.98,
  },
  {
    id: 'KP-2040',
    status: 'neu',
    plate: 'M-AV 1204',
    vehicle: 'BMW 1er · schwarz',
    offense: 'Geschwindigkeitsüberschreitung 21 km/h',
    location: 'Landsberger Str. 155, München',
    date: '13.04.2026 · 18:17',
    authority: 'Polizeipräsidium München',
    amount: 115.00,
    fee: 25.00,
    deadline: '27.04.2026',
    driverMatched: false,
    documentsReady: false,
    received: 'vor 1 Std.',
    source: 'Upload',
    confidence: 0.96,
  },
  {
    id: 'KP-2039',
    status: 'neu',
    plate: 'M-RT 9912',
    vehicle: 'Audi A3 Sportback · grau',
    offense: 'Parken auf Gehweg',
    location: 'Türkenstraße 47, München',
    date: '12.04.2026 · 14:03',
    authority: 'Kreisverwaltungsreferat München',
    amount: 55.00,
    fee: 25.00,
    deadline: '26.04.2026',
    driverMatched: true,
    documentsReady: false,
    received: 'vor 3 Std.',
    source: 'E-Mail',
    confidence: 0.99,
  },
  {
    id: 'KP-2038',
    status: 'zugeordnet',
    plate: 'M-KP 2310',
    vehicle: 'Mercedes A-Klasse · silber',
    offense: 'Parken ohne Parkschein',
    location: 'Marienplatz 1, München',
    date: '11.04.2026 · 09:55',
    authority: 'Kreisverwaltungsreferat München',
    amount: 20.00,
    fee: 25.00,
    deadline: '25.04.2026',
    driverMatched: true,
    documentsReady: true,
    received: 'gestern',
    source: 'E-Mail',
    confidence: 0.99,
  },
  {
    id: 'KP-2037',
    status: 'weiterbelastet',
    plate: 'M-KP 0418',
    vehicle: 'Škoda Octavia · blau',
    offense: 'Rotlichtverstoß',
    location: 'Rosenheimer Str. 145, München',
    date: '09.04.2026 · 07:21',
    authority: 'Polizeipräsidium München',
    amount: 90.00,
    fee: 25.00,
    deadline: '23.04.2026',
    driverMatched: true,
    documentsReady: true,
    received: 'vor 5 Tagen',
    source: 'E-Mail',
    confidence: 0.99,
  },
  {
    id: 'KP-2036',
    status: 'weiterbelastet',
    plate: 'M-AV 6621',
    vehicle: 'VW Polo · rot',
    offense: 'Parken in Feuerwehrzufahrt',
    location: 'Schellingstraße 22, München',
    date: '08.04.2026 · 22:14',
    authority: 'Kreisverwaltungsreferat München',
    amount: 55.00,
    fee: 25.00,
    deadline: '22.04.2026',
    driverMatched: true,
    documentsReady: true,
    received: 'vor 6 Tagen',
    source: 'Upload',
    confidence: 0.99,
  },
  {
    id: 'KP-2035',
    status: 'bezahlt',
    plate: 'M-KP 7744',
    vehicle: 'Opel Corsa · weiß',
    offense: 'Parken im absoluten Halteverbot',
    location: 'Sendlinger Str. 8, München',
    date: '05.04.2026 · 16:30',
    authority: 'Kreisverwaltungsreferat München',
    amount: 25.00,
    fee: 25.00,
    deadline: '19.04.2026',
    driverMatched: true,
    documentsReady: true,
    received: 'vor 9 Tagen',
    source: 'E-Mail',
    confidence: 0.99,
  },
  {
    id: 'KP-2034',
    status: 'bezahlt',
    plate: 'M-RT 3380',
    vehicle: 'Ford Fiesta · blau',
    offense: 'Geschwindigkeitsüberschreitung 16 km/h',
    location: 'Lindwurmstraße 60, München',
    date: '02.04.2026 · 11:48',
    authority: 'Polizeipräsidium München',
    amount: 70.00,
    fee: 25.00,
    deadline: '16.04.2026',
    driverMatched: true,
    documentsReady: true,
    received: 'vor 12 Tagen',
    source: 'E-Mail',
    confidence: 0.99,
  },
];

const DRIVERS = {
  'KP-2039': { name: 'Markus Hofmann', address: 'Klenzestraße 14, 80469 München', rentalFrom: '11.04.2026 14:00', rentalTo: '13.04.2026 09:00', phone: '+49 151 28374612', license: 'DL29384756' },
  'KP-2038': { name: 'Sabine Krüger', address: 'Wörthstraße 33, 81667 München', rentalFrom: '10.04.2026 18:00', rentalTo: '12.04.2026 12:00', phone: '+49 176 44820193', license: 'DL19384755' },
  'KP-2037': { name: 'Tomasz Nowak', address: 'Fraunhoferstraße 7, 80469 München', rentalFrom: '08.04.2026 08:30', rentalTo: '10.04.2026 20:00', phone: '+49 160 99103772', license: 'DL88293746' },
  'KP-2036': { name: 'Chiara Rossi', address: 'Amalienstraße 71, 80799 München', rentalFrom: '07.04.2026 10:00', rentalTo: '09.04.2026 15:30', phone: '+49 152 12374981', license: 'DL01928374' },
  'KP-2035': { name: 'Julia Bergmann', address: 'Baaderstraße 12, 80469 München', rentalFrom: '05.04.2026 09:00', rentalTo: '06.04.2026 17:00', phone: '+49 157 83920174', license: 'DL37281920' },
  'KP-2034': { name: 'Daniel Weiß', address: 'Schleißheimer Str. 211, 80797 München', rentalFrom: '01.04.2026 12:00', rentalTo: '03.04.2026 14:00', phone: '+49 170 55829301', license: 'DL62817293' },
};

const STATUS_META = {
  neu:             { label: 'Neu',            dot: '#f59e0b', bg: 'bg-amber-50',  text: 'text-amber-700',  ring: 'ring-amber-200'  },
  zugeordnet:      { label: 'Zugeordnet',     dot: '#2563eb', bg: 'bg-blue-50',   text: 'text-blue-700',   ring: 'ring-blue-200'   },
  weiterbelastet:  { label: 'Weiterbelastet', dot: '#7c3aed', bg: 'bg-violet-50', text: 'text-violet-700', ring: 'ring-violet-200' },
  bezahlt:         { label: 'Bezahlt',        dot: '#059669', bg: 'bg-emerald-50',text: 'text-emerald-700',ring: 'ring-emerald-200'},
};

window.TICKETS = TICKETS;
window.DRIVERS = DRIVERS;
window.STATUS_META = STATUS_META;


// ============================================

// Landing page component for Knöllchen-Pilot
const { useState, useEffect, useRef } = React;

// --- Small helpers ---
const FadeUp = ({ children, delay = 0, className = '' }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { setTimeout(() => setVisible(true), delay); io.unobserve(el); } });
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);
  return <div ref={ref} className={`fade-up ${visible ? 'in' : ''} ${className}`}>{children}</div>;
};

const Logo = ({ theme }) => (
  <div className="flex items-center gap-2">
    <div className="relative w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: theme.primary }}>
      <Icon name="sparkles" size={18} className="text-white" strokeWidth={2.25} />
    </div>
    <span className="font-display font-bold text-[17px] tracking-tight">Knöllchen-Pilot</span>
  </div>
);

// --- Nav ---
const Nav = ({ theme, onDemo }) => (
  <header className="sticky top-0 z-40 backdrop-blur-md bg-stone-50/80 border-b border-stone-200/70">
    <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      <Logo theme={theme} />
      <nav className="hidden md:flex items-center gap-8 text-sm text-stone-600">
        <a href="#problem" className="hover:text-stone-900">Problem</a>
        <a href="#loesung" className="hover:text-stone-900">Lösung</a>
        <a href="#dashboard" className="hover:text-stone-900">Dashboard</a>
        <a href="#preise" className="hover:text-stone-900">Preise</a>
        <a href="#faq" className="hover:text-stone-900">FAQ</a>
      </nav>
      <div className="flex items-center gap-2">
        <button onClick={onDemo} className="hidden sm:inline-flex items-center gap-1.5 text-sm text-stone-700 hover:text-stone-900 px-3 py-1.5 rounded-md">
          <Icon name="play" size={14} /> Live-Demo
        </button>
        <button className="inline-flex items-center gap-1.5 text-sm text-white px-3.5 py-1.5 rounded-md font-medium shadow-sm" style={{ background: theme.primary }}>
          Kostenlos testen <Icon name="arrow-right" size={14} />
        </button>
      </div>
    </div>
  </header>
);

// --- Hero ---
const Hero = ({ theme }) => (
  <section className="relative overflow-hidden">
    <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" />
    <div className="absolute -top-40 -right-40 w-[560px] h-[560px] rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: theme.primary }} />
    <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32">
      <div className="max-w-3xl">
        <FadeUp>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white ring-1 ring-stone-200 text-xs font-medium text-stone-700 shadow-sm">
            <span className="relative inline-flex w-1.5 h-1.5 rounded-full text-emerald-500 pulse-dot"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /></span>
            Für Autovermietungen in Deutschland
          </div>
        </FadeUp>
        <FadeUp delay={80}>
          <h1 className="mt-6 font-display font-extrabold text-[64px] md:text-[88px] leading-[0.92] tracking-tight">
            Strafzettel?<br />
            <span style={{ color: theme.primary }}>Erledigt.</span>
          </h1>
        </FadeUp>
        <FadeUp delay={160}>
          <p className="mt-7 text-xl md:text-2xl text-stone-600 leading-snug max-w-2xl text-balance">
            Die KI-Software, die Strafzettel für Autovermietungen vollautomatisch bearbeitet —
            von der E-Mail der Behörde bis zum Zeugenfragebogen zurück.
          </p>
        </FadeUp>
        <FadeUp delay={240}>
          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <form onSubmit={(e) => e.preventDefault()} className="flex items-center gap-2 bg-white rounded-xl p-1.5 ring-1 ring-stone-200 shadow-sm">
              <input type="email" placeholder="ihre@autovermietung.de" className="px-3 py-2.5 outline-none text-sm w-64 placeholder:text-stone-400 bg-transparent" />
              <button className="inline-flex items-center gap-1.5 text-white px-4 py-2.5 rounded-lg text-sm font-semibold" style={{ background: theme.primary }}>
                Kostenlos testen <Icon name="arrow-right" size={14} />
              </button>
            </form>
            <div className="flex items-center gap-5 text-sm text-stone-500 px-2">
              <span className="inline-flex items-center gap-1.5"><Icon name="check" size={14} className="text-emerald-600" /> 30 Tage gratis</span>
              <span className="inline-flex items-center gap-1.5"><Icon name="check" size={14} className="text-emerald-600" /> Keine Kreditkarte</span>
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={320}>
          <div className="mt-14 grid grid-cols-3 gap-8 max-w-xl">
            <div>
              <div className="font-display text-3xl font-bold">30 s</div>
              <div className="text-sm text-stone-500 mt-1">pro Strafzettel<br/>statt 45 Minuten</div>
            </div>
            <div>
              <div className="font-display text-3xl font-bold">98,6%</div>
              <div className="text-sm text-stone-500 mt-1">OCR-Genauigkeit<br/>beim Auslesen</div>
            </div>
            <div>
              <div className="font-display text-3xl font-bold">+25 €</div>
              <div className="text-sm text-stone-500 mt-1">Gebühr pro Fall<br/>weiterbelastet</div>
            </div>
          </div>
        </FadeUp>
      </div>

      {/* Trust strip */}
      <FadeUp delay={400}>
        <div className="mt-20 pt-8 border-t border-stone-200">
          <div className="text-xs uppercase tracking-widest text-stone-400 mb-5">Vertrauen von über 120 Autovermietungen</div>
          <div className="flex flex-wrap items-center gap-x-10 gap-y-4 text-stone-400">
            {['Stadtflotte München','Alpenrent','RhineCars','NordMobil','Bayern-Auto','CityDrive GmbH'].map(n => (
              <span key={n} className="font-display font-semibold text-lg">{n}</span>
            ))}
          </div>
        </div>
      </FadeUp>
    </div>
  </section>
);

// --- Problem ---
const Problem = () => {
  const items = [
    { icon: 'mail-open', label: 'E-Mail öffnen', detail: 'Zeugenfragebogen als PDF-Anhang. Manuell lesen.' },
    { icon: 'keyboard', label: 'Daten abtippen', detail: 'Kennzeichen, Datum, Verstoß, Betrag — in Excel.' },
    { icon: 'folder-search', label: 'Mietvertrag suchen', detail: 'Wer hatte das Auto am 14.04. um 10:42?' },
    { icon: 'file-pen-line', label: 'Briefe schreiben', detail: 'Anschreiben, Rechnung, Antwort an Behörde.' },
    { icon: 'alarm-clock', label: 'Fristen merken', detail: '14 Tage. Vergessen = 40 € Verwarnung für Sie.' },
    { icon: 'receipt-text', label: 'Gebühr nachverfolgen', detail: 'Hat der Mieter die 25 € überwiesen?' },
  ];
  return (
    <section id="problem" className="relative border-t border-stone-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
        <FadeUp>
          <div className="text-xs uppercase tracking-widest text-stone-500 mb-3">Das Problem</div>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight max-w-3xl text-balance">
            Sie verbringen Stunden mit Strafzetteln<br/>
            <span className="text-stone-400">statt mit Ihrem Geschäft.</span>
          </h2>
          <p className="mt-5 text-lg text-stone-600 max-w-2xl">
            Jeder Strafzettel frisst 30–45 Minuten. Bei 40 Fällen im Monat sind das über 25 Arbeitsstunden — nur für Papierkram.
          </p>
        </FadeUp>

        <div className="mt-14 grid md:grid-cols-3 gap-px bg-stone-200 rounded-2xl overflow-hidden ring-1 ring-stone-200">
          {items.map((it, i) => (
            <FadeUp key={it.label} delay={i * 60}>
              <div className="bg-white p-7 h-full">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700">
                    <Icon name={it.icon} size={18} />
                  </div>
                  <div className="font-display font-semibold text-[17px]">{it.label}</div>
                </div>
                <div className="mt-3 text-sm text-stone-500 leading-relaxed">{it.detail}</div>
              </div>
            </FadeUp>
          ))}
        </div>

        <FadeUp delay={200}>
          <div className="mt-10 flex items-center gap-4 p-5 rounded-xl bg-stone-950 text-stone-100">
            <div className="w-11 h-11 rounded-full bg-amber-400/10 flex items-center justify-center text-amber-400">
              <Icon name="clock" size={22} />
            </div>
            <div className="flex-1">
              <div className="font-display font-semibold">30–45 Minuten pro Strafzettel.</div>
              <div className="text-sm text-stone-400">Zeit, die Sie nie wieder zurückbekommen.</div>
            </div>
            <div className="font-display text-2xl font-bold text-amber-400 hidden sm:block">-€</div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
};

// --- Solution: 5 steps ---
const Solution = ({ theme }) => {
  const steps = [
    { icon: 'mail', title: 'E-Mail kommt rein', body: 'Behörde schickt Zeugenfragebogen. Wir empfangen an Ihre dedizierte Knöllchen-Adresse.', tag: 'Eingang' },
    { icon: 'scan-text', title: 'KI liest alles aus', body: 'Kennzeichen, Datum, Uhrzeit, Tatort, Verstoß, Bußgeld. Genauigkeit 98,6 %.', tag: 'OCR' },
    { icon: 'user-check', title: 'Fahrer zuordnen', body: 'Abgleich mit Ihren Mietverträgen. Richtiger Mieter wird automatisch gefunden.', tag: 'Matching' },
    { icon: 'file-stack', title: 'Dokumente erstellen', body: 'Anschreiben an Mieter, Rechnung (Bußgeld + 25 € Gebühr), Antwort an Behörde.', tag: 'PDFs' },
    { icon: 'send', title: 'Versand & Überwachung', body: 'E-Mails raus. Fristen, Zahlungen und Mahnungen laufen automatisch weiter.', tag: 'Automation' },
  ];
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % steps.length), 3200);
    return () => clearInterval(t);
  }, [steps.length]);

  return (
    <section id="loesung" className="relative border-t border-stone-200 bg-stone-50">
      <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
        <FadeUp>
          <div className="text-xs uppercase tracking-widest text-stone-500 mb-3">Die Lösung</div>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight max-w-3xl text-balance">
            Fünf Schritte.<br/>
            <span style={{ color: theme.primary }}>Null Handarbeit.</span>
          </h2>
        </FadeUp>

        <div className="mt-16 grid lg:grid-cols-[1fr_1.2fr] gap-10 items-start">
          {/* Left: steps list */}
          <div className="space-y-3">
            {steps.map((s, i) => {
              const isActive = i === active;
              return (
                <button key={s.title} onClick={() => setActive(i)} className={`w-full text-left rounded-xl p-5 transition-all ring-1 ${isActive ? 'bg-white ring-stone-300 shadow-sm' : 'bg-transparent ring-stone-200 hover:bg-white/60'}`}>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center font-mono text-sm font-semibold"
                         style={{ background: isActive ? theme.primary : '#e7e5e4', color: isActive ? 'white' : '#57534e' }}>
                      0{i+1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-display font-semibold text-[17px]">{s.title}</div>
                        <span className="text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">{s.tag}</span>
                      </div>
                      <div className="mt-1 text-sm text-stone-600 leading-relaxed">{s.body}</div>
                    </div>
                    <Icon name="arrow-right" size={16} className={isActive ? '' : 'opacity-0'} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: visual */}
          <div className="sticky top-24">
            <SolutionVisual active={active} steps={steps} theme={theme} />
          </div>
        </div>
      </div>
    </section>
  );
};

const SolutionVisual = ({ active, steps, theme }) => {
  return (
    <div className="relative rounded-2xl bg-white ring-1 ring-stone-200 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)] overflow-hidden">
      {/* top chrome */}
      <div className="flex items-center gap-1.5 px-4 h-9 border-b border-stone-200 bg-stone-50">
        <span className="w-2.5 h-2.5 rounded-full bg-stone-300" />
        <span className="w-2.5 h-2.5 rounded-full bg-stone-300" />
        <span className="w-2.5 h-2.5 rounded-full bg-stone-300" />
        <div className="ml-3 text-xs font-mono text-stone-500">knoellchen-pilot.de/automation · KP-2041</div>
      </div>

      <div className="p-6 md:p-8 min-h-[460px]">
        {active === 0 && <StepEmail theme={theme} />}
        {active === 1 && <StepOCR theme={theme} />}
        {active === 2 && <StepMatch theme={theme} />}
        {active === 3 && <StepDocs theme={theme} />}
        {active === 4 && <StepSend theme={theme} />}
      </div>

      {/* progress */}
      <div className="flex gap-1 px-6 pb-5">
        {steps.map((_, i) => (
          <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-stone-200">
            <div className="h-full transition-all" style={{ width: i <= active ? '100%' : '0%', background: theme.primary }} />
          </div>
        ))}
      </div>
    </div>
  );
};

const StepEmail = ({ theme }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center"><Icon name="mail" size={20} /></div>
      <div>
        <div className="font-display font-semibold">Zeugenfragebogen eingegangen</div>
        <div className="text-xs text-stone-500 font-mono">eingang@kvr-muenchen.de → tickets@stadtflotte.knp.de</div>
      </div>
    </div>
    <div className="rounded-xl ring-1 ring-stone-200 overflow-hidden">
      <div className="bg-stone-50 px-4 py-2 text-xs text-stone-600 border-b border-stone-200 flex items-center justify-between">
        <span>Zeugenfragebogen_Az-KVR-2026-04-12847.pdf</span>
        <span className="font-mono">218 KB</span>
      </div>
      <div className="p-5 space-y-2 font-mono text-[13px] text-stone-700">
        <div>AZ: <span className="text-stone-500">KVR-2026-04-12847</span></div>
        <div>Kennzeichen: <span className="font-semibold">M-KP 2847</span></div>
        <div>Tatzeit: <span>14.04.2026, 10:42 Uhr</span></div>
        <div>Tatort: <span>Leopoldstraße 82, 80802 München</span></div>
        <div>Tatvorwurf: <span>Parken im Halteverbot</span></div>
        <div>Bußgeld: <span>25,00 €</span></div>
        <div className="text-stone-400 pt-2">Antwortfrist: 28.04.2026</div>
      </div>
    </div>
  </div>
);

const StepOCR = ({ theme }) => {
  const rows = [
    ['Kennzeichen', 'M-KP 2847', 0.99],
    ['Tatzeit', '14.04.2026, 10:42', 0.98],
    ['Tatort', 'Leopoldstraße 82, München', 0.97],
    ['Verstoß', 'Parken im Halteverbot', 0.99],
    ['Behörde', 'Kreisverwaltungsref. München', 0.99],
    ['Bußgeld', '25,00 €', 0.99],
    ['Aktenzeichen', 'KVR-2026-04-12847', 0.98],
  ];
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: theme.primaryTint, color: theme.primary }}><Icon name="scan-text" size={20} /></div>
        <div>
          <div className="font-display font-semibold">Strukturierte Daten extrahiert</div>
          <div className="text-xs text-stone-500">Knöllchen-OCR · Durchschnitt 98,6% Confidence</div>
        </div>
      </div>
      <div className="rounded-xl ring-1 ring-stone-200 divide-y divide-stone-100">
        {rows.map(([k, v, c]) => (
          <div key={k} className="flex items-center px-4 py-2.5 text-sm">
            <div className="w-36 text-stone-500">{k}</div>
            <div className="flex-1 font-mono text-stone-800">{v}</div>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 rounded-full bg-stone-100 overflow-hidden">
                <div className="h-full" style={{ width: `${c*100}%`, background: theme.primary }} />
              </div>
              <div className="font-mono text-xs text-stone-500 w-10 text-right">{Math.round(c*100)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const StepMatch = ({ theme }) => (
  <div className="space-y-5">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center"><Icon name="user-check" size={20} /></div>
      <div>
        <div className="font-display font-semibold">Fahrer automatisch zugeordnet</div>
        <div className="text-xs text-stone-500">Abgleich mit 142 Mietverträgen · 1 eindeutiger Treffer</div>
      </div>
    </div>
    <div className="rounded-xl ring-1 ring-stone-200 p-5 bg-gradient-to-br from-white to-stone-50">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-stone-900 text-white flex items-center justify-center font-display font-semibold">MH</div>
        <div className="flex-1">
          <div className="font-display font-semibold text-[17px]">Markus Hofmann</div>
          <div className="text-sm text-stone-500">Klenzestraße 14, 80469 München</div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div className="bg-white ring-1 ring-stone-200 rounded-lg p-3">
              <div className="text-stone-500">Mietbeginn</div>
              <div className="font-mono font-medium mt-0.5">11.04.2026 14:00</div>
            </div>
            <div className="bg-white ring-1 ring-stone-200 rounded-lg p-3">
              <div className="text-stone-500">Mietende</div>
              <div className="font-mono font-medium mt-0.5">13.04.2026 09:00</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
          <Icon name="check" size={12} /> Match
        </div>
      </div>
      {/* tatzeit line */}
      <div className="mt-5 relative h-8">
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-stone-100" />
        <div className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full" style={{ left: '18%', right: '36%', background: theme.primary }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white ring-2" style={{ left: '18%', borderColor: theme.primary, boxShadow: 'inset 0 0 0 2px white' }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white ring-2" style={{ left: '64%', borderColor: theme.primary }} />
        <div className="absolute -top-4 text-[10px] font-mono text-stone-500" style={{ left: '14%' }}>Miete</div>
        <div className="absolute -bottom-4 text-[10px] font-mono" style={{ left: '40%', color: theme.primary }}>Tatzeit 10:42</div>
        <div className="absolute -top-4 text-[10px] font-mono text-stone-500" style={{ left: '60%' }}>Rückgabe</div>
      </div>
    </div>
  </div>
);

const StepDocs = ({ theme }) => {
  const docs = [
    { icon: 'file-text', title: 'Anschreiben an Mieter', desc: 'Hinweis + Zahlungsaufforderung', tag: 'PDF' },
    { icon: 'receipt-text', title: 'Rechnung', desc: '25,00 € Bußgeld + 25,00 € Gebühr', tag: 'PDF', highlight: true },
    { icon: 'building-2', title: 'Antwort an Behörde', desc: 'Zeugenfragebogen ausgefüllt', tag: 'PDF' },
  ];
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center"><Icon name="file-stack" size={20} /></div>
        <div>
          <div className="font-display font-semibold">Drei Dokumente erstellt</div>
          <div className="text-xs text-stone-500">Automatisch mit Ihren Briefkopfvorlagen</div>
        </div>
      </div>
      <div className="grid gap-3">
        {docs.map(d => (
          <div key={d.title} className={`flex items-center gap-4 p-4 rounded-xl ring-1 ${d.highlight ? 'bg-white ring-stone-300 shadow-sm' : 'bg-white ring-stone-200'}`}>
            <div className="w-11 h-11 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center"><Icon name={d.icon} size={20} /></div>
            <div className="flex-1">
              <div className="font-display font-semibold text-[15px]">{d.title}</div>
              <div className="text-sm text-stone-500">{d.desc}</div>
            </div>
            <span className="text-[10px] uppercase tracking-wider font-mono px-2 py-1 bg-stone-100 rounded">{d.tag}</span>
          </div>
        ))}
      </div>
      <div className="text-xs text-stone-500 flex items-center gap-2">
        <Icon name="shield-check" size={14} /> Dokumente sind DSGVO-konform und rechtssicher vorformuliert.
      </div>
    </div>
  );
};

const StepSend = ({ theme }) => (
  <div className="space-y-5">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center"><Icon name="send" size={20} /></div>
      <div>
        <div className="font-display font-semibold">Versand abgeschlossen</div>
        <div className="text-xs text-stone-500">2 E-Mails raus · Fristenkontrolle aktiv</div>
      </div>
    </div>
    <div className="space-y-2">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50/50 ring-1 ring-emerald-100">
        <Icon name="check" size={16} className="text-emerald-700" />
        <div className="flex-1 text-sm">
          <span className="font-medium">An Mieter:</span> <span className="font-mono text-stone-600">markus.hofmann@web.de</span>
        </div>
        <span className="text-xs font-mono text-stone-500">10:42:12</span>
      </div>
      <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50/50 ring-1 ring-emerald-100">
        <Icon name="check" size={16} className="text-emerald-700" />
        <div className="flex-1 text-sm">
          <span className="font-medium">An Behörde:</span> <span className="font-mono text-stone-600">bussgeld@kvr.muenchen.de</span>
        </div>
        <span className="text-xs font-mono text-stone-500">10:42:14</span>
      </div>
      <div className="flex items-center gap-3 p-3 rounded-lg bg-white ring-1 ring-stone-200">
        <Icon name="alarm-clock" size={16} className="text-stone-500" />
        <div className="flex-1 text-sm">Frist überwacht — Erinnerung am <span className="font-mono">26.04.2026</span></div>
      </div>
      <div className="flex items-center gap-3 p-3 rounded-lg bg-white ring-1 ring-stone-200">
        <Icon name="wallet" size={16} className="text-stone-500" />
        <div className="flex-1 text-sm">Zahlung der 25 € Gebühr wird überwacht</div>
      </div>
    </div>
    <div className="mt-4 flex items-center justify-between p-4 rounded-xl text-white" style={{ background: theme.primary }}>
      <div>
        <div className="text-xs uppercase tracking-wider opacity-80">Gesamtdauer</div>
        <div className="font-display text-2xl font-bold">28 Sekunden</div>
      </div>
      <Icon name="zap" size={28} />
    </div>
  </div>
);

window.LandingChunkA = { FadeUp, Logo, Nav, Hero, Problem, Solution };


// ============================================

// Landing: Dashboard preview, pricing, FAQ, footer CTA
const { FadeUp } = window.LandingChunkA;

const DashboardPreview = ({ theme, onDemo }) => {
  return (
    <section id="dashboard" className="relative border-t border-stone-200 bg-stone-950 text-stone-100 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.06]" style={{
        backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
        backgroundSize: '48px 48px'
      }} />
      <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-32">
        <FadeUp>
          <div className="text-xs uppercase tracking-widest text-stone-400 mb-3">Dashboard</div>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight max-w-3xl text-balance">
            Ihre gesamte Strafzettel-<br/>
            Operation auf einem Screen.
          </h2>
          <p className="mt-5 text-lg text-stone-400 max-w-2xl">
            Eingänge, Zuordnungen, Gebühren, Fristen — alles in Echtzeit. Ein Klick zur Detailansicht.
          </p>
        </FadeUp>

        <FadeUp delay={150}>
          <div className="mt-14 rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)]">
            <MiniDashboard theme={theme} />
          </div>
        </FadeUp>

        <FadeUp delay={250}>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-xl bg-white/5 ring-1 ring-white/10">
            <div>
              <div className="font-display font-semibold text-lg">Live-Demo ausprobieren</div>
              <div className="text-sm text-stone-400">Klicken Sie sich durch echte Strafzettel, Detailansichten und Upload-Flow.</div>
            </div>
            <button onClick={onDemo} className="inline-flex items-center gap-2 px-5 py-3 rounded-lg font-semibold text-stone-900 bg-white hover:bg-stone-100">
              <Icon name="play" size={16} /> App-Demo öffnen
            </button>
          </div>
        </FadeUp>
      </div>
    </section>
  );
};

const MiniDashboard = ({ theme }) => {
  const stats = [
    { label: 'Neue Eingänge', value: '3', icon: 'inbox', color: '#f59e0b' },
    { label: 'Offen', value: '5', icon: 'hourglass', color: '#60a5fa' },
    { label: 'Bearbeitungsgebühren', value: '325 €', icon: 'coins', color: theme.primary },
    { label: 'Gesamtvolumen', value: '1.480 €', icon: 'trending-up', color: '#34d399' },
  ];
  const rows = [
    { status: 'neu',            plate: 'M-KP 2847', off: 'Parken im Halteverbot',    amt: '50,00 €', when: 'vor 23 Min.' },
    { status: 'neu',            plate: 'M-AV 1204', off: 'Geschw. +21 km/h',          amt: '140,00 €', when: 'vor 1 Std.' },
    { status: 'neu',            plate: 'M-RT 9912', off: 'Parken auf Gehweg',         amt: '80,00 €',  when: 'vor 3 Std.' },
    { status: 'zugeordnet',     plate: 'M-KP 2310', off: 'Parken ohne Parkschein',    amt: '45,00 €',  when: 'gestern' },
    { status: 'weiterbelastet', plate: 'M-KP 0418', off: 'Rotlichtverstoß',           amt: '115,00 €', when: 'vor 5 Tagen' },
    { status: 'bezahlt',        plate: 'M-KP 7744', off: 'Absolutes Halteverbot',     amt: '50,00 €',  when: 'vor 9 Tagen' },
  ];
  return (
    <div className="bg-white text-stone-900">
      {/* top bar */}
      <div className="flex items-center justify-between px-5 h-11 border-b border-stone-200 bg-stone-50">
        <div className="flex items-center gap-4">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-stone-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-stone-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-stone-300" />
          </div>
          <div className="text-xs font-mono text-stone-500">app.knoellchen-pilot.de/dashboard</div>
        </div>
        <div className="text-xs text-stone-500">Stadtflotte München · 14.04.2026</div>
      </div>
      <div className="grid grid-cols-[200px_1fr]">
        {/* sidebar */}
        <div className="bg-stone-50 border-r border-stone-200 p-3 text-sm">
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: theme.primary }}>
              <Icon name="sparkles" size={13} className="text-white" />
            </div>
            <span className="font-display font-semibold text-[13px]">Knöllchen-Pilot</span>
          </div>
          <div className="mt-3 space-y-0.5">
            {[
              ['layout-dashboard','Dashboard', true],
              ['file-text','Strafzettel', false, '12'],
              ['car','Fahrzeuge', false],
              ['settings','Einstellungen', false],
            ].map(([i, l, a, b]) => (
              <div key={l} className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${a ? 'bg-white ring-1 ring-stone-200 font-medium' : 'text-stone-600'}`}>
                <Icon name={i} size={14} />
                <span className="text-[13px]">{l}</span>
                {b && <span className="ml-auto text-[10px] font-mono px-1.5 rounded bg-stone-200 text-stone-700">{b}</span>}
              </div>
            ))}
          </div>
        </div>
        {/* main */}
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display font-bold text-xl">Dashboard</div>
              <div className="text-xs text-stone-500">Heute, 14.04.2026</div>
            </div>
            <button className="text-xs px-3 py-1.5 rounded-md text-white inline-flex items-center gap-1.5" style={{ background: theme.primary }}>
              <Icon name="upload" size={12} /> Strafzettel hochladen
            </button>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-3">
            {stats.map(s => (
              <div key={s.label} className="rounded-lg ring-1 ring-stone-200 p-3 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-stone-500">{s.label}</span>
                  <Icon name={s.icon} size={13} style={{ color: s.color }} />
                </div>
                <div className="mt-1 font-display font-bold text-xl">{s.value}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg ring-1 ring-stone-200 bg-white overflow-hidden">
            <div className="px-4 py-2.5 text-xs text-stone-500 border-b border-stone-100 flex items-center justify-between">
              <span className="font-medium text-stone-700">Strafzettel</span>
              <span>Filter: Alle · Heute</span>
            </div>
            <div>
              {rows.map(r => {
                const m = STATUS_META[r.status];
                return (
                  <div key={r.plate + r.off} className="grid grid-cols-[100px_1fr_auto_auto_auto] items-center gap-3 px-4 py-2.5 border-b border-stone-50 last:border-0 text-[13px]">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-1.5 py-0.5 rounded ${m.bg} ${m.text}`}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} /> {m.label}
                    </span>
                    <span className="font-mono font-semibold">{r.plate}</span>
                    <span className="text-stone-600 truncate">{r.off}</span>
                    <span className="font-mono tabular-nums w-20 text-right">{r.amt}</span>
                    <span className="text-xs text-stone-400 w-20 text-right">{r.when}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Pricing = ({ theme }) => {
  const tiers = [
    { name: 'Starter', price: 99, desc: 'Für kleine Vermietungen', limit: 'Bis 10 Strafzettel / Monat', features: ['Automatische OCR','Fahrer-Zuordnung','3 Dokumentvorlagen','E-Mail-Support'] },
    { name: 'Pro', price: 249, desc: 'Am beliebtesten', limit: 'Bis 50 Strafzettel / Monat', features: ['Alles aus Starter','Automatische Mahnungen','Eigene Briefkopf-Vorlagen','Priorisierter Support','API-Zugang'], recommended: true },
    { name: 'Business', price: 499, desc: 'Für große Flotten', limit: 'Unbegrenzte Strafzettel', features: ['Alles aus Pro','Multi-Standort','SSO & Audit-Log','Dedizierter Account-Manager','SLA 99,9 %'] },
  ];
  return (
    <section id="preise" className="relative border-t border-stone-200 bg-stone-50">
      <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
        <FadeUp>
          <div className="text-xs uppercase tracking-widest text-stone-500 mb-3">Preise</div>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight max-w-3xl text-balance">
            Faire Preise.<br/>Jeder Fall refinanziert sich selbst.
          </h2>
          <p className="mt-5 text-lg text-stone-600 max-w-2xl">
            Mit 25 € Bearbeitungsgebühr pro Fall rechnet sich Knöllchen-Pilot ab dem 4. Strafzettel im Monat.
          </p>
        </FadeUp>
        <div className="mt-14 grid md:grid-cols-3 gap-5">
          {tiers.map((t, i) => (
            <FadeUp key={t.name} delay={i * 80}>
              <div className={`relative rounded-2xl p-7 h-full flex flex-col ${t.recommended ? 'bg-stone-950 text-stone-100 ring-1 ring-stone-950' : 'bg-white ring-1 ring-stone-200'}`}>
                {t.recommended && (
                  <span className="absolute -top-3 left-7 text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full text-white" style={{ background: theme.primary }}>Empfohlen</span>
                )}
                <div className="flex items-baseline justify-between">
                  <div className="font-display font-bold text-2xl">{t.name}</div>
                  <div className={`text-xs ${t.recommended ? 'text-stone-400' : 'text-stone-500'}`}>{t.desc}</div>
                </div>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-display font-extrabold text-5xl tracking-tight">{t.price} €</span>
                  <span className={`text-sm ${t.recommended ? 'text-stone-400' : 'text-stone-500'}`}>/ Monat</span>
                </div>
                <div className={`mt-2 text-sm ${t.recommended ? 'text-stone-300' : 'text-stone-600'}`}>{t.limit}</div>
                <ul className={`mt-6 space-y-2.5 text-sm flex-1 ${t.recommended ? 'text-stone-200' : 'text-stone-700'}`}>
                  {t.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Icon name="check" size={15} style={{ color: t.recommended ? theme.primaryLight : theme.primary }} className="mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button className={`mt-7 w-full py-3 rounded-lg font-semibold text-sm ${t.recommended ? 'text-stone-900 bg-white hover:bg-stone-100' : 'text-white'}`} style={!t.recommended ? { background: theme.primary } : {}}>
                  {t.recommended ? 'Pro starten' : `${t.name} starten`}
                </button>
              </div>
            </FadeUp>
          ))}
        </div>
        <FadeUp delay={300}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-stone-500">
            <span className="inline-flex items-center gap-1.5"><Icon name="check" size={14} className="text-emerald-600" /> 30 Tage gratis testen</span>
            <span className="inline-flex items-center gap-1.5"><Icon name="check" size={14} className="text-emerald-600" /> Monatlich kündbar</span>
            <span className="inline-flex items-center gap-1.5"><Icon name="check" size={14} className="text-emerald-600" /> Rechnung auf Firma</span>
            <span className="inline-flex items-center gap-1.5"><Icon name="check" size={14} className="text-emerald-600" /> DSGVO-konform</span>
          </div>
        </FadeUp>
      </div>
    </section>
  );
};

const FAQ = () => {
  const items = [
    { q: 'Wie lange dauert die Einrichtung?', a: 'Etwa 15 Minuten. Sie hinterlegen Ihre Weiterleitungs-E-Mail, laden Ihre aktuellen Mietverträge hoch und wählen Ihren Briefkopf. Dann läuft es.' },
    { q: 'Was brauche ich dafür?', a: 'Nur eine E-Mail-Adresse, an die Behörden Zeugenfragebögen schicken. Alles andere übernimmt Knöllchen-Pilot.' },
    { q: 'Ist das DSGVO-konform?', a: 'Ja. Alle Daten liegen ausschließlich auf deutschen Servern (Frankfurt/Nürnberg), verschlüsselt nach BSI-Standard. Auftragsverarbeitungsvertrag inklusive.' },
    { q: 'Kann ich das vorher testen?', a: 'Ja — 30 Tage kostenlos, ohne Kreditkarte. Sie können bis zu 10 Strafzettel bearbeiten und sehen, wie es in Ihrem Alltag funktioniert.' },
    { q: 'Was, wenn die KI falsch liest?', a: 'Bei Confidence unter 95 % wird der Fall automatisch zur manuellen Prüfung vorgelegt. Sie haben immer die letzte Kontrolle.' },
    { q: 'Wie läuft die Zahlung der 25 € Gebühr?', a: 'Die Gebühr wird dem Mieter zusammen mit dem Bußgeld in Rechnung gestellt. Knöllchen-Pilot überwacht Zahlungseingänge und mahnt automatisch.' },
  ];
  const [open, setOpen] = React.useState(0);
  return (
    <section id="faq" className="relative border-t border-stone-200 bg-white">
      <div className="max-w-4xl mx-auto px-6 py-24 md:py-32">
        <FadeUp>
          <div className="text-xs uppercase tracking-widest text-stone-500 mb-3">FAQ</div>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">Häufige Fragen.</h2>
        </FadeUp>
        <div className="mt-12 divide-y divide-stone-200 ring-1 ring-stone-200 rounded-2xl overflow-hidden">
          {items.map((it, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className="bg-white">
                <button onClick={() => setOpen(isOpen ? -1 : i)} className="w-full flex items-center justify-between px-6 py-5 text-left">
                  <span className="font-display font-semibold text-[17px]">{it.q}</span>
                  <Icon name={isOpen ? 'minus' : 'plus'} size={18} className="text-stone-500" />
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 text-stone-600 leading-relaxed max-w-3xl">{it.a}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const FooterCTA = ({ theme }) => (
  <section className="relative border-t border-stone-200">
    <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
      <div className="relative rounded-3xl overflow-hidden p-10 md:p-16 text-white" style={{ background: theme.primary }}>
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="absolute -bottom-24 -left-24 w-[320px] h-[320px] rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="relative max-w-2xl">
          <div className="font-display text-4xl md:text-6xl font-extrabold tracking-tight leading-[1]">
            Starten Sie jetzt.<br/>
            <span className="opacity-80">30 Tage kostenlos.</span>
          </div>
          <p className="mt-6 text-lg opacity-90 max-w-xl">
            Keine Kreditkarte. Einrichtung in 15 Minuten. Der erste Strafzettel läuft noch heute durch.
          </p>
          <form onSubmit={(e) => e.preventDefault()} className="mt-10 flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl p-1.5 ring-1 ring-white/20 max-w-md">
            <input type="email" placeholder="ihre@autovermietung.de" className="flex-1 px-3 py-3 outline-none text-sm bg-transparent placeholder:text-white/60" />
            <button className="inline-flex items-center gap-1.5 bg-white text-stone-900 px-4 py-3 rounded-lg text-sm font-semibold">
              Kostenlos testen <Icon name="arrow-right" size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
    <div className="max-w-6xl mx-auto px-6 pb-10 pt-4 flex flex-wrap items-center justify-between gap-4 text-sm text-stone-500">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: theme.primary }}>
          <Icon name="sparkles" size={12} className="text-white" />
        </div>
        <span className="font-display font-semibold text-stone-700">Knöllchen-Pilot</span>
        <span className="text-stone-400">· © 2026</span>
      </div>
      <div className="flex items-center gap-6">
        <a href="#" className="hover:text-stone-900">Impressum</a>
        <a href="#" className="hover:text-stone-900">Datenschutz</a>
        <a href="#" className="hover:text-stone-900">AGB</a>
        <a href="#" className="hover:text-stone-900">Kontakt</a>
      </div>
    </div>
  </section>
);

window.LandingChunkB = { DashboardPreview, Pricing, FAQ, FooterCTA };


// ============================================

// Dashboard (App demo)
const { useState: useStateD, useEffect: useEffectD } = React;

const Sidebar = ({ theme, active, setActive, counts }) => {
  const items = [
    ['layout-dashboard', 'Dashboard', 'dashboard'],
    ['file-text', 'Strafzettel', 'tickets', counts.tickets],
    ['car', 'Fahrzeuge', 'vehicles'],
    ['users', 'Mieter', 'drivers'],
    ['bar-chart-3', 'Auswertung', 'reports'],
    ['settings', 'Einstellungen', 'settings'],
  ];
  return (
    <aside className="w-60 shrink-0 border-r border-stone-200 bg-white flex flex-col">
      <div className="h-14 px-4 flex items-center gap-2 border-b border-stone-200">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: theme.primary }}>
          <Icon name="sparkles" size={15} className="text-white" strokeWidth={2.25} />
        </div>
        <div className="font-display font-bold text-[15px] tracking-tight">Knöllchen-Pilot</div>
      </div>
      <div className="p-3 space-y-0.5 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-stone-400 px-2 py-2 font-medium">Arbeitsbereich</div>
        {items.map(([icon, label, key, badge]) => {
          const isActive = active === key;
          return (
            <button key={key} onClick={() => setActive(key)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] ${isActive ? 'bg-stone-100 font-medium text-stone-900' : 'text-stone-600 hover:bg-stone-50'}`}>
              <Icon name={icon} size={15} style={isActive ? { color: theme.primary } : {}} />
              <span>{label}</span>
              {badge != null && <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-200 text-stone-700">{badge}</span>}
            </button>
          );
        })}
      </div>
      <div className="p-3 border-t border-stone-200">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center font-display text-xs font-semibold">SM</div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium truncate">Stadtflotte München</div>
            <div className="text-[11px] text-stone-500 truncate">Pro · 42/50 Fälle</div>
          </div>
          <Icon name="chevron-right" size={14} className="text-stone-400" />
        </div>
      </div>
    </aside>
  );
};

const StatCard = ({ label, value, delta, icon, color, sub }) => (
  <div className="rounded-xl ring-1 ring-stone-200 bg-white p-5">
    <div className="flex items-start justify-between">
      <div className="text-sm text-stone-500">{label}</div>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + '1a', color }}>
        <Icon name={icon} size={16} />
      </div>
    </div>
    <div className="mt-3 font-display font-bold text-3xl tracking-tight tabular-nums">{value}</div>
    {sub && <div className="mt-1 text-xs text-stone-500">{sub}</div>}
    {delta && (
      <div className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${delta.startsWith('+') ? 'text-emerald-700' : 'text-stone-500'}`}>
        <Icon name={delta.startsWith('+') ? 'trending-up' : 'trending-down'} size={12} />
        {delta} ggü. letzter Woche
      </div>
    )}
  </div>
);

const StatusBadge = ({ status }) => {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${m.bg} ${m.text} ring-1 ${m.ring}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} /> {m.label}
    </span>
  );
};

const Dashboard = ({ theme, onOpenTicket, onUpload, tickets }) => {
  const counts = React.useMemo(() => ({
    neu: tickets.filter(t => t.status === 'neu').length,
    offen: tickets.filter(t => t.status !== 'bezahlt').length,
    gebuehren: tickets.filter(t => t.status === 'weiterbelastet' || t.status === 'bezahlt').reduce((s, t) => s + t.fee, 0),
    volumen: tickets.reduce((s, t) => s + t.amount + t.fee, 0),
  }), [tickets]);

  const [filter, setFilter] = useStateD('alle');
  const filtered = tickets.filter(t => filter === 'alle' ? true : t.status === filter);

  return (
    <div className="flex-1 overflow-auto scroll-thin bg-stone-50">
      {/* topbar */}
      <div className="h-14 border-b border-stone-200 bg-white px-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-stone-600">
          <span className="text-stone-400">Arbeitsbereich</span>
          <Icon name="chevron-right" size={12} className="text-stone-300" />
          <span className="font-medium text-stone-900">Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Icon name="search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input placeholder="Kennzeichen, AZ, Mieter…" className="pl-8 pr-3 py-1.5 bg-stone-50 rounded-md text-sm ring-1 ring-stone-200 w-64 outline-none focus:ring-stone-300" />
          </div>
          <button className="p-1.5 rounded-md hover:bg-stone-100 text-stone-600"><Icon name="bell" size={15} /></button>
          <button onClick={onUpload} className="inline-flex items-center gap-1.5 text-sm text-white px-3 py-1.5 rounded-md font-medium" style={{ background: theme.primary }}>
            <Icon name="upload" size={13} /> Strafzettel hochladen
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* header */}
        <div className="flex items-end justify-between">
          <div>
            <div className="font-display font-bold text-3xl tracking-tight">Guten Morgen, Stadtflotte 👋</div>
            <div className="text-sm text-stone-500 mt-1">Heute, 14. April 2026 · 3 neue Strafzettel warten auf Freigabe</div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-stone-500">
            <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Alle Systeme online</span>
          </div>
        </div>

        {/* stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Neue Eingänge" value={counts.neu} icon="inbox" color="#f59e0b" sub="Warten auf Freigabe" />
          <StatCard label="Offen" value={counts.offen} icon="hourglass" color="#2563eb" sub="In Bearbeitung" delta="+2" />
          <StatCard label="Bearbeitungsgebühren" value={`${counts.gebuehren.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`} icon="coins" color={theme.primary} sub="Diesen Monat" delta="+12%" />
          <StatCard label="Gesamtvolumen" value={`${counts.volumen.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`} icon="trending-up" color="#059669" sub="Bußgeld + Gebühren" />
        </div>

        {/* two col: recent activity + chart */}
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
          <ActivityFeed />
          <ThroughputChart theme={theme} />
        </div>

        {/* tickets table */}
        <div className="rounded-xl ring-1 ring-stone-200 bg-white">
          <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
            <div className="font-display font-semibold">Strafzettel</div>
            <div className="flex items-center gap-1 text-xs">
              {['alle','neu','zugeordnet','weiterbelastet','bezahlt'].map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`px-2.5 py-1 rounded-md capitalize ${filter === f ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}>
                  {f === 'alle' ? 'Alle' : STATUS_META[f].label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-[110px_110px_1fr_140px_120px_110px_24px] items-center gap-3 px-5 py-2.5 text-[11px] uppercase tracking-wider text-stone-400 border-b border-stone-100">
            <span>Status</span>
            <span>Kennzeichen</span>
            <span>Verstoß</span>
            <span>Behörde</span>
            <span className="text-right">Betrag</span>
            <span className="text-right">Eingang</span>
            <span></span>
          </div>
          <div>
            {filtered.map(t => (
              <button key={t.id} onClick={() => onOpenTicket(t.id)}
                className="w-full grid grid-cols-[110px_110px_1fr_140px_120px_110px_24px] items-center gap-3 px-5 py-3 border-b border-stone-50 last:border-0 text-sm text-left hover:bg-stone-50">
                <StatusBadge status={t.status} />
                <span className="font-mono font-semibold tracking-tight">{t.plate}</span>
                <span className="truncate">
                  <span className="text-stone-900">{t.offense}</span>
                  <span className="text-stone-400 ml-2 text-xs">· {t.location}</span>
                </span>
                <span className="text-xs text-stone-500 truncate">{t.authority}</span>
                <span className="font-mono tabular-nums text-right">{(t.amount + t.fee).toFixed(2).replace('.', ',')} €</span>
                <span className="text-xs text-stone-400 text-right">{t.received}</span>
                <Icon name="chevron-right" size={14} className="text-stone-300" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ActivityFeed = () => {
  const events = [
    { icon: 'mail', text: 'Zeugenfragebogen empfangen · KP-2041', time: 'vor 23 Min.', color: '#f59e0b' },
    { icon: 'user-check', text: 'Fahrer zugeordnet · KP-2039 → Markus Hofmann', time: 'vor 3 Std.', color: '#2563eb' },
    { icon: 'send', text: 'Dokumente versendet · KP-2038', time: 'gestern', color: '#059669' },
    { icon: 'wallet', text: 'Zahlungseingang 80,00 € · KP-2037', time: 'vor 2 Tagen', color: '#059669' },
    { icon: 'alarm-clock', text: 'Mahnstufe 1 ausgelöst · KP-2033', time: 'vor 2 Tagen', color: '#7c3aed' },
  ];
  return (
    <div className="rounded-xl ring-1 ring-stone-200 bg-white">
      <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
        <div className="font-display font-semibold">Aktivität</div>
        <span className="text-xs text-stone-500">Letzte 7 Tage</span>
      </div>
      <div className="p-2">
        {events.map((e, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-stone-50">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: e.color + '1a', color: e.color }}>
              <Icon name={e.icon} size={14} />
            </div>
            <div className="flex-1 text-sm">{e.text}</div>
            <div className="text-xs text-stone-400">{e.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ThroughputChart = ({ theme }) => {
  const data = [4, 6, 3, 8, 12, 7, 5, 9, 14, 11, 8, 12, 16, 10];
  const max = Math.max(...data);
  return (
    <div className="rounded-xl ring-1 ring-stone-200 bg-white">
      <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
        <div>
          <div className="font-display font-semibold">Durchsatz</div>
          <div className="text-xs text-stone-500">Strafzettel pro Tag · 14 Tage</div>
        </div>
        <div className="text-right">
          <div className="font-display font-bold text-xl tabular-nums">127</div>
          <div className="text-xs text-emerald-700 font-medium">+24%</div>
        </div>
      </div>
      <div className="p-5 h-[172px] flex items-end gap-1.5">
        {data.map((v, i) => (
          <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${(v/max)*100}%`, background: i === data.length - 1 ? theme.primary : theme.primary + '55', minHeight: 4 }} />
        ))}
      </div>
    </div>
  );
};

window.DashboardPieces = { Sidebar, Dashboard, StatusBadge };


// ============================================

// Ticket detail drawer + upload modal

const TicketDetail = ({ theme, ticket, onClose, onAction, driver }) => {
  if (!ticket) return null;
  const actions = [
    { key: 'anschreiben', icon: 'file-text', label: 'Anschreiben an Mieter', hint: 'PDF erstellen + per E-Mail senden' },
    { key: 'rechnung',    icon: 'receipt-text', label: 'Rechnung erstellen', hint: `${(ticket.amount + ticket.fee).toFixed(2).replace('.', ',')} €` },
    { key: 'zeuge',       icon: 'building-2', label: 'Zeugenfragebogen an Behörde', hint: 'Antwort mit Fahrerdaten' },
    { key: 'bezahlt',     icon: 'check-circle', label: 'Als bezahlt markieren', hint: 'Fall abschließen' },
  ];
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-stone-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="w-[640px] max-w-full h-full bg-white flex flex-col shadow-2xl animate-[slide-in_.25s_ease]">
        <div className="h-14 px-5 flex items-center justify-between border-b border-stone-200">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-stone-500">{ticket.id}</span>
            <StatusBadge status={ticket.status} />
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-stone-100 text-stone-500"><Icon name="x" size={16} /></button>
        </div>

        <div className="flex-1 overflow-auto scroll-thin p-6 space-y-6">
          <div>
            <div className="font-display font-bold text-2xl tracking-tight">{ticket.offense}</div>
            <div className="mt-1 text-sm text-stone-500">{ticket.location} · {ticket.date}</div>
          </div>

          {/* confidence banner */}
          <div className="flex items-center gap-3 p-3.5 rounded-lg bg-stone-50 ring-1 ring-stone-200">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: theme.primaryTint, color: theme.primary }}>
              <Icon name="sparkles" size={16} />
            </div>
            <div className="flex-1 text-sm">
              <div className="font-medium">KI-Auslesung: {Math.round(ticket.confidence * 100)} % Confidence</div>
              <div className="text-xs text-stone-500">Alle Pflichtfelder erkannt · Quelle: {ticket.source}</div>
            </div>
            <button className="text-xs px-2.5 py-1.5 rounded-md bg-white ring-1 ring-stone-200 hover:bg-stone-50">Original anzeigen</button>
          </div>

          {/* data grid */}
          <div className="rounded-xl ring-1 ring-stone-200 divide-y divide-stone-100">
            {[
              ['Kennzeichen', ticket.plate, 'font-mono font-semibold'],
              ['Fahrzeug', ticket.vehicle],
              ['Tatzeit', ticket.date, 'font-mono'],
              ['Tatort', ticket.location],
              ['Behörde', ticket.authority],
              ['Aktenzeichen', `KVR-2026-04-${ticket.id.slice(3)}`, 'font-mono'],
              ['Bußgeld', `${ticket.amount.toFixed(2).replace('.', ',')} €`, 'font-mono'],
              ['Bearbeitungsgebühr', `${ticket.fee.toFixed(2).replace('.', ',')} €`, 'font-mono'],
              ['Frist Behörde', ticket.deadline, 'font-mono'],
            ].map(([k, v, cls]) => (
              <div key={k} className="grid grid-cols-[160px_1fr] gap-3 px-4 py-2.5 text-sm">
                <div className="text-stone-500">{k}</div>
                <div className={cls || ''}>{v}</div>
              </div>
            ))}
          </div>

          {/* driver */}
          <div>
            <div className="text-xs uppercase tracking-wider text-stone-500 font-medium mb-2">Fahrer zum Tatzeitpunkt</div>
            {driver ? (
              <div className="rounded-xl ring-1 ring-stone-200 p-5">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full bg-stone-900 text-white flex items-center justify-center font-display font-semibold">
                    {driver.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1">
                    <div className="font-display font-semibold">{driver.name}</div>
                    <div className="text-sm text-stone-500">{driver.address}</div>
                    <div className="mt-3 grid grid-cols-2 gap-2.5 text-xs">
                      <div><div className="text-stone-500">Mietbeginn</div><div className="font-mono mt-0.5">{driver.rentalFrom}</div></div>
                      <div><div className="text-stone-500">Mietende</div><div className="font-mono mt-0.5">{driver.rentalTo}</div></div>
                      <div><div className="text-stone-500">Telefon</div><div className="font-mono mt-0.5">{driver.phone}</div></div>
                      <div><div className="text-stone-500">Führerschein</div><div className="font-mono mt-0.5">{driver.license}</div></div>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">Match 99%</span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl ring-1 ring-dashed ring-amber-300 bg-amber-50/40 p-5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center"><Icon name="user-search" size={16} /></div>
                <div className="flex-1 text-sm">
                  <div className="font-medium text-amber-900">Fahrer wird zugeordnet…</div>
                  <div className="text-xs text-amber-800/80">Abgleich mit Mietverträgen läuft.</div>
                </div>
                <button className="text-xs px-2.5 py-1.5 rounded-md bg-white ring-1 ring-amber-200 text-amber-900">Manuell zuordnen</button>
              </div>
            )}
          </div>

          {/* actions */}
          <div>
            <div className="text-xs uppercase tracking-wider text-stone-500 font-medium mb-2">Aktionen</div>
            <div className="grid grid-cols-2 gap-2.5">
              {actions.map(a => (
                <button key={a.key} onClick={() => onAction(a.key)}
                  className="flex items-start gap-3 p-3.5 rounded-lg ring-1 ring-stone-200 bg-white hover:bg-stone-50 text-left">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: theme.primaryTint, color: theme.primary }}>
                    <Icon name={a.icon} size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{a.label}</div>
                    <div className="text-xs text-stone-500 truncate">{a.hint}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* timeline */}
          <div>
            <div className="text-xs uppercase tracking-wider text-stone-500 font-medium mb-2">Verlauf</div>
            <div className="relative pl-6">
              <div className="absolute left-[9px] top-1 bottom-1 w-px bg-stone-200" />
              {[
                ['mail', `${ticket.received}`, 'Zeugenfragebogen empfangen'],
                ['scan-text', 'direkt danach', 'KI-Auslesung abgeschlossen · 98% Confidence'],
                driver ? ['user-check', 'direkt danach', `Fahrer zugeordnet: ${driver.name}`] : null,
                ticket.documentsReady ? ['file-stack', 'direkt danach', 'Dokumente generiert'] : null,
                ticket.status === 'weiterbelastet' || ticket.status === 'bezahlt' ? ['send', 'direkt danach', 'E-Mails versendet'] : null,
                ticket.status === 'bezahlt' ? ['wallet', '2 Tage später', 'Zahlung eingegangen'] : null,
              ].filter(Boolean).map(([icon, when, what], i, arr) => (
                <div key={i} className="relative flex items-start gap-3 py-2">
                  <div className="absolute -left-[22px] w-[18px] h-[18px] rounded-full bg-white ring-1 ring-stone-200 flex items-center justify-center">
                    <Icon name={icon} size={10} className="text-stone-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm">{what}</div>
                    <div className="text-xs text-stone-400">{when}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-stone-200 p-3.5 flex items-center justify-between">
          <button className="text-sm text-stone-600 hover:text-stone-900 px-3 py-1.5">Archivieren</button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-md ring-1 ring-stone-200 hover:bg-stone-50">Schließen</button>
            <button className="text-sm px-3.5 py-1.5 rounded-md text-white font-medium" style={{ background: theme.primary }}>
              Vollständig automatisieren
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes slide-in { from { transform: translateX(24px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }`}</style>
    </div>
  );
};

const UploadModal = ({ theme, onClose, onComplete }) => {
  const [phase, setPhase] = React.useState('idle'); // idle, uploading, ocr, matching, docs, done
  const phases = [
    { key: 'uploading', label: 'Datei wird hochgeladen', icon: 'upload' },
    { key: 'ocr', label: 'KI liest Daten aus', icon: 'scan-text' },
    { key: 'matching', label: 'Fahrer wird zugeordnet', icon: 'user-check' },
    { key: 'docs', label: 'Dokumente werden erstellt', icon: 'file-stack' },
  ];
  React.useEffect(() => {
    if (phase === 'idle' || phase === 'done') return;
    const seq = ['uploading', 'ocr', 'matching', 'docs', 'done'];
    const i = seq.indexOf(phase);
    const delay = [700, 1100, 900, 900][i] || 600;
    const t = setTimeout(() => setPhase(seq[i + 1]), delay);
    return () => clearTimeout(t);
  }, [phase]);

  const currentIdx = phase === 'idle' ? -1 : phase === 'done' ? phases.length : phases.findIndex(p => p.key === phase);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-stone-900/50 backdrop-blur-[2px]">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div className="font-display font-semibold">Strafzettel hochladen</div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-stone-100 text-stone-500"><Icon name="x" size={16} /></button>
        </div>
        <div className="p-6">
          {phase === 'idle' && (
            <>
              <div onClick={() => setPhase('uploading')} className="border-2 border-dashed border-stone-300 rounded-xl py-12 px-6 text-center hover:border-stone-400 hover:bg-stone-50 cursor-pointer transition">
                <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center" style={{ background: theme.primaryTint, color: theme.primary }}>
                  <Icon name="upload-cloud" size={22} />
                </div>
                <div className="mt-4 font-display font-semibold">PDF, JPG oder PNG hier ablegen</div>
                <div className="text-sm text-stone-500 mt-1">oder klicken, um Datei auszuwählen</div>
                <div className="text-xs text-stone-400 mt-4">Max. 10 MB · Behördliche Zeugenfragebögen bevorzugt</div>
              </div>
              <div className="mt-5 flex items-center gap-2 text-xs text-stone-500">
                <Icon name="mail" size={13} />
                Oder direkt an <span className="font-mono text-stone-700">tickets@stadtflotte.knp.de</span> weiterleiten
              </div>
            </>
          )}
          {phase !== 'idle' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-stone-50">
                <Icon name="file-text" size={18} className="text-stone-500" />
                <div className="flex-1 text-sm">
                  <div className="font-medium">Zeugenfragebogen_KVR-2026-04-13014.pdf</div>
                  <div className="text-xs text-stone-500">218 KB</div>
                </div>
                {phase === 'done' ? (
                  <Icon name="check" size={18} className="text-emerald-600" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-stone-200" style={{ borderTopColor: theme.primary, animation: 'spin .7s linear infinite' }} />
                )}
              </div>
              <div className="space-y-2 pt-2">
                {phases.map((p, i) => {
                  const done = i < currentIdx;
                  const active = i === currentIdx;
                  return (
                    <div key={p.key} className={`flex items-center gap-3 p-2.5 rounded-lg ${active ? 'bg-white ring-1 ring-stone-200' : ''}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${done ? 'bg-emerald-100 text-emerald-700' : active ? 'text-white' : 'bg-stone-100 text-stone-400'}`}
                           style={active ? { background: theme.primary } : {}}>
                        {done ? <Icon name="check" size={13} /> : <Icon name={p.icon} size={13} />}
                      </div>
                      <div className={`text-sm flex-1 ${done ? 'text-stone-500' : active ? 'font-medium' : 'text-stone-400'}`}>{p.label}</div>
                      {active && <div className="w-16 h-1 bg-stone-100 rounded-full overflow-hidden"><div className="h-full shimmer" style={{ background: theme.primary, width: '60%' }} /></div>}
                    </div>
                  );
                })}
              </div>
              {phase === 'done' && (
                <div className="mt-4 p-4 rounded-lg text-white" style={{ background: theme.primary }}>
                  <div className="flex items-center gap-3">
                    <Icon name="check-circle-2" size={22} />
                    <div className="flex-1">
                      <div className="font-display font-semibold">Fertig in 28 Sekunden</div>
                      <div className="text-xs opacity-90">Fahrer: Jana Sommer · 3 Dokumente erstellt</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="px-6 py-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-md hover:bg-stone-100">Abbrechen</button>
          <button onClick={phase === 'done' ? onComplete : undefined}
            disabled={phase !== 'done'}
            className="text-sm px-3.5 py-1.5 rounded-md text-white font-medium disabled:opacity-40"
            style={{ background: theme.primary }}>
            {phase === 'done' ? 'Zum Strafzettel' : 'Wird verarbeitet…'}
          </button>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  );
};

window.DetailPieces = { TicketDetail, UploadModal };


// ============================================

// App root: theme, landing/demo toggle, tweaks panel
const { useState, useEffect } = React;

const THEMES = {
  teal:    { key: 'teal',    name: 'Teal',    primary: '#0d9488', primaryLight: '#5eead4', primaryTint: '#ccfbf1' },
  indigo:  { key: 'indigo',  name: 'Indigo',  primary: '#4f46e5', primaryLight: '#a5b4fc', primaryTint: '#e0e7ff' },
  emerald: { key: 'emerald', name: 'Emerald', primary: '#059669', primaryLight: '#6ee7b7', primaryTint: '#d1fae5' },
  slate:   { key: 'slate',   name: 'Graphit', primary: '#0f172a', primaryLight: '#64748b', primaryTint: '#e2e8f0' },
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "teal",
  "density": "comfortable",
  "view": "landing"
}/*EDITMODE-END*/;

const { Nav, Hero, Problem, Solution } = window.LandingChunkA;
const { DashboardPreview, Pricing, FAQ, FooterCTA } = window.LandingChunkB;
const { Sidebar, Dashboard, StatusBadge } = window.DashboardPieces;
const { TicketDetail, UploadModal } = window.DetailPieces;

function App() {
  const [tweaks, setTweaks] = useState(() => {
    try { return { ...TWEAK_DEFAULTS, ...(JSON.parse(localStorage.getItem('kp-tweaks') || '{}')) }; }
    catch (e) { return TWEAK_DEFAULTS; }
  });
  const [view, setView] = useState(tweaks.view || 'landing');
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [editModeOn, setEditModeOn] = useState(false);

  // persist
  useEffect(() => { localStorage.setItem('kp-tweaks', JSON.stringify(tweaks)); }, [tweaks]);
  useEffect(() => { localStorage.setItem('kp-view', view); }, [view]);

  // Edit mode protocol
  useEffect(() => {
    const onMsg = (e) => {
      if (!e.data) return;
      if (e.data.type === '__activate_edit_mode') { setEditModeOn(true); setTweaksOpen(true); }
      if (e.data.type === '__deactivate_edit_mode') { setEditModeOn(false); setTweaksOpen(false); }
    };
    window.addEventListener('message', onMsg);
    try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (err) {}
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const updateTweak = (patch) => {
    setTweaks(prev => {
      const next = { ...prev, ...patch };
      try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: patch }, '*'); } catch (err) {}
      return next;
    });
  };

  const theme = THEMES[tweaks.theme] || THEMES.teal;

  // demo state
  const [tickets] = useState(TICKETS);
  const [openId, setOpenId] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [nav, setNav] = useState('dashboard');

  const goDemo = () => { setView('demo'); setTweaks(t => ({ ...t, view: 'demo' })); };
  const goLanding = () => { setView('landing'); setTweaks(t => ({ ...t, view: 'landing' })); };

  const openTicket = tickets.find(t => t.id === openId);
  const driver = openId ? DRIVERS[openId] : null;

  return (
    <div className="min-h-screen">
      {/* Global view toggle */}
      <ViewToggle view={view} onLanding={goLanding} onDemo={goDemo} theme={theme} />

      {view === 'landing' ? (
        <>
          <Nav theme={theme} onDemo={goDemo} />
          <Hero theme={theme} />
          <Problem />
          <Solution theme={theme} />
          <DashboardPreview theme={theme} onDemo={goDemo} />
          <Pricing theme={theme} />
          <FAQ />
          <FooterCTA theme={theme} />
        </>
      ) : (
        <div className="h-screen flex bg-stone-50" data-screen-label="App Dashboard">
          <Sidebar theme={theme} active={nav} setActive={setNav} counts={{ tickets: tickets.length }} />
          <Dashboard theme={theme}
            onOpenTicket={setOpenId}
            onUpload={() => setUploadOpen(true)}
            tickets={tickets} />
          {openTicket && (
            <TicketDetail theme={theme} ticket={openTicket} driver={driver}
              onClose={() => setOpenId(null)}
              onAction={() => {}} />
          )}
          {uploadOpen && (
            <UploadModal theme={theme}
              onClose={() => setUploadOpen(false)}
              onComplete={() => { setUploadOpen(false); setOpenId('KP-2041'); }} />
          )}
        </div>
      )}

      {/* Tweaks Panel */}
      {editModeOn && tweaksOpen && (
        <TweaksPanel tweaks={tweaks} setTweak={updateTweak} onClose={() => setTweaksOpen(false)} themes={THEMES} />
      )}
    </div>
  );
}

const ViewToggle = ({ view, onLanding, onDemo, theme }) => (
  <div className="fixed top-3 right-3 z-[60] flex items-center gap-1 p-1 rounded-full bg-white/90 backdrop-blur-md ring-1 ring-stone-200 shadow-lg">
    <button onClick={onLanding}
      className={`px-3 py-1.5 text-xs rounded-full font-medium transition ${view === 'landing' ? 'text-white' : 'text-stone-600 hover:bg-stone-100'}`}
      style={view === 'landing' ? { background: theme.primary } : {}}>
      Landingpage
    </button>
    <button onClick={onDemo}
      className={`px-3 py-1.5 text-xs rounded-full font-medium transition inline-flex items-center gap-1.5 ${view === 'demo' ? 'text-white' : 'text-stone-600 hover:bg-stone-100'}`}
      style={view === 'demo' ? { background: theme.primary } : {}}>
      <Icon name="play" size={11} /> App Demo
    </button>
  </div>
);

const TweaksPanel = ({ tweaks, setTweak, onClose, themes }) => (
  <div className="fixed bottom-4 right-4 z-[70] w-[280px] rounded-2xl bg-white shadow-2xl ring-1 ring-stone-200 overflow-hidden">
    <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon name="sliders-horizontal" size={14} />
        <div className="font-display font-semibold text-sm">Tweaks</div>
      </div>
      <button onClick={onClose} className="p-1 rounded hover:bg-stone-100 text-stone-500"><Icon name="x" size={14} /></button>
    </div>
    <div className="p-4 space-y-4">
      <div>
        <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium mb-2">Farbschema</div>
        <div className="grid grid-cols-4 gap-2">
          {Object.values(themes).map(t => (
            <button key={t.key} onClick={() => setTweak({ theme: t.key })}
              className={`rounded-lg aspect-square flex items-center justify-center ring-2 ${tweaks.theme === t.key ? 'ring-stone-900' : 'ring-transparent'}`}
              title={t.name}>
              <span className="w-full h-full rounded-md" style={{ background: t.primary }} />
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium mb-2">Ansicht</div>
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-stone-100">
          {[['landing','Landing'],['demo','App']].map(([k, l]) => (
            <button key={k} onClick={() => setTweak({ view: k })}
              className={`py-1.5 rounded-md text-xs font-medium ${tweaks.view === k ? 'bg-white shadow-sm' : 'text-stone-600'}`}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
