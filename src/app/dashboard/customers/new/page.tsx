import { Topbar } from "@/components/dashboard/Topbar";
import { NewCustomerClient } from "./NewCustomerClient";

export const dynamic = "force-dynamic";

export default function NewCustomerPage() {
  return (
    <>
      <Topbar section="Neuer Kunde" />
      <div className="flex-1 overflow-auto scroll-thin bg-stone-50 p-6 md:p-10">
        <div className="max-w-3xl mx-auto">
          <NewCustomerClient />
        </div>
      </div>
    </>
  );
}
