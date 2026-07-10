// Rendert das Übergabeprotokoll-HTML aus handover-protocol-html.ts via dem
// gemeinsamen headless-Chrome-Renderer (renderHtmlToPdf aus contract-pdf.ts)
// zu einem A4-PDF. Gleiche Launch-/PDF-Optionen wie der Mietvertrag.
//
// generateHandoverProtocolPdf ist async — alle Callers awaiten.

import type { Contract, Customer, Organization, Vehicle } from "./types";
import type { ReturnSummary } from "./km";
import { renderHtmlToPdf } from "./contract-pdf";
import {
  buildHandoverProtocolHtml,
  type HandoverProtocolType,
  type ProtocolPhoto,
} from "./handover-protocol-html";

export const generateHandoverProtocolPdf = async (args: {
  org: Organization;
  contract: Contract;
  customer: Customer | null;
  vehicle: Vehicle | null;
  type: HandoverProtocolType;
  photos: ProtocolPhoto[];
  sigLessorPng: string | null;
  sigRenterPng: string | null;
  logoDataUri: string | null;
  returnSummary?: ReturnSummary | null;
  renterAbsent?: boolean;
}): Promise<Buffer> => {
  const html = buildHandoverProtocolHtml(args);
  return renderHtmlToPdf(html);
};
