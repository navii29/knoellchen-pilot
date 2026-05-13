import { AbsoluteFill } from "remotion";

export const RadialGlow = ({
  color = "rgba(45,212,191,0.35)",
  x = "50%",
  y = "50%",
  size = 1400,
  opacity = 1,
}: {
  color?: string;
  x?: string | number;
  y?: string | number;
  size?: number;
  opacity?: number;
}) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(${size}px ${size}px at ${x} ${y}, ${color} 0%, transparent 70%)`,
      opacity,
      pointerEvents: "none",
    }}
  />
);
