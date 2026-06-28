// Insert-Payload für eine operator-seitige Benachrichtigung (Tabelle
// operator_notifications, Migration 067). Reine Funktion → ohne DB-Mock testbar.
//
// org_id ist die Mandanten-Grenze und PFLICHT: fehlt sie, wird die Zeile gar
// nicht erst gebaut (throw), damit nie ein Eintrag ohne org_id entsteht. Der
// Body ist statisch (KEIN Mieter-Name o.ä.), die Tabelle bleibt PII-arm.

export type OperatorNotificationInsert = {
  org_id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  contract_id: string | null;
  extension_id: string | null;
};

export const buildOperatorExtensionNotification = (input: {
  orgId: string;
  contractId: string;
  extensionId: string | null;
}): OperatorNotificationInsert => {
  if (!input.orgId) {
    throw new Error("operator_notifications: org_id ist Pflicht (Mandanten-Grenze)");
  }
  return {
    org_id: input.orgId,
    type: "extension_request",
    title: "Neue Verlängerungs-Anfrage",
    body: "Ein Mieter hat eine Verlängerung der Mietzeit angefragt.",
    link: `/dashboard/contracts/${input.contractId}`,
    contract_id: input.contractId,
    extension_id: input.extensionId,
  };
};
