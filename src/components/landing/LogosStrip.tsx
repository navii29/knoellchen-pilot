/**
 * LogosStrip — Slim trust band directly under the dark hero.
 * Light (bg-canvas), mono stat pills, hairline dividers. No fake logos.
 */

const STATS = [
  { value: "7 Min", label: "gespart / Strafzettel" },
  { value: "100%", label: "nachvollziehbar" },
  { value: "EU-Hosting", label: "Daten in Deutschland" },
  { value: "DSGVO", label: "konform" },
];

export const LogosStrip = () => {
  return (
    <div className="border-y border-hairline bg-canvas">
      <div className="max-w-wide mx-auto px-5 lg:px-8 py-4 flex flex-col sm:flex-row items-center gap-4 sm:gap-0">
        {/* kicker label */}
        <span className="kicker text-ink-muted shrink-0 sm:pr-6 sm:border-r sm:border-hairline">
          Gebaut für den Betrieb
        </span>

        {/* stat pills */}
        <div className="flex items-center divide-x divide-hairline w-full sm:w-auto">
          {STATS.map((s) => (
            <div
              key={s.value}
              className="flex items-baseline gap-1.5 px-5 first:pl-0 sm:first:pl-6"
            >
              <span className="font-mono font-bold text-[13px] text-ink tnum tracking-tight">
                {s.value}
              </span>
              <span className="font-mono text-[11px] text-ink-muted hidden md:inline">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
