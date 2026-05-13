import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT_DISPLAY } from "../lib/constants";
import { HighwayStreaks } from "../components/HighwayStreaks";
import { ParticleField } from "../components/ParticleField";
import { RadialGlow } from "../components/RadialGlow";
import { CarSilhouette } from "../components/CarSilhouette";

export const SceneHook = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame: frame - 8, fps, config: { damping: 18, stiffness: 90 } });
  const titleY = interpolate(titleSpring, [0, 1], [60, 0]);
  const titleOp = interpolate(titleSpring, [0, 1], [0, 1]);

  const carEntry = spring({ frame: frame - 0, fps, config: { damping: 22, stiffness: 70 } });
  const carX = interpolate(carEntry, [0, 1], [-300, 0]);
  const carOp = interpolate(carEntry, [0, 1], [0, 1]);

  const sweep = interpolate(frame, [0, 60], [-200, 1920], { extrapolateRight: "clamp" });

  // Words appearing one after another
  const words = ["Verträge.", "Flotte.", "Kunden.", "Strafzettel."];
  const wordDelays = [10, 18, 26, 34];

  return (
    <AbsoluteFill style={{ background: COLORS.black }}>
      {/* Layered background */}
      <RadialGlow color="rgba(45,212,191,0.30)" y="65%" size={1500} />
      <HighwayStreaks density={70} speed={26} hue={COLORS.tealLight} opacity={0.85} />
      <ParticleField count={50} color={COLORS.tealLight} />

      {/* Sweep light */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: sweep,
          width: 380,
          height: "100%",
          background:
            "linear-gradient(90deg, transparent 0%, rgba(45,212,191,0.15) 50%, transparent 100%)",
          transform: "skewX(-12deg)",
          mixBlendMode: "screen",
        }}
      />

      {/* Car drives in subtly in the background */}
      <div
        style={{
          position: "absolute",
          left: carX,
          bottom: "8%",
          opacity: carOp * 0.18,
          filter: "blur(2px)",
        }}
      >
        <CarSilhouette width={1600} color={COLORS.white} />
      </div>

      {/* Centered words stack */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          fontFamily: FONT_DISPLAY,
          transform: `translateY(${titleY}px)`,
          opacity: titleOp,
        }}
      >
        {words.map((w, i) => {
          const wf = wordDelays[i];
          const t = spring({
            frame: frame - wf,
            fps,
            config: { damping: 16, stiffness: 110 },
          });
          const op = interpolate(t, [0, 1], [0, 1]);
          const y = interpolate(t, [0, 1], [40, 0]);
          const isLast = i === words.length - 1;
          return (
            <div
              key={w}
              style={{
                fontSize: 132,
                fontWeight: 500,
                letterSpacing: "-0.045em",
                lineHeight: 1.02,
                opacity: op,
                transform: `translateY(${y}px)`,
                color: isLast ? "transparent" : COLORS.white,
                background: isLast
                  ? `linear-gradient(135deg, ${COLORS.tealLight}, ${COLORS.emerald})`
                  : "none",
                WebkitBackgroundClip: isLast ? "text" : undefined,
                backgroundClip: isLast ? "text" : undefined,
              }}
            >
              {w}
            </div>
          );
        })}
      </div>

      {/* Vignette for cinematic depth */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.85) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
