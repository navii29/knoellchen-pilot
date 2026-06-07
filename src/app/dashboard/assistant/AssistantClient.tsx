"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUp,
  CheckCircle2,
  Mic,
  MicOff,
  Sparkles,
  type LucideIcon,
  AlertTriangle,
  Car as CarIcon,
  FileSignature,
  FileText,
  BarChart3,
  CalendarClock,
  Loader2,
  UserCheck,
} from "lucide-react";
import { fmtDate, fmtEur } from "@/lib/utils";
import { Plate } from "@/components/ui/Plate";

type ToolCall = { name: string; input: Record<string, unknown>; result: { ok: boolean; data?: unknown; error?: string } };
type ChatMsg = { role: "user" | "assistant"; content: string; toolCalls?: ToolCall[] };

const SUGGESTIONS = [
  "Wie viele aktive Verträge haben wir?",
  "Welche Autos sind am 28. April frei?",
  "Rückgabe für MV-2026-8541: Kilometerstand 5890",
  "Wer hatte M-AV 5678 am 21. April?",
];

export const AssistantClient = () => {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError(null);
    const next: ChatMsg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: next.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Anfrage fehlgeschlagen");
      return;
    }
    const j = (await res.json()) as { message: string; tool_calls: ToolCall[] };
    setMessages([
      ...next,
      { role: "assistant", content: j.message, toolCalls: j.tool_calls || [] },
    ]);
    inputRef.current?.focus();
  };

  return (
    <div className="flex-1 overflow-hidden bg-canvas flex flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-thin">
        <div className="max-w-3xl mx-auto px-6 py-8 md:py-12 space-y-6">
          {messages.length === 0 && <Welcome onPick={send} />}
          {messages.map((m, i) => (
            <Message key={i} msg={m} />
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-[13px] text-ink-muted pl-12">
              <Loader2 size={14} className="animate-spin" />
              denkt nach…
            </div>
          )}
          {error && (
            <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-panel px-3 py-2">
              {error}
            </div>
          )}
        </div>
      </div>

      <Composer
        inputRef={inputRef}
        value={input}
        onChange={setInput}
        onSubmit={() => send(input)}
        disabled={loading}
      />
    </div>
  );
};

const Welcome = ({ onPick }: { onPick: (s: string) => void }) => (
  <div className="text-center pt-8">
    <div className="w-12 h-12 rounded-panel border border-hairline bg-canvas mx-auto flex items-center justify-center text-ink-muted">
      <Sparkles size={20} strokeWidth={1.75} />
    </div>
    <h1 className="mt-5 font-display font-extrabold text-ink text-[24px] tracking-tightest">Wie kann ich helfen?</h1>
    <p className="mt-2 text-[13.5px] text-ink-muted">
      Frag mich nach Verträgen, Strafzetteln, Statistiken — oder lass mich einen neuen Vertrag anlegen.
    </p>
    <div className="mt-8 grid sm:grid-cols-2 gap-2.5">
      {SUGGESTIONS.map((s) => (
        <button
          key={s}
          onClick={() => onPick(s)}
          className="text-left text-[13.5px] px-4 py-3 panel hover:border-ink/20 transition text-ink"
        >
          {s}
        </button>
      ))}
    </div>
  </div>
);

const Message = ({ msg }: { msg: ChatMsg }) => {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-card px-4 py-2.5 bg-ink text-white text-[14.5px]">
          {msg.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-panel border border-hairline bg-canvas flex items-center justify-center shrink-0 text-ink-muted">
        <Sparkles size={14} strokeWidth={1.75} />
      </div>
      <div className="flex-1 space-y-3 min-w-0">
        {msg.content && <div className="text-[14.5px] leading-relaxed whitespace-pre-wrap text-ink">{msg.content}</div>}
        {msg.toolCalls?.map((tc, i) => (
          <ToolResult key={i} call={tc} />
        ))}
      </div>
    </div>
  );
};

// =============================================
// Tool-Result Cards
// =============================================
const ToolResult = ({ call }: { call: ToolCall }) => {
  if (!call.result.ok) {
    return (
      <div className="rounded-panel border border-red-200 bg-red-50 p-3 text-[13px] text-red-800 flex items-start gap-2">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        <div>
          <div className="font-medium">{call.name} fehlgeschlagen</div>
          <div className="text-[11.5px] mt-0.5 opacity-80">{call.result.error}</div>
        </div>
      </div>
    );
  }

  const d = call.result.data as Record<string, unknown>;

  if (call.name === "create_contract" && d.contract) return <ContractCreatedCard contract={d.contract as ContractSummary} />;
  if (call.name === "create_vehicle" && d.vehicle) return <VehicleCard vehicle={d.vehicle as VehicleSummary} />;
  if (call.name === "search_contracts" && Array.isArray(d.contracts))
    return <ContractList contracts={d.contracts as ContractSummary[]} />;
  if (call.name === "search_tickets" && Array.isArray(d.tickets))
    return <TicketList tickets={d.tickets as TicketSummary[]} />;
  if (call.name === "get_stats" && d.stats) return <StatsCard stats={d.stats as Stats} />;
  if (call.name === "get_decommission_alerts" && Array.isArray(d.vehicles))
    return (
      <DecommissionList
        vehicles={d.vehicles as DecommissionItem[]}
        windowDays={Number(d.window_days) || 21}
      />
    );
  if (call.name === "find_available_vehicles" && d.range)
    return (
      <AvailableVehiclesCard
        range={d.range as { from: string; to: string }}
        available={(d.available as AvailableVehicleItem[]) || []}
        blocked={(d.blocked as BlockedVehicleItem[]) || []}
      />
    );
  if (call.name === "find_driver_for_date") {
    if (d.found && d.contract) return <ContractCreatedCard contract={d.contract as ContractSummary} headline="Fahrer gefunden" />;
    return (
      <div className="rounded-panel border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900">
        Kein Mietvertrag für dieses Fahrzeug an diesem Datum gefunden.
      </div>
    );
  }
  if (call.name === "process_return" && d.contract && d.summary) {
    return (
      <ProcessReturnCard
        contract={d.contract as ContractSummary}
        summary={d.summary as ReturnSummaryData}
      />
    );
  }
  if (call.name === "assign_ticket_to_contract" && d.ticket && d.contract) {
    const t = d.ticket as { id: string; ticket_nr: string; renter_name: string };
    const c = d.contract as { id: string; contract_nr: string; plate: string; renter_name: string };
    return (
      <Link
        href={`/dashboard/tickets/${t.id}`}
        className="block panel p-4 hover:border-ink/20 transition"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-panel border border-hairline bg-canvas flex items-center justify-center shrink-0 text-ink-muted">
            <UserCheck size={16} strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="kicker text-ink-muted">Strafzettel zugeordnet</div>
            <div className="font-display font-semibold text-[16px] tracking-tight text-ink mt-0.5">{t.renter_name}</div>
            <div className="text-[12.5px] text-ink-muted flex flex-wrap gap-x-4 gap-y-1 mt-1">
              <span className="font-mono">{t.ticket_nr}</span>
              <span>→</span>
              <span className="font-mono">{c.contract_nr}</span>
              <Plate value={c.plate} size="sm" />
            </div>
          </div>
        </div>
      </Link>
    );
  }
  return null;
};

type ContractSummary = {
  id: string;
  contract_nr: string;
  plate: string;
  renter_name: string;
  renter_email?: string | null;
  pickup_date: string;
  return_date: string;
  actual_return_date?: string | null;
  status?: string;
};
type VehicleSummary = { id: string; plate: string; vehicle_type?: string | null; color?: string | null };
type TicketSummary = {
  id: string;
  ticket_nr: string;
  plate: string | null;
  offense: string | null;
  fine_amount: number | null;
  status: string;
  offense_date: string | null;
};
type Stats = {
  vehicles_total: number;
  contracts_active: number;
  contracts_closed: number;
  tickets_new: number;
  tickets_assigned: number;
  tickets_billed: number;
  tickets_paid: number;
  processing_fees_eur: number;
  total_volume_eur: number;
};

const ContractCreatedCard = ({
  contract,
  headline = "Vertrag angelegt",
}: {
  contract: ContractSummary;
  headline?: string;
}) => (
  <Link
    href={`/dashboard/contracts/${contract.id}`}
    className="block panel p-4 hover:border-ink/20 transition"
  >
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-panel border border-hairline bg-canvas flex items-center justify-center shrink-0 text-ink-muted">
        <CheckCircle2 size={16} strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="kicker text-ink-muted">{headline}</div>
        <div className="font-display font-semibold text-[16px] tracking-tight text-ink mt-0.5">{contract.renter_name}</div>
        <div className="text-[12.5px] text-ink-muted flex flex-wrap gap-x-4 gap-y-1 mt-1">
          <span className="font-mono">{contract.contract_nr}</span>
          <Plate value={contract.plate} size="sm" />
          <span className="font-mono">
            {fmtDate(contract.pickup_date)} → {fmtDate(contract.actual_return_date || contract.return_date)}
          </span>
        </div>
      </div>
    </div>
  </Link>
);

const VehicleCard = ({ vehicle }: { vehicle: VehicleSummary }) => (
  <div className="panel p-4 flex items-center gap-3">
    <div className="w-9 h-9 rounded-panel border border-hairline bg-canvas flex items-center justify-center shrink-0 text-ink-muted">
      <CarIcon size={16} strokeWidth={1.75} />
    </div>
    <div className="flex-1">
      <Plate value={vehicle.plate} size="sm" />
      <div className="text-[12px] text-ink-muted mt-0.5">
        {[vehicle.vehicle_type, vehicle.color].filter(Boolean).join(" · ") || "Fahrzeug angelegt"}
      </div>
    </div>
    <CheckCircle2 size={16} className="text-emerald-600" />
  </div>
);

const ContractList = ({ contracts }: { contracts: ContractSummary[] }) => {
  if (contracts.length === 0)
    return <EmptyResult Icon={FileSignature} text="Keine Verträge gefunden" />;
  return (
    <div className="panel overflow-hidden">
      {contracts.map((c) => (
        <Link
          key={c.id}
          href={`/dashboard/contracts/${c.id}`}
          className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 border-b border-hairline last:border-0 text-[13.5px] hover:bg-canvas transition-colors"
        >
          <div className="min-w-0">
            <div className="font-medium text-ink truncate">{c.renter_name}</div>
            <div className="text-[12px] text-ink-muted mt-0.5 flex flex-wrap gap-x-3">
              <span className="font-mono">{c.contract_nr}</span>
              <span className="font-mono font-semibold text-ink">{c.plate}</span>
              <span className="font-mono">
                {fmtDate(c.pickup_date)} → {fmtDate(c.actual_return_date || c.return_date)}
              </span>
            </div>
          </div>
          {c.status && <span className="kicker text-ink-muted">{c.status}</span>}
        </Link>
      ))}
    </div>
  );
};

const TicketList = ({ tickets }: { tickets: TicketSummary[] }) => {
  if (tickets.length === 0) return <EmptyResult Icon={FileText} text="Keine Strafzettel gefunden" />;
  return (
    <div className="panel overflow-hidden">
      {tickets.map((t) => (
        <Link
          key={t.id}
          href={`/dashboard/tickets/${t.id}`}
          className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 border-b border-hairline last:border-0 text-[13.5px] hover:bg-canvas transition-colors"
        >
          <div className="min-w-0">
            <div className="font-medium text-ink truncate">{t.offense || t.ticket_nr}</div>
            <div className="text-[12px] text-ink-muted mt-0.5 flex flex-wrap gap-x-3">
              <span className="font-mono">{t.ticket_nr}</span>
              {t.plate ? <Plate value={t.plate} size="sm" /> : <span className="font-mono">—</span>}
              <span className="font-mono">{fmtDate(t.offense_date)}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono tnum text-[13px] text-ink">{fmtEur(t.fine_amount)}</div>
            <div className="kicker text-ink-muted mt-0.5">{t.status}</div>
          </div>
        </Link>
      ))}
    </div>
  );
};

const StatsCard = ({ stats }: { stats: Stats }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
    <Stat label="Aktive Verträge" value={stats.contracts_active} Icon={FileSignature} />
    <Stat label="Strafzettel offen" value={stats.tickets_new + stats.tickets_assigned} Icon={FileText} />
    <Stat label="Flotte" value={stats.vehicles_total} Icon={CarIcon} />
    <Stat label="Weiterbelastet" value={stats.tickets_billed} Icon={UserCheck} />
    <Stat label="Bezahlt" value={stats.tickets_paid} Icon={CheckCircle2} />
    <Stat label="Gebühren" value={fmtEur(stats.processing_fees_eur)} Icon={BarChart3} />
  </div>
);

const Stat = ({ label, value, Icon }: { label: string; value: string | number; Icon: LucideIcon }) => (
  <div className="panel p-3.5">
    <div className="flex items-center gap-2 text-[12px] text-ink-muted">
      <Icon size={13} strokeWidth={1.75} />
      {label}
    </div>
    <div className="font-display font-bold text-[22px] tracking-tightest text-ink mt-1 font-mono tnum">{value}</div>
  </div>
);

type DecommissionItem = {
  id: string;
  plate: string;
  vehicle_type: string | null;
  decommission_date: string | null;
  days_left: number | null;
  level: "ok" | "soon" | "warn" | "urgent" | "due";
  status: string;
};

const LEVEL_STYLE: Record<DecommissionItem["level"], { bg: string; ring: string; color: string; text: string }> = {
  ok: { bg: "#f0fdf4", ring: "#bbf7d0", color: "#16a34a", text: "#15803d" },
  soon: { bg: "#fefce8", ring: "#fde68a", color: "#ca8a04", text: "#a16207" },
  warn: { bg: "#fefce8", ring: "#fde68a", color: "#ca8a04", text: "#a16207" },
  urgent: { bg: "#fff7ed", ring: "#fed7aa", color: "#ea580c", text: "#c2410c" },
  due: { bg: "#fef2f2", ring: "#fecaca", color: "#dc2626", text: "#b91c1c" },
};

const DecommissionList = ({
  vehicles,
  windowDays,
}: {
  vehicles: DecommissionItem[];
  windowDays: number;
}) => {
  if (vehicles.length === 0)
    return (
      <EmptyResult
        Icon={CalendarClock}
        text={`Keine Fahrzeuge in den nächsten ${windowDays} Tagen auszusteuern.`}
      />
    );
  return (
    <div className="panel overflow-hidden">
      <div className="px-4 py-2.5 border-b border-hairline th flex items-center gap-1.5">
        <CalendarClock size={12} /> Aussteuerung in den nächsten {windowDays} Tagen
      </div>
      {vehicles.map((v) => {
        const s = LEVEL_STYLE[v.level];
        return (
          <Link
            key={v.id}
            href={`/dashboard/vehicles/${v.id}`}
            className="grid grid-cols-[128px_1fr_140px_auto] items-center gap-3 px-4 py-3 border-b border-hairline last:border-0 text-[13.5px] hover:bg-canvas transition-colors"
          >
            <Plate value={v.plate} size="sm" />
            <span className="text-ink-soft truncate">{v.vehicle_type || "—"}</span>
            <span className="font-mono tnum text-[12px] text-ink-muted">
              {v.decommission_date ? fmtDate(v.decommission_date) : "—"}
            </span>
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium"
              style={{
                background: s.bg,
                color: s.text,
                border: `1px solid ${s.ring}`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
              {v.status}
            </span>
          </Link>
        );
      })}
    </div>
  );
};

type AvailableVehicleItem = {
  id: string;
  plate: string;
  vehicle_type: string | null;
  color: string | null;
  decommission_warning: string | null;
};

type BlockedVehicleItem = {
  plate: string;
  vehicle_type: string | null;
  conflicts: Array<{
    contract_nr: string;
    renter_name: string;
    pickup_date: string;
    return_date: string;
  }>;
};

const AvailableVehiclesCard = ({
  range,
  available,
  blocked,
}: {
  range: { from: string; to: string };
  available: AvailableVehicleItem[];
  blocked: BlockedVehicleItem[];
}) => {
  const headline =
    range.from === range.to
      ? `Verfügbarkeit am ${fmtDate(range.from)}`
      : `Verfügbarkeit ${fmtDate(range.from)} – ${fmtDate(range.to)}`;
  return (
    <div className="panel overflow-hidden">
      <div className="px-4 py-2.5 border-b border-hairline th flex items-center justify-between">
        <span>{headline}</span>
        <span className="font-mono tnum text-ink-soft">
          {available.length} frei · {blocked.length} belegt
        </span>
      </div>

      {available.length > 0 && (
        <div>
          {available.map((v) => (
            <div
              key={v.id}
              className="grid grid-cols-[128px_1fr_140px] items-center gap-3 px-4 py-2.5 border-b border-hairline last:border-0 text-[13.5px]"
            >
              <Plate value={v.plate} size="sm" />
              <span className="text-ink-soft truncate">
                {v.vehicle_type || "—"}
                {v.color && <span className="text-ink-muted text-[12px] ml-2">· {v.color}</span>}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 justify-self-start">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {v.decommission_warning ? "frei (Aussteuerung naht)" : "frei"}
              </span>
            </div>
          ))}
        </div>
      )}

      {available.length === 0 && (
        <div className="px-4 py-6 text-center text-[13px] text-ink-muted">
          Kein Fahrzeug in diesem Zeitraum frei.
        </div>
      )}

      {blocked.length > 0 && (
        <div className="border-t border-hairline bg-canvas/60">
          <div className="px-4 py-2 kicker text-ink-muted">
            Belegt ({blocked.length})
          </div>
          {blocked.map((v) => (
            <div
              key={v.plate}
              className="grid grid-cols-[128px_1fr] items-start gap-3 px-4 py-2 text-[12px]"
            >
              <span className="font-mono font-semibold text-ink-soft">{v.plate}</span>
              <div>
                {v.conflicts.map((c, i) => (
                  <div key={i} className="text-ink-muted font-mono">
                    {c.renter_name} · {fmtDate(c.pickup_date)} → {fmtDate(c.return_date)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

type ReturnSummaryData = {
  plannedDays: number;
  actualDays: number;
  daysDiff: number;
  kmPickup: number | null;
  kmReturn: number | null;
  drivenKm: number | null;
  inclusiveKmMonth: number | null;
  source: "override" | "inclusive_month" | "none";
  allowedKm: number | null;
  excessKm: number;
  pricePerKm: number;
  cost: number;
};

const ProcessReturnCard = ({
  contract,
  summary,
}: {
  contract: ContractSummary;
  summary: ReturnSummaryData;
}) => {
  const diffLabel =
    summary.daysDiff === 0
      ? "planmäßig"
      : summary.daysDiff > 0
      ? `${summary.daysDiff} Tage später`
      : `${Math.abs(summary.daysDiff)} Tage früher`;
  return (
    <Link
      href={`/dashboard/contracts/${contract.id}`}
      className="block panel p-4 hover:border-ink/20 transition"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-panel border border-hairline bg-canvas flex items-center justify-center shrink-0 text-ink-muted">
          <CheckCircle2 size={16} strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="kicker text-ink-muted">Rückgabe verarbeitet</div>
          <div className="font-display font-semibold text-[16px] tracking-tight text-ink mt-0.5">{contract.renter_name}</div>
          <div className="text-[12.5px] text-ink-muted flex flex-wrap gap-x-4 gap-y-1 mt-1">
            <span className="font-mono">{contract.contract_nr}</span>
            <Plate value={contract.plate} size="sm" />
            <span className="font-mono">
              {fmtDate(contract.pickup_date)} →{" "}
              {fmtDate(contract.actual_return_date || contract.return_date)} ({diffLabel})
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <ReturnStat label="Miettage" value={`${summary.actualDays}`} />
        <ReturnStat
          label="Gefahren"
          value={summary.drivenKm != null ? `${summary.drivenKm.toLocaleString("de-DE")} km` : "—"}
        />
        <ReturnStat
          label="Erlaubt"
          value={summary.allowedKm != null ? `${summary.allowedKm.toLocaleString("de-DE")} km` : "—"}
        />
        <ReturnStat
          label="Mehrkosten"
          value={summary.cost > 0 ? fmtEur(summary.cost) : "—"}
          highlight={summary.cost > 0}
        />
      </div>
    </Link>
  );
};

const ReturnStat = ({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) => (
  <div className="rounded-panel border border-hairline bg-canvas px-2.5 py-2">
    <div className="data-label text-ink-muted">{label}</div>
    <div
      className={`font-mono tnum font-semibold mt-0.5 text-[13px] ${
        highlight ? "text-amber-700" : "text-ink"
      }`}
    >
      {value}
    </div>
  </div>
);

const EmptyResult = ({ Icon, text }: { Icon: LucideIcon; text: string }) => (
  <div className="rounded-panel border border-hairline bg-canvas px-4 py-6 text-center text-[13px] text-ink-muted">
    <Icon size={20} className="mx-auto mb-2 text-ink-muted" strokeWidth={1.75} />
    {text}
  </div>
);

// =============================================
// Composer mit Mic-Button (Web Speech API)
// =============================================
type ComposerProps = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement>;
};

const Composer = ({ value, onChange, onSubmit, disabled, inputRef }: ComposerProps) => {
    const [listening, setListening] = useState(false);
    const [supported, setSupported] = useState(false);
    const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

    useEffect(() => {
      const SR =
        (typeof window !== "undefined" &&
          ((window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ||
            (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor })
              .webkitSpeechRecognition)) ||
        null;
      if (!SR) return;
      setSupported(true);
      const r = new SR();
      r.lang = "de-DE";
      r.interimResults = false;
      r.maxAlternatives = 1;
      recognitionRef.current = r;
    }, []);

    const toggleMic = () => {
      const r = recognitionRef.current;
      if (!r) return;
      if (listening) {
        r.stop();
        setListening(false);
        return;
      }
      setListening(true);
      r.onresult = (e: SpeechRecognitionEvent) => {
        const text = e.results[0]?.[0]?.transcript || "";
        if (text) onChange((value ? value + " " : "") + text);
      };
      r.onend = () => setListening(false);
      r.onerror = () => setListening(false);
      try {
        r.start();
      } catch {
        setListening(false);
      }
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSubmit();
      }
    };

    return (
      <div className="border-t border-hairline bg-paper">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-end gap-2 rounded-card border border-hairline bg-canvas p-2 focus-within:border-ink/30 transition-colors">
            <textarea
              ref={inputRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Frag mich etwas oder beschreibe einen neuen Vertrag…"
              rows={1}
              className="flex-1 resize-none bg-transparent outline-none px-3 py-2 text-[14.5px] max-h-40 text-ink placeholder:text-ink-muted"
              style={{ minHeight: 40 }}
            />
            {supported && (
              <button
                type="button"
                onClick={toggleMic}
                title={listening ? "Aufnahme stoppen" : "Sprachaufnahme starten"}
                className={`w-9 h-9 rounded-btn flex items-center justify-center transition ${
                  listening
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "border border-hairline bg-paper text-ink-soft hover:bg-canvas"
                }`}
              >
                {listening ? <MicOff size={15} /> : <Mic size={15} />}
              </button>
            )}
            <button
              type="button"
              onClick={onSubmit}
              disabled={disabled || !value.trim()}
              className="w-9 h-9 rounded-btn flex items-center justify-center bg-signal text-white hover:bg-signal-strong disabled:opacity-30 transition-colors shadow-signal"
            >
              <ArrowUp size={15} />
            </button>
          </div>
          <div className="text-[11px] text-ink-muted text-center mt-2">
            Enter zum Senden · Shift+Enter für neue Zeile
            {supported && " · Mikrofon für Sprache"}
          </div>
        </div>
      </div>
    );
};

// minimal Web Speech API type shim (vermeidet `any`)
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: (e: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (e: unknown) => void;
  start(): void;
  stop(): void;
}
interface SpeechRecognitionEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}
