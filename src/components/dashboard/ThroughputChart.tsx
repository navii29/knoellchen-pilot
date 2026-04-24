export const ThroughputChart = ({ data, total }: { data: number[]; total: number }) => {
  const max = Math.max(1, ...data);
  const w = 100;
  const h = 100;
  const last = data.length - 1;
  const px = (i: number) => (i / Math.max(1, last)) * w;
  const py = (v: number) => h - (v / max) * (h - 8); // 8px Padding oben

  // Smooth cubic Bezier zwischen den Punkten
  const linePath = data
    .map((v, i) => {
      const x = px(i);
      const y = py(v);
      if (i === 0) return `M ${x.toFixed(2)},${y.toFixed(2)}`;
      const xp = px(i - 1);
      const yp = py(data[i - 1]);
      const cx = (xp + x) / 2;
      return `C ${cx.toFixed(2)},${yp.toFixed(2)} ${cx.toFixed(2)},${y.toFixed(2)} ${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const fillPath = `${linePath} L ${px(last).toFixed(2)},${h} L 0,${h} Z`;

  return (
    <div className="rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-shadow duration-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
        <div>
          <div className="font-display font-semibold text-stone-900">Durchsatz</div>
          <div className="text-xs text-stone-400 mt-0.5">Strafzettel pro Tag · 14 Tage</div>
        </div>
        <div className="text-right">
          <div className="font-display font-semibold text-2xl tracking-tight tabular-nums text-stone-900">
            {total}
          </div>
          <div className="text-xs text-stone-400 mt-0.5">gesamt</div>
        </div>
      </div>
      <div className="px-4 pt-2 pb-3">
        <svg
          viewBox={`0 0 ${w} ${h + 8}`}
          preserveAspectRatio="none"
          className="w-full h-[148px]"
        >
          <defs>
            <linearGradient id="throughput-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={fillPath} fill="url(#throughput-grad)" />
          <path
            d={linePath}
            fill="none"
            stroke="#2dd4bf"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {/* letzter Punkt als Kreis */}
          <circle cx={px(last)} cy={py(data[last] ?? 0)} r="1.6" fill="#0d9488" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="flex justify-between text-[10px] text-stone-400 px-1 mt-1 tabular-nums">
          <span>vor 14 Tagen</span>
          <span>heute</span>
        </div>
      </div>
    </div>
  );
};
