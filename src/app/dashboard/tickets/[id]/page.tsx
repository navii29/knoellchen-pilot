import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Mail, ScanText, Send, UserCheck, UserSearch, Wallet } from "lucide-react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ConfidenceBanner } from "@/components/ticket/ConfidenceBanner";
import { TicketActions } from "@/components/ticket/TicketActions";
import { ChargeEditor } from "@/components/ticket/ChargeEditor";
import { fmtDate, fmtEur, initials, relTime } from "@/lib/utils";
import type { Ticket, Contract, TicketLog } from "@/lib/types";

export const dynamic = "force-dynamic";

const TIMELINE_ICONS = {
  upload: { Icon: Mail, label: "Strafzettel hochgeladen" },
  parsed: { Icon: ScanText, label: "KI-Auslesung abgeschlossen" },
  matched: { Icon: UserCheck, label: "Fahrer zugeordnet" },
  documents: { Icon: Send, label: "Dokumente generiert" },
  paid: { Icon: Wallet, label: "Zahlung eingegangen" },
} as const;

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: ticket } = await supabase
    .from("tickets")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!ticket) notFound();
  const t = ticket as Ticket;

  const [{ data: contractData }, { data: logs }] = await Promise.all([
    t.contract_id
      ? supabase.from("contracts").select("*").eq("id", t.contract_id).maybeSingle()
      : Promise.resolve({ data: null as Contract | null }),
    supabase
      .from("ticket_logs")
      .select("*")
      .eq("ticket_id", t.id)
      .order("created_at", { ascending: true }),
  ]);
  const contract = contractData as Contract | null;

  let uploadUrl: string | null = null;
  if (t.upload_path) {
    const admin = createAdminClient();
    const { data: signed } = await admin.storage
      .from("ticket-uploads")
      .createSignedUrl(t.upload_path, 3600);
    uploadUrl = signed?.signedUrl || null;
  }

  return (
    <>
      <Topbar section={`Strafzettel · ${t.ticket_nr}`} />
      <div className="flex-1 overflow-auto scroll-thin bg-stone-50">
        <div className="max-w-4xl mx-auto p-4 md:p-10">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 mb-4"
          >
            <ChevronLeft size={14} /> Zurück zum Dashboard
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-xs text-stone-500">{t.ticket_nr}</span>
            <StatusBadge status={t.status} />
          </div>
          <h1 className="font-display font-bold text-3xl tracking-tight">
            {t.offense || "Strafzettel — noch nicht ausgelesen"}
          </h1>
          {(t.location || t.offense_date) && (
            <div className="mt-1 text-sm text-stone-500">
              {t.location || ""}
              {t.location && t.offense_date ? " · " : ""}
              {t.offense_date ? `${fmtDate(t.offense_date)}${t.offense_time ? " · " + t.offense_time : ""}` : ""}
            </div>
          )}

          <div className="mt-6 space-y-6">
            <ConfidenceBanner
              confidence={t.ai_confidence}
              source={t.source}
              uploadUrl={uploadUrl}
            />

            <div className="rounded-xl ring-1 ring-stone-200 divide-y divide-stone-100 bg-white">
              {[
                ["Kennzeichen", t.plate || "—", "font-mono font-semibold"],
                ["Fahrzeug", t.vehicle_type || "—"],
                ["Tatzeit", t.offense_date ? fmtDate(t.offense_date) + (t.offense_time ? " · " + t.offense_time : "") : "—", "tabular-nums"],
                ["Tatort", t.location || "—"],
                ["Behörde", t.authority || "—"],
                ["Aktenzeichen", t.reference_nr || "—", "font-mono text-xs"],
                ["Bußgeld (Behörde)", fmtEur(t.fine_amount), "tabular-nums"],
                ["Frist Behörde", fmtDate(t.deadline), "tabular-nums"],
              ].map(([k, v, cls]) => (
                <div key={k as string} className="grid grid-cols-[160px_1fr] gap-3 px-4 py-2.5 text-sm">
                  <div className="text-stone-500">{k}</div>
                  <div className={(cls as string) || ""}>{v}</div>
                </div>
              ))}
            </div>

            <ChargeEditor ticket={t} />

            <div>
              <div className="text-xs uppercase tracking-wider text-stone-500 font-medium mb-2">
                Fahrer zum Tatzeitpunkt
              </div>
              {contract ? (
                <Link
                  href={`/dashboard/contracts/${contract.id}`}
                  className="block rounded-xl ring-1 ring-stone-200 p-5 bg-white hover:ring-stone-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-full bg-stone-900 text-white flex items-center justify-center font-display font-semibold">
                      {initials(contract.renter_name)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-display font-semibold">{contract.renter_name}</div>
                        <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                          {contract.contract_nr}
                        </span>
                      </div>
                      <div className="text-sm text-stone-500">{contract.renter_address || "—"}</div>
                      <div className="mt-3 grid grid-cols-2 gap-2.5 text-xs">
                        <div>
                          <div className="text-stone-500">Mietbeginn</div>
                          <div className="tabular-nums mt-0.5">{fmtDate(contract.pickup_date)}</div>
                        </div>
                        <div>
                          <div className="text-stone-500">Mietende</div>
                          <div className="tabular-nums mt-0.5">
                            {fmtDate(contract.actual_return_date || contract.return_date)}
                          </div>
                        </div>
                        <div>
                          <div className="text-stone-500">E-Mail</div>
                          <div className="mt-0.5 truncate">{contract.renter_email || "—"}</div>
                        </div>
                        <div>
                          <div className="text-stone-500">Telefon</div>
                          <div className="tabular-nums mt-0.5">{contract.renter_phone || "—"}</div>
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                      Match
                    </span>
                  </div>
                </Link>
              ) : (
                <div className="rounded-xl ring-1 ring-dashed ring-amber-300 bg-amber-50/40 p-5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <UserSearch size={16} />
                  </div>
                  <div className="flex-1 text-sm">
                    <div className="font-medium text-amber-900">Kein Fahrer zugeordnet</div>
                    <div className="text-xs text-amber-800/80">
                      {t.plate && t.offense_date
                        ? "Kein passender Mietvertrag gefunden — bitte manuell prüfen oder Vertrag anlegen."
                        : "Kennzeichen oder Tatdatum fehlt — KI-Auslesung wiederholen."}
                    </div>
                  </div>
                  <Link
                    href="/dashboard/contracts"
                    className="text-xs px-2.5 py-1.5 rounded-md bg-white ring-1 ring-amber-200 text-amber-900"
                  >
                    Verträge prüfen
                  </Link>
                </div>
              )}
            </div>

            <TicketActions ticket={t} />

            <div>
              <div className="text-xs uppercase tracking-wider text-stone-500 font-medium mb-2">Verlauf</div>
              <div className="relative pl-6 bg-white rounded-xl ring-1 ring-stone-200 p-4">
                <div className="absolute left-[33px] top-5 bottom-5 w-px bg-stone-200" />
                {((logs || []) as TicketLog[]).map((l) => {
                  const meta = TIMELINE_ICONS[l.action as keyof typeof TIMELINE_ICONS] ?? {
                    Icon: ScanText,
                    label: l.action,
                  };
                  return (
                    <div key={l.id} className="relative flex items-start gap-3 py-2">
                      <div className="absolute -left-[3px] w-[18px] h-[18px] rounded-full bg-white ring-1 ring-stone-200 flex items-center justify-center">
                        <meta.Icon size={10} className="text-stone-500" />
                      </div>
                      <div className="flex-1 ml-6">
                        <div className="text-sm">{meta.label}</div>
                        <div className="text-xs text-stone-400">{relTime(l.created_at)}</div>
                      </div>
                    </div>
                  );
                })}
                {(!logs || logs.length === 0) && (
                  <div className="text-sm text-stone-500 py-2">Noch keine Ereignisse.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
