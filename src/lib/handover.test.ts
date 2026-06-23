import { describe, it, expect } from "vitest";
import { summarizeComparison } from "./handover";
import type { CompareResultMap } from "./handover";

const ok = (has_damage: boolean, severity: string) => ({
  ok: true as const,
  data: { has_damage, description: "", severity },
});
const fail = { ok: false as const, error: "Vorher- oder Nachher-Foto fehlt" };

describe("summarizeComparison", () => {
  it("keine OK-Ergebnisse → null severity, kein neuer Schaden", () => {
    const map: CompareResultMap = { front: fail, rear: fail };
    expect(summarizeComparison(map)).toEqual({
      has_new_damage: false,
      max_severity: null,
    });
  });

  it("OK-Ergebnisse aber alle ohne Schaden → 'none'", () => {
    const map: CompareResultMap = {
      front: ok(false, "none"),
      rear: ok(false, "none"),
    };
    expect(summarizeComparison(map)).toEqual({
      has_new_damage: false,
      max_severity: "none",
    });
  });

  it("ein Schaden → has_new_damage true, severity dieser Position", () => {
    const map: CompareResultMap = {
      front: ok(false, "none"),
      rear: ok(true, "minor"),
    };
    expect(summarizeComparison(map)).toEqual({
      has_new_damage: true,
      max_severity: "minor",
    });
  });

  it("höchste Stufe gewinnt (major > minor > none)", () => {
    const map: CompareResultMap = {
      front: ok(true, "minor"),
      rear: ok(true, "major"),
      left: ok(false, "none"),
    };
    expect(summarizeComparison(map)).toEqual({
      has_new_damage: true,
      max_severity: "major",
    });
  });

  it("ignoriert fehlerhafte Positionen bei der Aggregation", () => {
    const map: CompareResultMap = {
      front: fail,
      rear: ok(true, "major"),
    };
    expect(summarizeComparison(map)).toEqual({
      has_new_damage: true,
      max_severity: "major",
    });
  });

  it("has_damage=true ohne erkannte severity zählt trotzdem als neuer Schaden", () => {
    const map: CompareResultMap = {
      front: ok(true, "unknown"),
    };
    const res = summarizeComparison(map);
    expect(res.has_new_damage).toBe(true);
    // 'none' als Fallback, da es OK-Ergebnisse gibt, aber keine bekannte Stufe.
    expect(res.max_severity).toBe("none");
  });
});
