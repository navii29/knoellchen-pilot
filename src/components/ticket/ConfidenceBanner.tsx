import { Sparkles } from "lucide-react";
import { THEME } from "@/lib/theme";

export const ConfidenceBanner = ({
  confidence,
  source,
  uploadUrl,
}: {
  confidence: number | null;
  source: "upload" | "email";
  uploadUrl: string | null;
}) => {
  const pct = Math.round((confidence ?? 0) * 100);
  const sourceLabel = source === "email" ? "E-Mail" : "Upload";
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-lg bg-stone-50 ring-1 ring-stone-200">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center"
        style={{ background: THEME.primaryTint, color: THEME.primary }}
      >
        <Sparkles size={16} />
      </div>
      <div className="flex-1 text-sm">
        <div className="font-medium">
          KI-Auslesung: {pct ? `${pct} %` : "—"} Confidence
        </div>
        <div className="text-xs text-stone-500">
          {pct >= 95 ? "Alle Pflichtfelder erkannt" : pct > 0 ? "Bitte vor Versand prüfen" : "Noch nicht ausgelesen"} · Quelle: {sourceLabel}
        </div>
      </div>
      {uploadUrl && (
        <a
          href={uploadUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs px-2.5 py-1.5 rounded-md bg-white ring-1 ring-stone-200 hover:bg-stone-50"
        >
          Original anzeigen
        </a>
      )}
    </div>
  );
};
