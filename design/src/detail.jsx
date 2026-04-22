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
