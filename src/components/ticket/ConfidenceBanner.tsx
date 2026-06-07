import { Sparkles } from "lucide-react";

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
    <div className="flex items-center gap-3 p-3.5 rounded-card border border-hairline bg-paper shadow-panel">
      <div className="w-9 h-9 rounded-panel border border-hairline bg-canvas flex items-center justify-center text-ink-muted shrink-0">
        <Sparkles size={16} />
      </div>
      <div className="flex-1 text-[13.5px]">
        <div className="font-medium text-ink">
          KI-Auslesung: {pct ? `${pct} %` : "—"} Confidence
        </div>
        <div className="text-[12px] text-ink-muted">
          {pct >= 95
            ? "Alle Pflichtfelder erkannt"
            : pct > 0
            ? "Bitte vor Versand prüfen"
            : "Noch nicht ausgelesen"}{" "}
          · Quelle: {sourceLabel}
        </div>
      </div>
      {uploadUrl && (
        <a
          href={uploadUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[12px] px-2.5 py-1.5 rounded-btn border border-hairline bg-canvas hover:bg-ink/5 text-ink-soft transition-colors whitespace-nowrap"
        >
          Original anzeigen
        </a>
      )}
    </div>
  );
};
