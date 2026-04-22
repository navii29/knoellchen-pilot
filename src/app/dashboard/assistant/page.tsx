import { Topbar } from "@/components/dashboard/Topbar";
import { AssistantClient } from "./AssistantClient";

export default function AssistantPage() {
  return (
    <>
      <Topbar section="Assistent" />
      <AssistantClient />
    </>
  );
}
