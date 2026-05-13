// Rendert den Mietvertrag-HTML aus contract-html.ts via headless Chrome
// in ein A4-PDF. Lokal: System-Chrome (CHROME_PATH oder macOS-Default).
// Vercel: @sparticuz/chromium (Lambda-optimierter Build).
//
// generateContractPdf ist async — alle Callers awaiten.

import puppeteer, { type LaunchOptions } from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import type {
  Contract,
  Customer,
  Organization,
} from "./types";
import type { VehicleTire } from "./tires";
import type { Vehicle } from "./types";
import { buildContractHtml } from "./contract-html";

const isServerless =
  process.env.VERCEL === "1" ||
  process.env.AWS_REGION != null ||
  process.env.AWS_LAMBDA_FUNCTION_NAME != null;

const LOCAL_CHROME_PATHS = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

const launchOptions = async (): Promise<LaunchOptions> => {
  if (isServerless) {
    return {
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    };
  }
  const path = LOCAL_CHROME_PATHS.find((p) => !!p);
  if (!path) {
    throw new Error(
      "Kein lokaler Chrome gefunden — CHROME_PATH env var setzen oder Chrome installieren."
    );
  }
  return {
    executablePath: path,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  };
};

export const generateContractPdf = async (args: {
  org: Organization;
  contract: Contract;
  customer: Customer | null;
  vehicle: Vehicle | null;
  tires?: VehicleTire | null;
  logoPngBase64?: string | null; // Param-Name aus Kompat zu alten Aufrufen — akzeptiert auch JPG/SVG-Data-URI
  signaturePngBase64?: string | null;
}): Promise<Buffer> => {
  const html = buildContractHtml({
    org: args.org,
    contract: args.contract,
    customer: args.customer,
    vehicle: args.vehicle,
    tires: args.tires ?? null,
    logoDataUri: args.logoPngBase64 ?? null,
    signaturePngBase64: args.signaturePngBase64 ?? null,
  });

  const browser = await puppeteer.launch(await launchOptions());
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await page.emulateMediaType("print");
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `
        <div style="font-size:7.5pt; color:#888; text-align:center; width:100%; padding: 0 14mm;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>
      `,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
};
