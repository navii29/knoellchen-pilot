"use client";

import { useState } from "react";
import { Download, Loader2, ShoppingBag } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";

type ImportResult = {
  ok?: boolean;
  dryrun?: boolean;
  error?: string;
  shop?: string;
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
 * Erst-Import bestehender Shopify-Shops: Produkte (SKU = Kennzeichen) als
 * Fahrzeuge übernehmen, optional offene Bestellungen als Verträge.
 * Beliebig wiederholbar — Dubletten sind durch Idempotenz ausgeschlossen.
 */
export const ShopifyImportCard = ({
  configured,
  domain,
}: {
  configured: boolean;
  domain: string | null;
}) => {
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
      <div className="p-5 space-y-4">
        <p className="text-[13.5px] text-ink-soft max-w-prose">
          Übernimmt bestehende Shop-Produkte als Fahrzeuge (Varianten-SKU = Kennzeichen,
          inkl. Produktfotos) — optional auch offene Bestellungen mit Mietzeitraum als
          Verträge. Der Import ist beliebig wiederholbar: Vorhandenes wird nie doppelt
          angelegt oder überschrieben.
        </p>

        {!configured ? (
          <div className="rounded-panel border border-hairline bg-canvas px-4 py-3 text-[13px] text-ink-muted">
            Noch kein Shop verbunden. Dafür werden <code>SHOPIFY_SHOP_DOMAIN</code> und{" "}
            <code>SHOPIFY_ADMIN_TOKEN</code> (Custom-App mit <code>read_products</code>
            {" / "}
            <code>read_orders</code>) hinterlegt — Einrichtung übernehmen wir gemeinsam.
          </div>
        ) : (
          <>
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
                {running === "dryrun" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : null}
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
          </>
        )}

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
                  <div className="font-medium text-ink">
                    Vorschau — es wurde nichts geändert:
                  </div>
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
                    <span className="text-ink-muted"> — {result.products.total} Produkte geprüft</span>
                  </div>
                )}
                {result.orders && (
                  <div className="tabular-nums">
                    <span className="font-medium">Bestellungen:</span>{" "}
                    {result.orders.created} {result.dryrun ? "würden Verträge" : "Verträge angelegt"}
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
    </Panel>
  );
};
