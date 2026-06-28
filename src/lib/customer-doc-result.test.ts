import { describe, it, expect } from "vitest";
import { summarizeDocOcr } from "./customer-doc-result";

describe("summarizeDocOcr", () => {
  it("Erfolg: meldet die geplanten Felder als gespeichert, keine Fehler", () => {
    const r = summarizeDocOcr({
      plannedFilled: ["license_nr", "license_class"],
      parseFailed: false,
      updateFailed: false,
    });
    expect(r.filled).toEqual(["license_nr", "license_class"]);
    expect(r.ocr_error).toBe(false);
    expect(r.save_failed).toBe(false);
  });

  it("Update-Fehler: meldet NICHTS als gespeichert + ocr_error + save_failed", () => {
    const r = summarizeDocOcr({
      plannedFilled: ["license_nr", "license_class"],
      parseFailed: false,
      updateFailed: true,
    });
    expect(r.filled).toEqual([]); // niemals die geplanten Felder als Erfolg
    expect(r.ocr_error).toBe(true);
    expect(r.save_failed).toBe(true);
  });

  it("Parse-Fehler: nichts gespeichert + ocr_error, aber NICHT save_failed", () => {
    const r = summarizeDocOcr({
      plannedFilled: [],
      parseFailed: true,
      updateFailed: false,
    });
    expect(r.filled).toEqual([]);
    expect(r.ocr_error).toBe(true);
    expect(r.save_failed).toBe(false);
  });

  it("Nichts zu füllen: leeres filled, keine Fehler", () => {
    const r = summarizeDocOcr({
      plannedFilled: [],
      parseFailed: false,
      updateFailed: false,
    });
    expect(r.filled).toEqual([]);
    expect(r.ocr_error).toBe(false);
    expect(r.save_failed).toBe(false);
  });
});
