import { Activity, Circle, Clock, Gauge, Zap } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOwnerPage } from "@/lib/team";
import { Topbar } from "@/components/dashboard/Topbar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { ONLINE_WINDOW_S, actionLabel, utcDay } from "@/lib/activity";

export const dynamic = "force-dynamic";

const fmtDuration = (s: number): string => {
  if (s < 60) return "0 min";
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
};

const fmtClock = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
};

const pageLabel = (path: string | null): string => {
  if (!path) return "—";
  const seg = path.replace(/^\/dashboard\/?/, "").split("/")[0];
  const map: Record<string, string> = {
    "": "Dashboard",
    contracts: "Verträge",
    customers: "Kunden",
    vehicles: "Fahrzeuge",
    tickets: "Strafzettel",
    "damage-reports": "Schäden",
    calendar: "Kalender",
    assistant: "Assistent",
    settings: "Einstellungen",
    monitoring: "Überwachung",
  };
  return map[seg] ?? seg;
};

export default async function MonitoringPage() {
  const me = await requireOwnerPage(); // nur Inhaber
  const admin = createAdminClient();
  const today = utcDay();
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  const [{ data: members }, { data: daily }, { data: logs }] = await Promise.all([
    admin.from("users").select("id, full_name, role").eq("org_id", me.orgId),
    admin
      .from("user_activity_daily")
      .select("user_id, active_seconds, last_active, current_path")
      .eq("org_id", me.orgId)
      .eq("day", today),
    admin
      .from("user_activity_log")
      .select("id, user_id, action, detail, created_at")
      .eq("org_id", me.orgId)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const memberList = (members ?? []) as {
    id: string;
    full_name: string | null;
    role: string;
  }[];
  const dailyByUser = new Map(
    ((daily ?? []) as {
      user_id: string;
      active_seconds: number;
      last_active: string;
      current_path: string | null;
    }[]).map((d) => [d.user_id, d])
  );
  const allLogs = (logs ?? []) as {
    id: string;
    user_id: string;
    action: string;
    detail: string | null;
    created_at: string;
  }[];

  // Aktionen heute pro Nutzer zählen.
  const actionsToday = new Map<string, number>();
  for (const l of allLogs) {
    if (new Date(l.created_at) >= dayStart)
      actionsToday.set(l.user_id, (actionsToday.get(l.user_id) ?? 0) + 1);
  }

  const nameOf = (id: string): string => {
    const m = memberList.find((x) => x.id === id);
    const n = m?.full_name?.trim();
    return n || `Mitarbeiter ·${id.slice(0, 4)}`;
  };

  const nowMs = Date.now();
  const rows = memberList
    .map((m) => {
      const d = dailyByUser.get(m.id);
      const activeSeconds = d?.active_seconds ?? 0;
      const lastActive = d?.last_active ?? null;
      const online =
        lastActive != null &&
        (nowMs - new Date(lastActive).getTime()) / 1000 < ONLINE_WINDOW_S;
      const actions = actionsToday.get(m.id) ?? 0;
      // Effizienz = Aktionen pro aktiver Stunde (erst ab 5 min aussagekräftig).
      const efficiency =
        activeSeconds >= 300 ? actions / (activeSeconds / 3600) : null;
      return {
        id: m.id,
        name: m.full_name?.trim() || `Mitarbeiter ·${m.id.slice(0, 4)}`,
        role: m.role,
        activeSeconds,
        lastActive,
        currentPath: d?.current_path ?? null,
        online,
        actions,
        efficiency,
      };
    })
    .sort((a, b) => b.activeSeconds - a.activeSeconds);

  return (
    <>
      <Topbar section="Überwachung" />
      <div className="flex-1 overflow-auto scroll-thin bg-canvas p-4 md:p-10">
        <div className="max-w-5xl mx-auto">
          <PageHeader
            kicker="Nur Inhaber · Team-Aktivität"
            title="Überwachung"
            description="Aktive Zeit heute, erledigte Aktionen und Effizienz je Mitarbeiter. Aktive Zeit wird per Heartbeat gemessen (nur sichtbare Tabs zählen); der Effizienz-Score ist Aktionen ÷ aktive Stunde."
          />

          {/* Mitarbeiter-Tabelle */}
          <Panel flush className="mt-6 overflow-hidden">
            <div className="hidden md:grid grid-cols-[1fr_92px_120px_110px_130px_1fr] items-center gap-3 px-5 py-2.5 border-b border-hairline bg-canvas/60 th">
              <span>Mitarbeiter</span>
              <span>Status</span>
              <span className="inline-flex items-center gap-1"><Clock size={12} /> Aktiv heute</span>
              <span className="inline-flex items-center gap-1"><Zap size={12} /> Aktionen</span>
              <span className="inline-flex items-center gap-1"><Gauge size={12} /> Effizienz</span>
              <span>Gerade auf</span>
            </div>
            {rows.map((r) => (
              <div
                key={r.id}
                className="grid md:grid-cols-[1fr_92px_120px_110px_130px_1fr] grid-cols-2 items-center gap-3 px-5 py-3 border-b border-hairline last:border-0 text-[13.5px]"
              >
                <span className="font-medium text-ink truncate">
                  {r.name}
                  {r.role === "owner" && (
                    <span className="ml-2 text-[10.5px] font-mono text-ink-muted">Inhaber</span>
                  )}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Circle
                    size={8}
                    className={r.online ? "fill-emerald-500 text-emerald-500" : "fill-ink-muted/40 text-ink-muted/40"}
                  />
                  <span className={`text-[12px] ${r.online ? "text-emerald-700" : "text-ink-muted"}`}>
                    {r.online ? "online" : r.lastActive ? fmtClock(r.lastActive) : "—"}
                  </span>
                </span>
                <span className="font-mono tnum text-ink-soft">{fmtDuration(r.activeSeconds)}</span>
                <span className="font-mono tnum text-ink-soft">{r.actions}</span>
                <span className="font-mono tnum">
                  {r.efficiency != null ? (
                    <span className="text-ink font-semibold">
                      {r.efficiency.toFixed(1)}
                      <span className="text-[11px] text-ink-muted font-normal"> /Std</span>
                    </span>
                  ) : (
                    <span className="text-ink-muted">—</span>
                  )}
                </span>
                <span className="text-[12.5px] text-ink-muted truncate">
                  {r.online ? pageLabel(r.currentPath) : "—"}
                </span>
              </div>
            ))}
            {rows.length === 0 && (
              <EmptyState
                Icon={Activity}
                title="Noch keine Aktivität"
                description="Sobald Mitarbeiter im Dashboard arbeiten, erscheinen hier aktive Zeit und Aktionen."
              />
            )}
          </Panel>

          {/* Aktivitäts-Verlauf */}
          <Panel flush className="mt-6">
            <PanelHeader Icon={Activity} title="Letzte Aktivitäten" />
            <div className="divide-y divide-hairline">
              {allLogs.length === 0 && (
                <div className="px-5 py-6 text-[13px] text-ink-muted">
                  Noch keine protokollierten Aktionen.
                </div>
              )}
              {allLogs.map((l) => (
                <div key={l.id} className="flex items-center gap-3 px-5 py-2.5 text-[13px]">
                  <span className="font-mono tnum text-[11px] text-ink-muted w-12 shrink-0">
                    {fmtClock(l.created_at)}
                  </span>
                  <span className="font-medium text-ink truncate w-40 shrink-0">
                    {nameOf(l.user_id)}
                  </span>
                  <span className="text-ink-soft truncate flex-1">
                    {actionLabel(l.action)}
                    {l.detail ? <span className="text-ink-muted"> · {l.detail}</span> : null}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <p className="mt-4 text-[11px] text-ink-muted">
            Hinweis: Mitarbeiter-Überwachung unterliegt in Deutschland Mitbestimmung/Datenschutz
            (BetrVG, DSGVO). Diese Auswertung ist ausschließlich für Inhaber sichtbar.
          </p>
        </div>
      </div>
    </>
  );
}
