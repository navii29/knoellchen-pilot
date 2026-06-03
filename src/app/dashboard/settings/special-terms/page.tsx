import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { createClient } from "@/lib/supabase/server";
import type { SpecialTermsTemplate } from "@/lib/types";
import { SpecialTermsClient } from "./SpecialTermsClient";

export const dynamic = "force-dynamic";

export default async function SpecialTermsSettingsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("special_terms_templates")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  return (
    <>
      <Topbar section="Einstellungen · Sondervereinbarungen" />
      <div className="flex-1 overflow-auto scroll-thin bg-zinc-50 p-4 md:p-10">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-4"
          >
            <ArrowLeft size={14} /> Zurück zu Einstellungen
          </Link>
          <SpecialTermsClient
            initialTemplates={(data ?? []) as SpecialTermsTemplate[]}
          />
        </div>
      </div>
    </>
  );
}
