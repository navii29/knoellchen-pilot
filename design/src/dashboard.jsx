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
