import { createClient } from "@/lib/supabase/server";
import { requirePermissionPage } from "@/lib/team";
import { Topbar } from "@/components/dashboard/Topbar";
import { WebsiteClient } from "./WebsiteClient";
import type { SiteTemplate } from "@/lib/site/types";

export const dynamic = "force-dynamic";

export default async function WebsitePage() {
  // Mitarbeiter ohne 'settings'-Recht werden auf /dashboard umgeleitet.
  await requirePermissionPage("settings");
  const supabase = createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("name, slug")
    .single();

  // RLS sorgt dafür, dass nur die eigene Site sichtbar ist.
  const { data: site } = await supabase
    .from("sites")
    .select("template, published")
    .maybeSingle();

  return (
    <>
      <Topbar section="Mietseite" />
      <div className="flex-1 overflow-auto scroll-thin bg-canvas p-4 md:p-10">
        <div className="max-w-3xl mx-auto">
          <WebsiteClient
            slug={org?.slug ?? null}
            orgName={org?.name ?? ""}
            initialTemplate={(site?.template as SiteTemplate) ?? null}
            initialPublished={site?.published ?? false}
            hasSite={!!site}
          />
        </div>
      </div>
    </>
  );
}
