import Link from "next/link";
import { ChevronRight, FileText, User, type LucideIcon } from "lucide-react";
import { getPortalCustomer } from "@/lib/portal-auth";
import { Surface } from "@/components/portal/kit/Surface";
import { LogoutButton } from "@/components/portal/LogoutButton";

export const dynamic = "force-dynamic";

export default async function PortalMehrPage() {
  const ctx = await getPortalCustomer();
  if (!ctx) return null;

  return (
    <div className="px-5 py-4 space-y-4">
      <h1 className="font-display text-[22px] tracking-tightest font-bold text-ink px-1">Mehr</h1>

      <Surface padding="p-0" className="overflow-hidden">
        <div className="divide-y divide-hairline">
          <MenuLink href="/portal/documents" Icon={FileText} label="Dokumente" />
          <MenuLink href="/portal/profile" Icon={User} label="Profil" />
          <LogoutButton />
        </div>
      </Surface>
    </div>
  );
}

const MenuLink = ({ href, Icon, label }: { href: string; Icon: LucideIcon; label: string }) => (
  <Link
    href={href}
    className="flex items-center gap-3 px-4 py-3 hover:bg-paper/40 transition-colors"
  >
    <div className="w-9 h-9 rounded-xl bg-signal-soft text-signal-ink flex items-center justify-center shrink-0">
      <Icon size={16} />
    </div>
    <span className="flex-1 text-[14px] font-medium text-ink">{label}</span>
    <ChevronRight size={14} className="text-ink-muted shrink-0" />
  </Link>
);
