"use client";

import { useEffect, useState } from "react";
import { Download, Loader2, Trash2, AlertTriangle } from "lucide-react";

export const DangerZone = ({ orgName }: { orgName: string }) => {
  const [role, setRole] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/team")
      .then((r) => r.json())
      .then((j) => setRole(j?.role ?? "member"))
      .catch(() => setRole("member"));
  }, []);

  const exportData = async () => {
    setErr(null);
    setExporting(true);
    try {
      const res = await fetch("/api/org/export");
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error ?? "Export fehlgeschlagen");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `knoellchen-pilot-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    setErr(null);
    setDeleting(true);
    const res = await fetch("/api/org", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm }),
    });
    const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || !j.ok) {
      setDeleting(false);
      setErr(j.error ?? "Löschen fehlgeschlagen");
      return;
    }
    // Konto + eigene Session sind weg → zurück zum Login.
    window.location.href = "/login";
  };

  if (role !== "owner") return null;

  return (
    <div className="panel p-5">
      <h3 className="font-display font-semibold text-ink text-[15px] mb-1">Konto & Daten</h3>
      <p className="text-[12.5px] text-ink-muted mb-4">
        Datenexport und unwiderrufliche Konto-Löschung (DSGVO Art. 17 & 20). Nur Inhaber.
      </p>

      {/* Export */}
      <div className="flex items-center justify-between gap-3 px-3 py-3 rounded-input border border-hairline bg-paper">
        <div className="min-w-0">
          <div className="text-[13.5px] text-ink font-medium">Alle Daten exportieren</div>
          <div className="text-[12px] text-ink-muted">Maschinenlesbares JSON aller Organisationsdaten.</div>
        </div>
        <button
          type="button"
          onClick={exportData}
          disabled={exporting}
          className="inline-flex items-center gap-1.5 text-[13px] px-3 h-9 rounded-btn border border-hairline bg-paper text-ink-soft hover:bg-canvas hover:text-ink transition-colors shrink-0 disabled:opacity-50"
        >
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          Export
        </button>
      </div>

      {/* Delete */}
      <div className="mt-3 rounded-input border border-red-200 bg-red-50/60 p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle size={15} className="text-red-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="text-[13.5px] text-red-800 font-medium">Konto löschen</div>
            <div className="text-[12px] text-red-700/90 mt-0.5">
              Löscht die gesamte Organisation, alle Fahrzeuge, Verträge, Kunden, Strafzettel,
              Dokumente und alle Mitarbeiter-Zugänge. Unwiderruflich.
            </div>

            {!showDelete ? (
              <button
                type="button"
                onClick={() => setShowDelete(true)}
                className="mt-3 inline-flex items-center gap-1.5 text-[13px] px-3 h-9 rounded-btn border border-red-300 bg-white text-red-700 hover:bg-red-100 transition-colors"
              >
                <Trash2 size={14} /> Konto löschen…
              </button>
            ) : (
              <div className="mt-3 space-y-2">
                <label className="block text-[12px] text-red-800">
                  Zum Bestätigen den Firmennamen eingeben: <span className="font-semibold">{orgName}</span>
                </label>
                <input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="field"
                  placeholder={orgName}
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={deleteAccount}
                    disabled={deleting || confirm.trim() !== orgName.trim()}
                    className="inline-flex items-center gap-1.5 text-[13px] px-4 h-9 rounded-btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 transition-colors"
                  >
                    {deleting && <Loader2 size={14} className="animate-spin" />}
                    Endgültig löschen
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDelete(false);
                      setConfirm("");
                    }}
                    className="text-[13px] text-ink-muted hover:text-ink px-3 h-9"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {err && (
        <div className="mt-3 text-[12.5px] text-red-700 bg-red-50 border border-red-200 rounded-input px-3 py-2">
          {err}
        </div>
      )}
    </div>
  );
};
