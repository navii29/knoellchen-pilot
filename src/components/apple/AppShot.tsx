/**
 * The product, as Apple presents product photography: a clean, premium render
 * of the app UI floating on the page. Light, rounded, soft — no orange chrome.
 * Purely presentational; abstracted so it reads as "the product" at a glance.
 */
const ROWS = [
  { plate: "B·MK 2041", who: "Parken im Halteverbot", amt: "80,00", dot: "#0071e3", tag: "Zugeordnet" },
  { plate: "M·RV 88", who: "Geschwindigkeit", amt: "115,00", dot: "#00a1b3", tag: "Weiterbelastet" },
  { plate: "K·LT 7", who: "Parkverstoß", amt: "55,00", dot: "#34c759", tag: "Bezahlt" },
  { plate: "HH·AB 12", who: "Halteverbot", amt: "80,00", dot: "#86868b", tag: "Neu" },
];

export const AppShot = ({ className = "" }: { className?: string }) => {
  return (
    <div
      className={`relative w-full rounded-apple bg-white overflow-hidden shadow-product ring-1 ring-black/[0.06] ${className}`}
    >
      {/* window bar */}
      <div className="h-10 flex items-center gap-2 px-4 border-b border-black/[0.06] bg-[#fbfbfd]">
        <span className="w-2.5 h-2.5 rounded-full bg-black/10" />
        <span className="w-2.5 h-2.5 rounded-full bg-black/10" />
        <span className="w-2.5 h-2.5 rounded-full bg-black/10" />
        <span className="ml-3 text-[11px] text-graphite-muted font-medium tracking-tight">
          Knöllchen-Pilot
        </span>
      </div>

      <div className="grid grid-cols-[120px_1fr]">
        {/* sidebar */}
        <div className="hidden sm:flex flex-col gap-1 p-3 border-r border-black/[0.06]">
          {["Übersicht", "Strafzettel", "Verträge", "Flotte", "Kunden"].map((l, i) => (
            <div
              key={l}
              className={`flex items-center gap-2 px-2.5 h-8 rounded-lg text-[11.5px] ${
                i === 1 ? "bg-azure/10 text-azure font-medium" : "text-graphite-soft"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${i === 1 ? "bg-azure" : "bg-black/15"}`}
              />
              {l}
            </div>
          ))}
        </div>

        {/* content */}
        <div className="p-4 sm:p-5">
          {/* metric row */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { k: "Offen", v: "12", s: "+3 heute" },
              { k: "Weiterbelastet", v: "1.240 €", s: "diesen Monat" },
              { k: "Quote", v: "98%", s: "automatisch" },
            ].map((m) => (
              <div key={m.k} className="rounded-2xl bg-[#f5f5f7] p-3 min-w-0">
                <div className="text-[10px] text-graphite-muted truncate">{m.k}</div>
                <div className="text-[17px] sm:text-[20px] font-semibold tracking-tight text-graphite mt-0.5 truncate">
                  {m.v}
                </div>
                <div className="text-[9.5px] text-graphite-muted mt-0.5 truncate">{m.s}</div>
              </div>
            ))}
          </div>

          {/* list */}
          <div className="rounded-2xl border border-black/[0.06] overflow-hidden">
            {ROWS.map((r, i) => (
              <div
                key={r.plate}
                className={`flex items-center gap-3 px-3.5 py-2.5 text-[11.5px] ${
                  i < ROWS.length - 1 ? "border-b border-black/[0.05]" : ""
                }`}
              >
                <span className="inline-flex items-center rounded-md bg-white ring-1 ring-black/10 px-1.5 h-5 font-semibold text-[10.5px] text-graphite tracking-tight">
                  {r.plate}
                </span>
                <span className="text-graphite truncate flex-1">{r.who}</span>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] text-graphite-muted">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: r.dot }} />
                  {r.tag}
                </span>
                <span className="font-medium text-graphite tabular-nums">{r.amt} €</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
