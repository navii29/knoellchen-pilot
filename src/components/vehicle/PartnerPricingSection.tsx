"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Handshake,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { fmtEur } from "@/lib/utils";
import {
  PARTNER_TYPE_META,
  type SalesPartner,
  type VehiclePartnerPricing,
} from "@/lib/partners";

type PricingRow = VehiclePartnerPricing & {
  sales_partners: {
    name: string;
    type: SalesPartner["type"];
    commission_type: SalesPartner["commission_type"];
    commission_value: number | null;
  } | Array<{
    name: string;
    type: SalesPartner["type"];
    commission_type: SalesPartner["commission_type"];
    commission_value: number | null;
  }> | null;
};

const inputCls =
  "w-full h-10 px-3 rounded-lg bg-white ring-1 ring-stone-200 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40";

export const PartnerPricingSection = ({
  vehicleId,
  initialPricing,
}: {
  vehicleId: string;
  initialPricing: PricingRow[];
}) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const remove = async (pricingId: string) => {
    if (!confirm("Diesen Partner-Preis entfernen?")) return;
    setBusyId(pricingId);
    try {
      const res = await fetch(
        `/api/vehicles/${vehicleId}/partner-pricing/${pricingId}`,
        { method: "DELETE" }
      );
      if (res.ok) router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="rounded-xl bg-white ring-1 ring-stone-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-stone-500 font-semibold">
            <Handshake size={13} />
            Vertriebspartner-Preise
            <span className="ml-1 text-stone-400 font-normal normal-case tracking-normal">
              ({initialPricing.length})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-stone-900 text-white text-[12.5px] font-medium hover:bg-stone-800"
          >
            <Plus size={13} /> Partner-Preis
          </button>
        </div>

        {initialPricing.length === 0 ? (
          <div className="py-6 text-center text-sm text-stone-500">
            Noch keine Partner-Preise hinterlegt. Lege fest, was Hotels, Portale
            oder Werkstätten für dieses Fahrzeug zahlen.
          </div>
        ) : (
          <div className="rounded-lg ring-1 ring-stone-100 overflow-hidden">
            <div className="grid grid-cols-[1fr_120px_120px_100px_30px] items-center gap-3 px-3 py-2 bg-stone-50 border-b border-stone-100 text-[10.5px] uppercase tracking-wider text-stone-500 font-semibold">
              <span>Partner</span>
              <span className="text-right">Einstand/Tag</span>
              <span className="text-right">VK/Tag</span>
              <span className="text-right">Marge/Tag</span>
              <span />
            </div>
            {initialPricing.map((row) => {
              const partnerObj = Array.isArray(row.sales_partners)
                ? row.sales_partners[0]
                : row.sales_partners;
              if (!partnerObj) return null;
              const meta = PARTNER_TYPE_META[partnerObj.type];
              const margin = Number(row.selling_price) - Number(row.purchase_price);
              return (
                <div
                  key={row.id}
                  className="grid grid-cols-[1fr_120px_120px_100px_30px] items-center gap-3 px-3 py-2 border-b border-stone-100 last:border-0"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13.5px] font-medium text-stone-900 truncate">
                        {partnerObj.name}
                      </span>
                      <span
                        className="inline-flex items-center px-1.5 h-4 rounded text-[10px] font-medium"
                        style={{
                          background: meta.bg,
                          color: meta.text,
                          boxShadow: `inset 0 0 0 1px ${meta.ring}`,
                        }}
                      >
                        {meta.short}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm tabular-nums text-stone-700 text-right">
                    {fmtEur(Number(row.purchase_price))}
                  </span>
                  <span className="text-sm tabular-nums text-stone-900 text-right font-medium">
                    {fmtEur(Number(row.selling_price))}
                  </span>
                  <span
                    className={`text-sm tabular-nums text-right font-semibold ${
                      margin > 0 ? "text-emerald-700" : "text-stone-400"
                    }`}
                  >
                    {fmtEur(margin)}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(row.id)}
                    disabled={busyId === row.id}
                    className="text-stone-400 hover:text-rose-700 disabled:opacity-30 inline-flex justify-center"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {open && (
        <AddPricingModal
          vehicleId={vehicleId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};

const AddPricingModal = ({
  vehicleId,
  onClose,
}: {
  vehicleId: string;
  onClose: () => void;
}) => {
  const router = useRouter();
  const [partners, setPartners] = useState<SalesPartner[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(true);
  const [partnerId, setPartnerId] = useState("");
  const [purchase, setPurchase] = useState("");
  const [selling, setSelling] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/partners");
        const j = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          partners?: SalesPartner[];
        };
        const ps = (j.partners ?? []).filter((p) => p.active);
        setPartners(ps);
        if (ps.length > 0) setPartnerId(ps[0].id);
      } finally {
        setLoadingPartners(false);
      }
    })();
  }, []);

  const margin = useMemo(() => {
    const p = Number(purchase.replace(",", "."));
    const s = Number(selling.replace(",", "."));
    if (!Number.isFinite(p) || !Number.isFinite(s)) return null;
    return s - p;
  }, [purchase, selling]);

  const submit = async () => {
    if (!partnerId) {
      setError("Bitte einen Partner wählen.");
      return;
    }
    if (!purchase || !selling) {
      setError("Beide Preise erforderlich.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/partner-pricing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_id: partnerId,
          purchase_price: Number(purchase.replace(",", ".")),
          selling_price: Number(selling.replace(",", ".")),
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !j.ok) {
        setError(j.error ?? "Speichern fehlgeschlagen");
        setSubmitting(false);
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError("Netzwerkfehler");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Schließen"
      />
      <div className="relative w-full sm:max-w-md bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl ring-1 ring-stone-200 overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-stone-100">
          <div>
            <div className="text-[11px] uppercase tracking-[0.08em] font-semibold text-teal-700">
              Vertriebspartner
            </div>
            <h2 className="font-display text-xl tracking-tight font-medium mt-0.5">
              Partner-Preis hinzufügen
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full inline-flex items-center justify-center text-stone-500 hover:bg-stone-100"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-3">
          <label className="block">
            <div className="text-[11.5px] uppercase tracking-wider text-stone-500 font-medium mb-1.5">
              Partner
            </div>
            <select
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              disabled={loadingPartners}
              className={inputCls}
            >
              {loadingPartners && <option>Lädt…</option>}
              {!loadingPartners && partners.length === 0 && (
                <option value="">— keine aktiven Partner —</option>
              )}
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({PARTNER_TYPE_META[p.type].short})
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="text-[11.5px] uppercase tracking-wider text-stone-500 font-medium mb-1.5">
                Einstandspreis / Tag
              </div>
              <div className="relative">
                <input
                  className={`${inputCls} pr-8`}
                  value={purchase}
                  onChange={(e) => setPurchase(e.target.value)}
                  inputMode="decimal"
                  placeholder="45,00"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-stone-400">
                  €
                </span>
              </div>
            </label>
            <label className="block">
              <div className="text-[11.5px] uppercase tracking-wider text-stone-500 font-medium mb-1.5">
                VK-Preis / Tag
              </div>
              <div className="relative">
                <input
                  className={`${inputCls} pr-8`}
                  value={selling}
                  onChange={(e) => setSelling(e.target.value)}
                  inputMode="decimal"
                  placeholder="65,00"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-stone-400">
                  €
                </span>
              </div>
            </label>
          </div>

          {margin != null && (
            <div className="rounded-lg bg-stone-50 ring-1 ring-stone-200 px-3 py-2.5 text-[13px] text-stone-700">
              Marge:{" "}
              <span
                className={`font-semibold tabular-nums ${
                  margin > 0
                    ? "text-emerald-700"
                    : margin < 0
                    ? "text-rose-700"
                    : "text-stone-700"
                }`}
              >
                {fmtEur(margin)} / Tag
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm rounded-lg px-3 py-2 bg-rose-50 ring-1 ring-rose-200 text-rose-700">
              <AlertTriangle size={14} /> {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 flex items-center justify-end gap-3 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-stone-500 hover:text-stone-800 px-3"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || partners.length === 0}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-40"
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
};
