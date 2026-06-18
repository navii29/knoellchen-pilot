export type TimelineStep = {
  label: string;
  done: boolean;
  current?: boolean;
  date?: string | null;
};

// Vertikale Status-Timeline. Nicht-Farb-Hinweis: erledigt = gefüllter Punkt,
// aktuell = Ring, offen = heller Ring.
export const StatusTimeline = ({ steps }: { steps: TimelineStep[] }) => (
  <div className="relative">
    {steps.map((s, i) => {
      const last = i === steps.length - 1;
      return (
        <div key={i} className="relative pl-6 pb-4 last:pb-0">
          {!last && (
            <span
              className={`absolute left-[5px] top-3.5 -bottom-0.5 w-px ${
                s.done ? "bg-signal" : "bg-hairline"
              }`}
            />
          )}
          <span
            className={`absolute left-0 top-1 w-[11px] h-[11px] rounded-full border-2 ${
              s.done
                ? "bg-signal border-signal"
                : s.current
                ? "bg-paper border-signal"
                : "bg-paper border-hairline"
            }`}
          />
          <div
            className={`text-[13px] leading-tight ${
              s.done || s.current ? "text-ink font-medium" : "text-ink-muted"
            }`}
          >
            {s.label}
          </div>
          {s.date && (
            <div className="text-[11px] text-ink-muted font-mono tnum mt-0.5">{s.date}</div>
          )}
        </div>
      );
    })}
  </div>
);
