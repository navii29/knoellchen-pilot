import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT_DISPLAY } from "../lib/constants";
import { HighwayStreaks } from "../components/HighwayStreaks";
import { RadialGlow } from "../components/RadialGlow";
import { CarSilhouette } from "../components/CarSilhouette";

export const SceneTagline = () => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const tSpring = spring({ frame: frame - 4, fps, config: { damping: 18, stiffness: 90 } });
  const tOp = interpolate(tSpring, [0, 1], [0, 1]);
  const tY = interpolate(tSpring, [0, 1], [60, 0]);

  // Scale + travel: car slides across, slightly slower than streaks
  const carX = interpolate(frame, [0, 120], [-700, width + 200], { extrapolateRight: "clamp" });
  const carScaleSpring = spring({ frame: frame - 0, fps, config: { damping: 22, stiffness: 80 } });
  const carScale = interpolate(carScaleSpring, [0, 1], [0.9, 1.05]);

  const subSpring = spring({ frame: frame - 26, fps, config: { damping: 18, stiffness: 110 } });
  const subOp = interpolate(subSpring, [0, 1], [0, 1]);
  const subY = interpolate(subSpring, [0, 1], [25, 0]);

  return (
    <AbsoluteFill style={{ background: COLORS.black, overflow: "hidden" }}>
      <RadialGlow color="rgba(45,212,191,0.32)" y="60%" size={1700} />
      <HighwayStreaks density={120} speed={32} hue={COLORS.tealLight} opacity={0.85} />

      {/* Driving car silhouette across full width */}
      <div
        style={{
          position: "absolute",
          left: carX,
          bottom: "12%",
          opacity: 0.28,
          filter: "blur(1px)",
          transform: `scale(${carScale})`,
        }}
      >
        <CarSilhouette width={1100} color={COLORS.white} />
      </div>

      {/* Center tagline */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT_DISPLAY,
          textAlign: "center",
          padding: "0 120px",
        }}
      >
        <div
          style={{
            fontSize: 130,
            fontWeight: 500,
            letterSpacing: "-0.045em",
            lineHeight: 1,
            color: COLORS.white,
            opacity: tOp,
            transform: `translateY(${tY}px)`,
          }}
        >
          Die KI-Plattform
        </div>
        <div
          style={{
            fontSize: 130,
            fontWeight: 500,
            letterSpacing: "-0.045em",
            lineHeight: 1,
            marginTop: 6,
            opacity: tOp,
            transform: `translateY(${tY}px)`,
            color: "transparent",
            background: `linear-gradient(135deg, ${COLORS.tealLight}, ${COLORS.emerald})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
          }}
        >
          für Autovermietungen.
        </div>
        <div
          style={{
            marginTop: 36,
            fontSize: 32,
            color: COLORS.stone400,
            letterSpacing: "-0.005em",
            opacity: subOp,
            transform: `translateY(${subY}px)`,
          }}
        >
          Verträge · Flotte · Kunden · Strafzettel · KI-Assistent
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
