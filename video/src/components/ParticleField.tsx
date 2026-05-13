import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../lib/constants";

export const ParticleField = ({
  count = 60,
  color = COLORS.tealLight,
}: {
  count?: number;
  color?: string;
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const dots = Array.from({ length: count }).map((_, i) => {
    const a = Math.sin(i * 1.231) * 1000;
    const b = Math.cos(i * 2.871) * 1000;
    const x = (((a + frame * 0.4) % width) + width) % width;
    const y = (((b + frame * 0.2) % height) + height) % height;
    const size = 1.5 + ((Math.sin(i * 5.13) + 1) / 2) * 3.5;
    const op = 0.12 + ((Math.sin(i * 0.9 + frame * 0.04) + 1) / 2) * 0.4;
    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: 99,
          background: color,
          opacity: op,
          boxShadow: `0 0 ${size * 4}px ${color}`,
        }}
      />
    );
  });
  return <AbsoluteFill style={{ overflow: "hidden" }}>{dots}</AbsoluteFill>;
};
