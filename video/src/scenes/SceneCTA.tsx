import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT_DISPLAY } from "../lib/constants";
import { Logo } from "../components/Logo";
import { RadialGlow } from "../components/RadialGlow";
import { ParticleField } from "../components/ParticleField";

export const SceneCTA = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSpring = spring({ frame: frame - 0, fps, config: { damping: 16, stiffness: 110 } });
  const logoScale = interpolate(logoSpring, [0, 1], [0.7, 1]);
  const logoOp = interpolate(logoSpring, [0, 1], [0, 1]);

  const urlSpring = spring({ frame: frame - 18, fps, config: { damping: 18, stiffness: 110 } });
  const urlOp = interpolate(urlSpring, [0, 1], [0, 1]);
  const urlY = interpolate(urlSpring, [0, 1], [22, 0]);

  const ctaSpring = spring({ frame: frame - 34, fps, config: { damping: 16, stiffness: 110 } });
  const ctaOp = interpolate(ctaSpring, [0, 1], [0, 1]);
  const ctaScale = interpolate(ctaSpring, [0, 1], [0.85, 1]);

  // Outer ring pulse
  const ring = interpolate(frame, [0, 90], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: COLORS.black }}>
      <RadialGlow color="rgba(45,212,191,0.4)" size={1400} />
      <ParticleField count={50} color={COLORS.tealLight} />

      {/* Pulsating ring behind logo */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 600,
          height: 600,
          marginLeft: -300,
          marginTop: -300,
          borderRadius: 999,
          border: `1px solid ${COLORS.tealLight}`,
          opacity: 0.2 * (1 - ring) + 0.05,
          transform: `scale(${0.6 + ring * 0.6})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 600,
          height: 600,
          marginLeft: -300,
          marginTop: -300,
          borderRadius: 999,
          border: `1px solid ${COLORS.tealLight}`,
          opacity: 0.15 * (1 - Math.max(0, ring - 0.3) / 0.7) + 0.04,
          transform: `scale(${0.4 + ring * 0.9})`,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 36,
          fontFamily: FONT_DISPLAY,
        }}
      >
        <div style={{ transform: `scale(${logoScale})`, opacity: logoOp }}>
          <Logo size={130} />
        </div>

        <div
          style={{
            fontSize: 60,
            fontWeight: 500,
            letterSpacing: "-0.04em",
            color: "transparent",
            background: `linear-gradient(135deg, ${COLORS.tealLight}, ${COLORS.emerald})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            opacity: urlOp,
            transform: `translateY(${urlY}px)`,
          }}
        >
          knoellchen-pilot.de
        </div>

        <div
          style={{
            display: "flex",
            gap: 18,
            opacity: ctaOp,
            transform: `scale(${ctaScale})`,
            marginTop: 12,
          }}
        >
          <div
            style={{
              padding: "16px 36px",
              borderRadius: 999,
              background: COLORS.white,
              color: "#000",
              fontWeight: 500,
              fontSize: 22,
              boxShadow: "0 12px 40px -8px rgba(255,255,255,0.4)",
            }}
          >
            30 Tage kostenlos testen
          </div>
        </div>

        <div
          style={{
            fontSize: 18,
            color: "rgba(255,255,255,0.4)",
            opacity: ctaOp,
            marginTop: 8,
            display: "flex",
            gap: 28,
          }}
        >
          <span>● DSGVO-konform</span>
          <span>● EU-Hosting</span>
          <span>● Keine Kreditkarte</span>
        </div>
      </div>

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.7) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
