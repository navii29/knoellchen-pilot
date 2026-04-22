import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import { SettingsClient } from "./SettingsClient";
import type { Organization } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createClient();
  const { data } = await supabase.from("organizations").select("*").single();
  return (
    <>
      <Topbar section="Einstellungen" />
      <div className="flex-1 overflow-auto scroll-thin bg-stone-50 p-6 md:p-10">
        <div className="max-w-3xl mx-auto">
          <SettingsClient org={data as Organization} />
        </div>
      </div>
    </>
  );
}
