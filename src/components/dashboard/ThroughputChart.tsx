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
    <div className="rounded-2xl bg-white ring-1 ring-black/[0.05] hover:ring-black/[0.08] transition-all duration-200 overflow-hidden">
      <div className="px-7 py-5 border-b border-stone-100 flex items-center justify-between">
        <div>
          <div className="font-display font-medium text-[17px] tracking-tight text-stone-900">
            Durchsatz
          </div>
          <div className="text-[12px] text-stone-400 mt-1">Strafzettel pro Tag · 14 Tage</div>
        </div>
        <div className="text-right">
          <div className="font-display font-medium text-[28px] leading-none tracking-[-0.025em] tabular-nums text-stone-900">
            {total}
          </div>
          <div className="text-[12px] text-stone-400 mt-1">gesamt</div>
        </div>
      </div>
      <div className="px-5 pt-3 pb-4">
        <svg
          viewBox={`0 0 ${w} ${h + 8}`}
          preserveAspectRatio="none"
          className="w-full h-[156px]"
        >
          <defs>
            <linearGradient id="throughput-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={fillPath} fill="url(#throughput-grad)" />
          <path
            d={linePath}
            fill="none"
            stroke="#0d9488"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={px(last)}
            cy={py(data[last] ?? 0)}
            r="2"
            fill="#0d9488"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="flex justify-between text-[10.5px] text-stone-400 px-1 mt-1.5 tabular-nums">
          <span>vor 14 Tagen</span>
          <span>heute</span>
        </div>
      </div>
    </div>
  );
};
