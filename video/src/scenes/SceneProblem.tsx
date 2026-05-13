import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT_DISPLAY } from "../lib/constants";
import { ParticleField } from "../components/ParticleField";

// "30 Minuten pro Strafzettel." with a stack of falling tickets
export const SceneProblem = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const numSpring = spring({ frame: frame - 10, fps, config: { damping: 16, stiffness: 110 } });
  const numScale = interpolate(numSpring, [0, 1], [0.6, 1]);
  const numOp = interpolate(numSpring, [0, 1], [0, 1]);

  // Counter "ticks up" 0 → 30
  const counter = Math.round(interpolate(frame, [10, 50], [0, 30], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  }));

  const captionSpring = spring({ frame: frame - 26, fps, config: { damping: 18, stiffness: 110 } });
  const captionY = interpolate(captionSpring, [0, 1], [30, 0]);
  const captionOp = interpolate(captionSpring, [0, 1], [0, 1]);

  // Falling tickets stack
  const tickets = Array.from({ length: 8 }).map((_, i) => {
    const enterAt = 4 + i * 3;
    const t = spring({ frame: frame - enterAt, fps, config: { damping: 14, stiffness: 70 } });
    const dropY = interpolate(t, [0, 1], [-400, 0]);
    const rot = (i % 2 === 0 ? -1 : 1) * (4 + i * 0.8);
    const opacity = interpolate(t, [0, 1], [0, 1]);
    return { i, dropY, rot, opacity, enterAt };
  });

  return (
    <AbsoluteFill style={{ background: "#0a0a0a" }}>
      <ParticleField count={40} color="rgba(239,68,68,0.45)" />

      {/* Big red number */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT_DISPLAY,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 24,
            transform: `scale(${numScale})`,
            opacity: numOp,
          }}
        >
          <div
            style={{
              fontSize: 380,
              fontWeight: 500,
              letterSpacing: "-0.05em",
              lineHeight: 1,
              color: "transparent",
              background: `linear-gradient(180deg, ${COLORS.red}, #fb7185)`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {counter.toString().padStart(2, "0")}
          </div>
          <div
            style={{
              fontSize: 110,
              fontWeight: 400,
              color: COLORS.stone400,
              letterSpacing: "-0.025em",
            }}
          >
            Minuten
          </div>
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 36,
            color: COLORS.stone500,
            opacity: captionOp,
            transform: `translateY(${captionY}px)`,
            letterSpacing: "-0.01em",
          }}
        >
          pro Strafzettel. Manuell. Jede Woche.
        </div>
      </div>

      {/* Falling ticket stack on the right edge */}
      <div
        style={{
          position: "absolute",
          right: 80,
          bottom: 80,
          width: 320,
          height: 460,
        }}
      >
        {tickets.map(({ i, dropY, rot, opacity }) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: i * 6,
              top: 380 - i * 22 + dropY,
              width: 320,
              height: 90,
              borderRadius: 8,
              background: "#fef9c3",
              boxShadow: "0 12px 30px rgba(0,0,0,0.55)",
              transform: `rotate(${rot}deg)`,
              opacity,
              padding: "10px 14px",
              color: "#3f3f46",
              fontSize: 11,
              fontFamily: "ui-monospace, SFMono-Regular, monospace",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4, color: "#7c2d12" }}>
              BUSSGELDBESCHEID
            </div>
            <div style={{ opacity: 0.7 }}>VR-2026-04-{1100 + i * 7}</div>
            <div style={{ opacity: 0.7 }}>M-AB {1234 + i * 11} · € {45 + i * 8},00</div>
            <div
              style={{
                position: "absolute",
                right: 12,
                top: 14,
                width: 28,
                height: 28,
                borderRadius: 99,
                border: "2px solid #b91c1c",
                color: "#b91c1c",
                fontSize: 14,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              !
            </div>
          </div>
        ))}
      </div>

      {/* Vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.9) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
