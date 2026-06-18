export const AmountRow = ({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) => (
  <div className="flex items-center justify-between py-1.5">
    <span className="text-[13px] text-ink-soft">{label}</span>
    <span
      className={`font-mono tnum text-[13px] ${strong ? "font-bold text-ink" : "text-ink-soft"}`}
    >
      {value}
    </span>
  </div>
);
