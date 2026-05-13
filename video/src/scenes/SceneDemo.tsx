import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT_DISPLAY } from "../lib/constants";
import { BrowserMock } from "../components/BrowserMock";
import { RadialGlow } from "../components/RadialGlow";
import { ParticleField } from "../components/ParticleField";

const STEPS = [
  ["KI liest Dokument aus", "1,2s", 14],
  ["Fahrer wird zugeordnet", "0,4s", 38],
  ["3 PDFs werden generiert", "0,8s", 60],
  ["E-Mail an Mieter versenden", "0,3s", 86],
];

export const SceneDemo = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headlineSpring = spring({ frame: frame - 4, fps, config: { damping: 18, stiffness: 110 } });
  const headlineOp = interpolate(headlineSpring, [0, 1], [0, 1]);
  const headlineY = interpolate(headlineSpring, [0, 1], [30, 0]);

  const browserSpring = spring({ frame: frame - 8, fps, config: { damping: 22, stiffness: 90 } });
  const browserScale = interpolate(browserSpring, [0, 1], [0.85, 1]);
  const browserOp = interpolate(browserSpring, [0, 1], [0, 1]);
  const browserY = interpolate(browserSpring, [0, 1], [40, 0]);

  // Big counter on the right side: "30 Min → 30 Sek"
  const counterSec = Math.round(
    interpolate(frame, [60, 130], [30, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
  );
  // For final pulse
  const finalPulse = spring({ frame: frame - 130, fps, config: { damping: 12, stiffness: 180 } });
  const finalScale = 1 + finalPulse * 0.08;

  return (
    <AbsoluteFill style={{ background: COLORS.black }}>
      <RadialGlow color="rgba(45,212,191,0.22)" x="35%" y="55%" size={1400} />
      <ParticleField count={30} color={COLORS.tealLight} />

      {/* Top headline */}
      <div
        style={{
          position: "absolute",
          top: 70,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: FONT_DISPLAY,
          opacity: headlineOp,
          transform: `translateY(${headlineY}px)`,
        }}
      >
        <div
          style={{
            fontSize: 22,
            color: COLORS.tealLight,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontWeight: 500,
            marginBottom: 14,
          }}
        >
          Knöllchen-Pilot
        </div>
        <div
          style={{
            fontSize: 76,
            fontWeight: 500,
            letterSpacing: "-0.035em",
            lineHeight: 1.05,
            color: COLORS.white,
          }}
        >
          Hochladen.{" "}
          <span
            style={{
              color: "transparent",
              background: `linear-gradient(135deg, ${COLORS.tealLight}, ${COLORS.emerald})`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
            }}
          >
            KI erledigt den Rest.
          </span>
        </div>
      </div>

      {/* Layout: Browser left, big counter right */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 70,
          paddingTop: 80,
        }}
      >
        {/* Browser */}
        <div
          style={{
            width: 920,
            transform: `translateY(${browserY}px) scale(${browserScale})`,
            opacity: browserOp,
            transformOrigin: "center",
          }}
        >
          <BrowserMock url="app.knoellchen-pilot.de/upload" variant="dark">
            <div style={{ padding: 28, color: COLORS.white }}>
              {/* Drop zone */}
              <div
                style={{
                  border: "2px dashed rgba(255,255,255,0.18)",
                  borderRadius: 14,
                  padding: 22,
                  textAlign: "center",
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 99,
                    background: "rgba(13,148,136,0.18)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: COLORS.tealLight,
                    fontSize: 26,
                    marginBottom: 10,
                  }}
                >
                  ↑
                </div>
                <div style={{ fontSize: 18, fontWeight: 500 }}>strafzettel-2041.pdf</div>
                <div style={{ fontSize: 14, opacity: 0.45, marginTop: 4 }}>
                  2,4 MB · soeben hochgeladen
                </div>
              </div>

              {/* 4 steps with staggered checkmarks */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {STEPS.map(([label, time, enterAt], i) => {
                  const checkSpring = spring({
                    frame: frame - (enterAt as number),
                    fps,
                    config: { damping: 14, stiffness: 200 },
                  });
                  const done = checkSpring > 0.4;
                  return (
                    <div
                      key={label as string}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "14px 16px",
                        borderRadius: 12,
                        background: done
                          ? "rgba(16,185,129,0.10)"
                          : "rgba(255,255,255,0.04)",
                        border: `1px solid ${
                          done ? "rgba(16,185,129,0.35)" : "rgba(255,255,255,0.08)"
                        }`,
                        transition: "background 0.3s",
                      }}
                    >
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 99,
                          background: done ? COLORS.emerald : "rgba(255,255,255,0.10)",
                          color: "#000",
                          fontSize: 14,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transform: `scale(${done ? checkSpring : 1})`,
                        }}
                      >
                        {done ? "✓" : i + 1}
                      </div>
                      <div style={{ flex: 1, fontSize: 16, opacity: done ? 1 : 0.65 }}>
                        {label}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontFamily: "ui-monospace, monospace",
                          color: done ? COLORS.tealLight : "rgba(255,255,255,0.4)",
                        }}
                      >
                        {time}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </BrowserMock>
        </div>

        {/* Right: counter "30 → 0,5 Sek" */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            fontFamily: FONT_DISPLAY,
            transform: `scale(${finalScale})`,
            transformOrigin: "left center",
          }}
        >
          <div
            style={{
              fontSize: 24,
              color: COLORS.stone400,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              marginBottom: 10,
            }}
          >
            Verarbeitungszeit
          </div>
          <div
            style={{
              fontSize: 240,
              fontWeight: 500,
              letterSpacing: "-0.05em",
              lineHeight: 1,
              color: "transparent",
              background: `linear-gradient(135deg, ${COLORS.tealLight}, ${COLORS.emerald})`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {counterSec.toFixed(1).replace(".", ",")}
          </div>
          <div
            style={{
              fontSize: 36,
              color: COLORS.white,
              opacity: 0.8,
              marginTop: -10,
            }}
          >
            Sekunden
          </div>
        </div>
      </div>

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.85) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
