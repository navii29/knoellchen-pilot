import { AbsoluteFill, useCurrentFrame } from "remotion";

// Subtle film grain layered on top of everything for cinematic feel
export const GlobalGrain = () => {
  const frame = useCurrentFrame();
  const seed = frame * 0.137;
  const noise = `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320">
      <filter id="n">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${seed.toFixed(3)}" />
        <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .35 0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#n)" />
    </svg>
  `)}`;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        opacity: 0.05,
        mixBlendMode: "overlay",
        backgroundImage: `url("${noise}")`,
        backgroundSize: "320px 320px",
      }}
    />
  );
};
