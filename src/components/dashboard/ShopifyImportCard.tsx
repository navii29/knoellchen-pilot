"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Download, Loader2, ShoppingBag } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";

type ImportResult = {
  ok?: boolean;
  dryrun?: boolean;
  error?: string;
  products?: {
    total: number;
    created: number;
    linked: number;
    duplicates: number;
    skipped: number;
    errors: number;
    photos_imported: number;
  };
  orders?: {
    total: number;
    created: number;
    duplicates: number;
    skipped: number;
    errors: number;
  } | null;
};

/**
 * Shopify-Anbindung im Self-Service: Jede Organisation hinterlegt ihre eigene
 * Shop-Domain + Admin-API-Token, importiert den Bestand per Klick und bekommt
 * ihre persönliche Webhook-URL für alles Neue.
 */
export const ShopifyImportCard = ({
  domain,
  hasToken,
  webhookUrl,
}: {
  domain: string | null;
  hasToken: boolean;
  webhookUrl: string | null;
}) => {
  const router = useRouter();
  const configured = Boolean(domain && hasToken);

  // ── Verbindungs-Formular ──
  const [formDomain, setFormDomain] = useState(domain ?? "");
  const [formToken, setFormToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const body: Record<string, string> = { shopify_shop_domain: formDomain };
      if (formToken.trim()) body.shopify_admin_token = formToken.trim();
      const res = await fetch("/api/org", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setSaveMsg({ ok: false, text: j.error ?? "Speichern fehlgeschlagen." });
      } else {
        setSaveMsg({ ok: true, text: "Gespeichert — Verbindung eingerichtet." });
        setFormToken("");
        router.refresh();
      }
    } catch {
      setSaveMsg({ ok: false, text: "Speichern fehlgeschlagen — bitte erneut versuchen." });
    } finally {
      setSaving(false);
    }
  };

  // ── Import ──
  const [includeOrders, setIncludeOrders] = useState(false);
  const [running, setRunning] = useState<null | "dryrun" | "import">(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const run = async (dryrun: boolean) => {
    setRunning(dryrun ? "dryrun" : "import");
    setResult(null);
    try {
      const res = await fetch("/api/shopify/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryrun, include_orders: includeOrders }),
      });
      setResult((await res.json()) as ImportResult);
    } catch {
      setResult({ error: "Import fehlgeschlagen — bitte erneut versuchen." });
    } finally {
      setRunning(null);
    }
  };

  // ── Webhook-URL kopieren ──
  const [copied, setCopied] = useState(false);
  const copyWebhook = async () => {
    if (!webhookUrl) return;
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignorieren */
    }
  };

  return (
    <Panel flush className="mt-6">
      <PanelHeader
        Icon={ShoppingBag}
        title="Shopify"
        kicker="Integration"
        actions={
          configured ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {domain}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-hairline" />
              Nicht verbunden
            </span>
          )
        }
      />
      <div className="p-5 space-y-5">
        <p className="text-[13.5px] text-ink-soft max-w-prose">
          Verbinden Sie Ihren Shopify-Shop: Bestehende Produkte werden als Fahrzeuge
          übernommen (Varianten-SKU = Kennzeichen, inkl. Produktfotos), optional auch
          offene Bestellungen mit Mietzeitraum als Verträge. Neues läuft danach über
          Ihre persönliche Webhook-URL automatisch ein.
        </p>

        {/* ── Verbindung ── */}
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="data-label block mb-1.5">Shop-Domain</label>
              <input
                value={formDomain}
                onChange={(e) => setFormDomain(e.target.value)}
                className="field font-mono"
                placeholder="mein-shop.myshopify.com"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="data-label block mb-1.5">Admin-API-Token</label>
              <input
                type="password"
                value={formToken}
                onChange={(e) => setFormToken(e.target.value)}
                className="field font-mono"
                placeholder={hasToken ? "••••••••  (gespeichert)" : "shpat_…"}
                autoComplete="new-password"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant={configured ? "ghost" : "signal"}
              size="md"
              disabled={saving || !formDomain.trim() || (!hasToken && !formToken.trim())}
              onClick={save}
              className={configured ? "border border-hairline" : ""}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {configured ? "Verbindung aktualisieren" : "Verbinden"}
            </Button>
            {saveMsg && (
              <span className={`text-[13px] ${saveMsg.ok ? "text-emerald-600" : "text-red-600"}`}>
                {saveMsg.text}
              </span>
            )}
          </div>
          <details className="text-[12.5px] text-ink-muted">
            <summary className="cursor-pointer select-none hover:text-ink">
              Woher bekomme ich den Token? (3 Schritte)
            </summary>
            <ol className="mt-2 ml-4 list-decimal space-y-1">
              <li>
                Shopify-Admin → Einstellungen → Apps und Vertriebskanäle →{" "}
                <span className="font-medium text-ink-soft">Apps entwickeln</span> → App erstellen
                (z. B. „Knöllchen-Pilot“)
              </li>
              <li>
                Unter „API-Zugriffsbereichen“ <code>read_products</code> und{" "}
                <code>read_orders</code> aktivieren → App installieren
              </li>
              <li>
                Den angezeigten <span className="font-medium text-ink-soft">Admin-API-Zugriffstoken</span>{" "}
                (beginnt mit <code>shpat_</code>) hier einfügen
              </li>
            </ol>
          </details>
        </div>

        {configured && (
          <>
            {/* ── Erst-Import ── */}
            <div className="border-t border-hairline pt-4 space-y-3">
              <div className="data-label">Bestand übernehmen</div>
              <label className="flex items-center gap-2.5 text-[13.5px] text-ink cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeOrders}
                  onChange={(e) => setIncludeOrders(e.target.checked)}
                  className="accent-[#0071e3] w-4 h-4"
                />
                Auch offene Bestellungen als Verträge übernehmen
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  size="md"
                  disabled={running !== null}
                  onClick={() => run(true)}
                  className="border border-hairline"
                >
                  {running === "dryrun" ? <Loader2 size={14} className="animate-spin" /> : null}
                  Vorschau (ändert nichts)
                </Button>
                <Button
                  variant="signal"
                  size="md"
                  disabled={running !== null}
                  onClick={() => run(false)}
                >
                  {running === "import" ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Download size={14} />
                  )}
                  Jetzt importieren
                </Button>
              </div>

              {result && (
                <div
                  className={`rounded-panel border px-4 py-3 text-[13px] ${
                    result.error
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-hairline bg-canvas text-ink"
                  }`}
                >
                  {result.error ? (
                    result.error
                  ) : (
                    <div className="space-y-1.5">
                      {result.dryrun && (
                        <div className="font-medium text-ink">Vorschau — es wurde nichts geändert:</div>
                      )}
                      {result.products && (
                        <div className="tabular-nums">
                          <span className="font-medium">Fahrzeuge:</span>{" "}
                          {result.products.created} {result.dryrun ? "würden angelegt" : "angelegt"}
                          {result.products.linked > 0 && ` · ${result.products.linked} verknüpft`}
                          {result.products.duplicates > 0 &&
                            ` · ${result.products.duplicates} bereits vorhanden`}
                          {result.products.skipped > 0 &&
                            ` · ${result.products.skipped} übersprungen (keine Kennzeichen-SKU)`}
                          {result.products.errors > 0 && ` · ${result.products.errors} Fehler`}
                          {!result.dryrun &&
                            result.products.photos_imported > 0 &&
                            ` · ${result.products.photos_imported} Fotos importiert`}
                          <span className="text-ink-muted">
                            {" "}
                            — {result.products.total} Produkte geprüft
                          </span>
                        </div>
                      )}
                      {result.orders && (
                        <div className="tabular-nums">
                          <span className="font-medium">Bestellungen:</span>{" "}
                          {result.orders.created}{" "}
                          {result.dryrun ? "würden Verträge" : "Verträge angelegt"}
                          {result.orders.duplicates > 0 &&
                            ` · ${result.orders.duplicates} bereits vorhanden`}
                          {result.orders.skipped > 0 &&
                            ` · ${result.orders.skipped} übersprungen (kein Mietzeitraum)`}
                          {result.orders.errors > 0 && ` · ${result.orders.errors} Fehler`}
                          <span className="text-ink-muted"> — {result.orders.total} geprüft</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Webhook für alles Neue ── */}
            {webhookUrl && (
              <div className="border-t border-hairline pt-4 space-y-2">
                <div className="data-label">Automatisch aktuell bleiben</div>
                <p className="text-[12.5px] text-ink-muted max-w-prose">
                  Damit neue Bestellungen und Produkte ab sofort von selbst einlaufen:
                  Shopify-Admin → Einstellungen → Benachrichtigungen → Webhooks → zwei Webhooks
                  anlegen („Bestellung erstellt“ und „Produkt erstellt“), Format JSON, jeweils
                  mit dieser URL:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 min-w-0 truncate rounded-panel border border-hairline bg-canvas px-3 py-2 text-[11.5px] text-ink-soft">
                    {webhookUrl}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyWebhook}
                    className="border border-hairline shrink-0"
                  >
                    {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    {copied ? "Kopiert" : "Kopieren"}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Panel>
  );
};
