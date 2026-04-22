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
