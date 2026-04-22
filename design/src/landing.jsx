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
