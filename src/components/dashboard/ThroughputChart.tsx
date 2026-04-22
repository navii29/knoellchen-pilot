import { THEME } from "@/lib/theme";

export const ThroughputChart = ({ data, total }: { data: number[]; total: number }) => {
  const max = Math.max(1, ...data);
  return (
    <div className="rounded-xl ring-1 ring-stone-200 bg-white">
      <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
        <div>
          <div className="font-display font-semibold">Durchsatz</div>
          <div className="text-xs text-stone-500">Strafzettel pro Tag · 14 Tage</div>
        </div>
        <div className="text-right">
          <div className="font-display font-bold text-xl tabular-nums">{total}</div>
          <div className="text-xs text-stone-500 font-medium">gesamt</div>
        </div>
      </div>
      <div className="p-5 h-[172px] flex items-end gap-1.5">
        {data.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm"
            style={{
              height: `${(v / max) * 100}%`,
              background: i === data.length - 1 ? THEME.primary : THEME.primary + "55",
              minHeight: 4,
            }}
          />
        ))}
      </div>
    </div>
  );
};
