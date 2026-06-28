import { describe, it, expect } from "vitest";
import { formatNotificationBadge, parseMarkReadBody } from "./operator-notify-ui";

describe("formatNotificationBadge", () => {
  it("0 oder negativ → leer (kein Badge)", () => {
    expect(formatNotificationBadge(0)).toBe("");
    expect(formatNotificationBadge(-3)).toBe("");
  });
  it("1..9 → die Zahl", () => {
    expect(formatNotificationBadge(1)).toBe("1");
    expect(formatNotificationBadge(9)).toBe("9");
  });
  it(">9 → gekappt auf 9+", () => {
    expect(formatNotificationBadge(10)).toBe("9+");
    expect(formatNotificationBadge(250)).toBe("9+");
  });
  it("NaN → leer", () => {
    expect(formatNotificationBadge(Number.NaN)).toBe("");
  });
});

describe("parseMarkReadBody", () => {
  it("gültige id → genau dieser Eintrag", () => {
    expect(parseMarkReadBody({ id: "ext-1" })).toEqual({ id: "ext-1" });
    expect(parseMarkReadBody({ id: "  ext-2  " })).toEqual({ id: "ext-2" });
  });
  it("fehlend/leer/kein String → null (= alle)", () => {
    expect(parseMarkReadBody({})).toEqual({ id: null });
    expect(parseMarkReadBody({ id: "" })).toEqual({ id: null });
    expect(parseMarkReadBody({ id: 42 })).toEqual({ id: null });
    expect(parseMarkReadBody(null)).toEqual({ id: null });
    expect(parseMarkReadBody("nope")).toEqual({ id: null });
  });
});
