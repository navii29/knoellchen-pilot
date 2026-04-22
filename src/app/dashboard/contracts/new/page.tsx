import { Topbar } from "@/components/dashboard/Topbar";
import { NewContractClient } from "./NewContractClient";

export default function NewContractPage() {
  return (
    <>
      <Topbar section="Neuer Vertrag" />
      <div className="flex-1 overflow-auto scroll-thin bg-stone-50 p-6 md:p-10">
        <div className="max-w-3xl mx-auto">
          <NewContractClient />
        </div>
      </div>
    </>
  );
}
