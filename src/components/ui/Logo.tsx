import { Sparkles } from "lucide-react";
import { THEME } from "@/lib/theme";

export const Logo = ({ size = 32 }: { size?: number }) => (
  <div className="flex items-center gap-2">
    <div
      className="rounded-lg flex items-center justify-center"
      style={{ background: THEME.primary, width: size, height: size }}
    >
      <Sparkles size={Math.round(size * 0.55)} className="text-white" strokeWidth={2.25} />
    </div>
    <span className="font-display font-bold text-[17px] tracking-tight">
      Knöllchen-Pilot
    </span>
  </div>
);
