import { Topbar } from "@/components/dashboard/Topbar";
import { PartnerForm } from "../PartnerForm";

export const dynamic = "force-dynamic";

export default function NewPartnerPage() {
  return (
    <>
      <Topbar section="Neuer Partner" />
      <div className="flex-1 overflow-auto scroll-thin bg-canvas p-4 md:p-10">
        <div className="max-w-3xl mx-auto">
          <PartnerForm mode="create" />
        </div>
      </div>
    </>
  );
}
