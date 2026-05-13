import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../lib/constants";

// Light streaks flying past — gives the feel of fast highway driving
export const HighwayStreaks = ({
  density = 80,
  speed = 14,
  hue = COLORS.tealLight,
  opacity = 1,
}: {
  density?: number;
  speed?: number;
  hue?: string;
  opacity?: number;
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const streaks = Array.from({ length: density }).map((_, i) => {
    const seed1 = (Math.sin(i * 12.91) + 1) / 2;
    const seed2 = (Math.sin(i * 7.31 + 1) + 1) / 2;
    const seed3 = (Math.sin(i * 31.42 + 2) + 1) / 2;

    const lane = seed1; // 0..1 vertical position
    const length = 80 + seed2 * 380;
    const thickness = 1 + seed3 * 2.5;
    const lifetime = 70 + seed2 * 120;
    const offset = i * 3.7;
    const t = ((frame * speed + offset) % (width + length + 200)) - length;

    const y = lane * height;
    const alpha = 0.18 + seed3 * 0.55;

    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: t,
          top: y,
          width: length,
          height: thickness,
          background: `linear-gradient(90deg, transparent 0%, ${hue} 50%, transparent 100%)`,
          opacity: alpha * opacity,
          filter: "blur(0.4px)",
          transform: `translateY(-${thickness / 2}px)`,
          willChange: "transform",
        }}
      />
    );
  });

  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
      }}
    >
      {streaks}
    </AbsoluteFill>
  );
};
