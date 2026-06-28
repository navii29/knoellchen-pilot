import type { NotifyInput } from "@/lib/notify";
import { fmtDate } from "@/lib/utils";

// Baut die In-Portal-Benachrichtigung an den Mieter zu einer Verlängerungs-
// Entscheidung (bestätigt/abgelehnt). Reine Funktion → testbar ohne DB-Mock.
//
// Liefert `null`, wenn kein Empfänger feststeht (customer_id ist auf
// contract_extensions ON DELETE SET NULL, also nullable) — der Aufrufer
// überspringt notify() dann, statt es mit null aufzurufen.
export type ExtensionDecision = "approve" | "decline";

export const buildExtensionNotification = (input: {
  action: ExtensionDecision;
  customerId: string | null | undefined;
  orgId: string;
  contractId: string;
  requestedReturnDate: string;
}): NotifyInput | null => {
  const { action, customerId, orgId, contractId, requestedReturnDate } = input;
  if (!customerId) return null;

  const approved = action === "approve";
  const datum = fmtDate(requestedReturnDate);
  return {
    customer_id: customerId,
    org_id: orgId,
    type: "extension",
    title: approved ? "Verlängerung bestätigt" : "Verlängerung abgelehnt",
    body: approved
      ? `Neues Rückgabedatum: ${datum}.`
      : `Deine Verlängerung auf ${datum} wurde abgelehnt.`,
    link: `/portal/contracts/${contractId}`,
  };
};
