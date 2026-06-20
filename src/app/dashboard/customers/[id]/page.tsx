import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  CreditCard,
  FileSignature,
  IdCard,
  Mail,
  MapPin,
  User,
} from "lucide-react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import { ContractStatusBadge } from "@/components/contract/StatusBadge";
import { CustomerActions } from "./CustomerActions";
import { CustomerEditPanel } from "./CustomerEditPanel";
import { CustomerDocumentsCard } from "./CustomerDocumentsCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { Plate } from "@/components/ui/Plate";
import { fmtDate } from "@/lib/utils";
import type { Contract, Customer } from "@/lib/types";

export const dynamic = "force-dynamic";

const fullName = (c: Customer) =>
  [c.title, c.first_name, c.last_name].filter(Boolean).join(" ") || c.last_name;

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!customer) notFound();
  const c = customer as Customer;

  const { data: contracts } = await supabase
    .from("contracts")
    .select("*")
    .eq("customer_id", c.id)
    .order("pickup_date", { ascending: false });
  const linkedContracts = (contracts || []) as Contract[];

  // Org des eingeloggten Users — für die Pfad-Absicherung der Storage-Dokumente.
  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();
  const orgId = (profile?.org_id as string | undefined) ?? null;
  // Nur Dokumente signieren, deren Pfad zur eigenen Org gehört — ein manipulierter
  // Pfad (z. B. via fremder org_id) darf keine fremden Ausweis-Scans offenlegen.
  const orgOwnsPath = (p: string | null): p is string =>
    !!p && !!orgId && p.startsWith(`${orgId}/`);
  const licPath = c.license_photo_path;
  const idPath = c.id_card_photo_path;

  let licenseUrl: string | null = null;
  let idCardUrl: string | null = null;
  if (orgOwnsPath(licPath) || orgOwnsPath(idPath)) {
    const admin = createAdminClient();
    if (orgOwnsPath(licPath)) {
      const { data: signed } = await admin.storage
        .from("customer-documents")
        .createSignedUrl(licPath, 3600);
      licenseUrl = signed?.signedUrl || null;
    }
    if (orgOwnsPath(idPath)) {
      const { data: signed } = await admin.storage
        .from("customer-documents")
        .createSignedUrl(idPath, 3600);
      idCardUrl = signed?.signedUrl || null;
    }
  }

  return (
    <>
      <Topbar section={`Kunde · ${fullName(c)}`} />
      <div className="flex-1 overflow-auto scroll-thin bg-canvas">
        <div className="max-w-4xl mx-auto p-4 md:p-10">
          <Link
            href="/dashboard/customers"
            className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink mb-5"
          >
            <ArrowLeft size={14} /> Zurück zu Kunden
          </Link>

          <PageHeader
            kicker={c.salutation || "Kunde"}
            title={fullName(c)}
            description={c.birthday ? `geb. ${fmtDate(c.birthday)}` : undefined}
            actions={<CustomerActions customerId={c.id} customerEmail={c.email} />}
          />

          <div className="mt-6">
            <CustomerEditPanel customer={c}>
              <div className="grid sm:grid-cols-2 gap-3">
            <InfoCard Icon={MapPin} title="Anschrift">
              <Row label="Straße" value={[c.street, c.house_nr].filter(Boolean).join(" ") || "—"} />
              <Row label="PLZ / Ort" value={[c.zip, c.city].filter(Boolean).join(" ") || "—"} />
              <Row label="Land" value={c.country || "Deutschland"} />
            </InfoCard>

            <InfoCard Icon={Mail} title="Kontakt">
              <Row label="E-Mail" value={c.email || "—"} />
              <Row label="Telefon" value={c.phone || "—"} mono={!!c.phone} />
            </InfoCard>

            <InfoCard Icon={CreditCard} title="Führerschein">
              <Row label="Nummer" value={c.license_nr ? <span className="font-mono tnum">{c.license_nr}</span> : "—"} />
              <Row label="Klassen" value={c.license_class || "—"} />
              <Row label="Gültig bis" value={c.license_expiry ? fmtDate(c.license_expiry) : "—"} mono />
              {licenseUrl && (
                <a
                  href={licenseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] text-signal hover:underline mt-2"
                >
                  Foto öffnen <ChevronRight size={12} />
                </a>
              )}
            </InfoCard>

            <InfoCard Icon={IdCard} title="Personalausweis">
              <Row label="Nummer" value={c.id_card_nr ? <span className="font-mono tnum">{c.id_card_nr}</span> : "—"} />
              {idCardUrl && (
                <a
                  href={idCardUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] text-signal hover:underline mt-2"
                >
                  Foto öffnen <ChevronRight size={12} />
                </a>
              )}
            </InfoCard>
              </div>
              {c.notes && (
                <Panel className="mt-3">
                  <div className="data-label mb-2">Notizen</div>
                  <div className="text-[13.5px] text-ink whitespace-pre-wrap">{c.notes}</div>
                </Panel>
              )}
            </CustomerEditPanel>
          </div>

          <div className="mt-6">
            <CustomerDocumentsCard
              customerId={c.id}
              licenseUrl={licenseUrl}
              idCardUrl={idCardUrl}
            />
          </div>

          <div className="mt-6">
            <Panel flush>
              <PanelHeader
                Icon={FileSignature}
                title={`Verträge dieses Kunden (${linkedContracts.length})`}
              />
              {linkedContracts.length === 0 ? (
                <EmptyState
                  Icon={FileSignature}
                  title="Noch keine Verträge mit diesem Kunden."
                  action={
                    <ButtonLink
                      href={`/dashboard/contracts/new?customer_id=${c.id}`}
                      variant="signal"
                      size="sm"
                    >
                      Vertrag anlegen
                    </ButtonLink>
                  }
                />
              ) : (
                linkedContracts.map((ct) => (
                  <Link
                    key={ct.id}
                    href={`/dashboard/contracts/${ct.id}`}
                    className="grid grid-cols-[140px_128px_1fr_120px_120px_24px] items-center gap-3 px-5 py-3 border-b border-hairline last:border-0 text-[13.5px] hover:bg-canvas transition-colors"
                  >
                    <span className="font-mono text-[12px] text-ink-muted tnum">{ct.contract_nr}</span>
                    {ct.plate ? (
                      <Plate value={ct.plate} size="sm" />
                    ) : (
                      <span className="font-mono text-ink-muted">—</span>
                    )}
                    <span className="text-ink truncate">{ct.vehicle_type || "—"}</span>
                    <span className="text-[12px] text-ink-muted font-mono tnum">
                      {fmtDate(ct.pickup_date)} → {fmtDate(ct.return_date)}
                    </span>
                    <ContractStatusBadge status={ct.status} />
                    <ChevronRight size={14} className="text-ink-muted" />
                  </Link>
                ))
              )}
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}

const InfoCard = ({
  title,
  Icon,
  children,
}: {
  title: string;
  Icon: typeof User;
  children: React.ReactNode;
}) => (
  <Panel>
    <div className="flex items-center gap-2 data-label mb-3">
      <Icon size={13} className="text-ink-muted" />
      {title}
    </div>
    <div className="space-y-1.5">{children}</div>
  </Panel>
);

const Row = ({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) => (
  <div className="grid grid-cols-[120px_1fr] gap-2 text-[13px]">
    <div className="text-ink-muted text-[12px]">{label}</div>
    <div className={mono ? "font-mono tnum text-ink" : "text-ink"}>{value}</div>
  </div>
);
