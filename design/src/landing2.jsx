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
