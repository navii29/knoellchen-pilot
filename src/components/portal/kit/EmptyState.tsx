import type { LucideIcon } from "lucide-react";

export const EmptyState = ({
  Icon,
  title,
  text,
}: {
  Icon?: LucideIcon;
  title?: string;
  text: string;
}) => (
  <div className="text-center px-4 py-8 text-ink-muted">
    {Icon && (
      <div className="inline-flex w-11 h-11 rounded-full glass-card items-center justify-center mb-3 text-ink-soft">
        <Icon size={18} />
      </div>
    )}
    {title && <div className="text-[15px] font-semibold text-ink mb-1">{title}</div>}
    <div className="text-[13px]">{text}</div>
  </div>
);
