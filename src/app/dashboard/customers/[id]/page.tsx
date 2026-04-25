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

  let licenseUrl: string | null = null;
  let idCardUrl: string | null = null;
  if (c.license_photo_path || c.id_card_photo_path) {
    const admin = createAdminClient();
    if (c.license_photo_path) {
      const { data: signed } = await admin.storage
        .from("customer-documents")
        .createSignedUrl(c.license_photo_path, 3600);
      licenseUrl = signed?.signedUrl || null;
    }
    if (c.id_card_photo_path) {
      const { data: signed } = await admin.storage
        .from("customer-documents")
        .createSignedUrl(c.id_card_photo_path, 3600);
      idCardUrl = signed?.signedUrl || null;
    }
  }

  return (
    <>
      <Topbar section={`Kunde · ${fullName(c)}`} />
      <div className="flex-1 overflow-auto scroll-thin bg-stone-50">
        <div className="max-w-4xl mx-auto p-4 md:p-10">
          <Link
            href="/dashboard/customers"
            className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 mb-4"
          >
            <ArrowLeft size={14} /> Zurück zu Kunden
          </Link>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              {c.salutation && (
                <div className="text-xs text-stone-500 mb-1">{c.salutation}</div>
              )}
              <h1 className="font-display font-bold text-3xl tracking-tight">{fullName(c)}</h1>
              {c.birthday && (
                <div className="mt-1 text-sm text-stone-500">
                  geb. {fmtDate(c.birthday)}
                </div>
              )}
            </div>
            <CustomerActions customerId={c.id} />
          </div>

          <div className="mt-6 grid sm:grid-cols-2 gap-3">
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
              <Row label="Nummer" value={c.license_nr ? <span className="font-mono">{c.license_nr}</span> : "—"} />
              <Row label="Klassen" value={c.license_class || "—"} />
              <Row label="Gültig bis" value={c.license_expiry ? fmtDate(c.license_expiry) : "—"} mono />
              {licenseUrl && (
                <a
                  href={licenseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-teal-700 hover:underline mt-2"
                >
                  Foto öffnen <ChevronRight size={12} />
                </a>
              )}
            </InfoCard>

            <InfoCard Icon={IdCard} title="Personalausweis">
              <Row label="Nummer" value={c.id_card_nr ? <span className="font-mono">{c.id_card_nr}</span> : "—"} />
              {idCardUrl && (
                <a
                  href={idCardUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-teal-700 hover:underline mt-2"
                >
                  Foto öffnen <ChevronRight size={12} />
                </a>
              )}
            </InfoCard>
          </div>

          {c.notes && (
            <div className="mt-3 rounded-xl bg-white ring-1 ring-stone-200 p-5">
              <div className="text-xs uppercase tracking-wider text-stone-500 font-semibold mb-2">
                Notizen
              </div>
              <div className="text-sm whitespace-pre-wrap">{c.notes}</div>
            </div>
          )}

          <div className="mt-6">
            <div className="text-xs uppercase tracking-wider text-stone-500 font-medium mb-2 flex items-center gap-2">
              <FileSignature size={12} />
              Verträge dieses Kunden ({linkedContracts.length})
            </div>
            <div className="rounded-xl bg-white ring-1 ring-stone-200 overflow-hidden">
              {linkedContracts.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-stone-500">
                  Noch keine Verträge mit diesem Kunden verknüpft.
                  <br />
                  <Link
                    href={`/dashboard/contracts/new?customer_id=${c.id}`}
                    className="inline-block mt-2 text-teal-700 hover:underline"
                  >
                    Vertrag mit diesem Kunden anlegen →
                  </Link>
                </div>
              )}
              {linkedContracts.map((ct) => (
                <Link
                  key={ct.id}
                  href={`/dashboard/contracts/${ct.id}`}
                  className="grid grid-cols-[140px_100px_1fr_120px_120px_24px] items-center gap-3 px-5 py-3 border-b border-stone-50 last:border-0 text-sm hover:bg-stone-50"
                >
                  <span className="font-mono text-xs">{ct.contract_nr}</span>
                  <span className="font-mono font-semibold">{ct.plate}</span>
                  <span className="text-stone-700 truncate">{ct.vehicle_type || "—"}</span>
                  <span className="text-xs text-stone-500 tabular-nums">
                    {fmtDate(ct.pickup_date)} → {fmtDate(ct.return_date)}
                  </span>
                  <ContractStatusBadge status={ct.status} />
                  <ChevronRight size={14} className="text-stone-300" />
                </Link>
              ))}
            </div>
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
  <div className="rounded-xl bg-white ring-1 ring-stone-200 p-5">
    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-stone-500 font-semibold mb-3">
      <Icon size={13} />
      {title}
    </div>
    <div className="space-y-1.5">{children}</div>
  </div>
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
  <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
    <div className="text-stone-500 text-xs">{label}</div>
    <div className={mono ? "tabular-nums text-stone-800" : "text-stone-800"}>{value}</div>
  </div>
);
