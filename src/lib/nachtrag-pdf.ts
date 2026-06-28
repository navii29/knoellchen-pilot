// Erzeugt das Nachtrag-PDF aus dem eigenständigen HTML-Template via den
// geteilten headless-Chrome-Renderer (renderHtmlToPdf aus contract-pdf.ts) —
// dasselbe Muster wie handover-protocol-pdf.ts. Keine Kopie des Renderers.
import { renderHtmlToPdf } from "./contract-pdf";
import { buildNachtragHtml, type NachtragInput } from "./nachtrag-html";

export const generateNachtragPdf = async (input: NachtragInput): Promise<Buffer> => {
  const html = buildNachtragHtml(input);
  return renderHtmlToPdf(html);
};
