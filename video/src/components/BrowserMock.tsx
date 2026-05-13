import type { ReactNode, CSSProperties } from "react";
import { COLORS } from "../lib/constants";

export const BrowserMock = ({
  url = "app.knoellchen-pilot.de",
  children,
  variant = "light",
  style,
}: {
  url?: string;
  children: ReactNode;
  variant?: "light" | "dark";
  style?: CSSProperties;
}) => {
  const dark = variant === "dark";
  const headerBg = dark ? "rgba(0,0,0,0.4)" : COLORS.stone50;
  const bg = dark ? "#0a0a0a" : "#ffffff";
  const ringColor = dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)";
  const urlBg = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
  const urlColor = dark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";

  return (
    <div
      style={{
        borderRadius: 18,
        overflow: "hidden",
        background: bg,
        boxShadow: `0 60px 140px -40px rgba(0,0,0,0.6), 0 0 0 1px ${ringColor}`,
        ...style,
      }}
    >
      <div
        style={{
          height: 42,
          background: headerBg,
          borderBottom: `1px solid ${ringColor}`,
          display: "flex",
          alignItems: "center",
          padding: "0 18px",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ width: 12, height: 12, borderRadius: 99, background: "#FF5F57" }} />
          <span style={{ width: 12, height: 12, borderRadius: 99, background: "#FEBC2E" }} />
          <span style={{ width: 12, height: 12, borderRadius: 99, background: "#28C840" }} />
        </div>
        <div
          style={{
            margin: "0 auto",
            padding: "0 12px",
            height: 22,
            borderRadius: 6,
            background: urlBg,
            color: urlColor,
            fontSize: 12,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            display: "flex",
            alignItems: "center",
            gap: 6,
            minWidth: 280,
            justifyContent: "center",
          }}
        >
          <span style={{ opacity: 0.6 }}>🔒</span>
          {url}
        </div>
        <span style={{ width: 36 }} />
      </div>
      <div style={{ background: bg }}>{children}</div>
    </div>
  );
};
