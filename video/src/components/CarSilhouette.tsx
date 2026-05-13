// Simple SVG side-view sport car silhouette — used as a hero motif
export const CarSilhouette = ({
  color = "#ffffff",
  width = 600,
  opacity = 1,
}: {
  color?: string;
  width?: number;
  opacity?: number;
}) => (
  <svg
    viewBox="0 0 600 200"
    width={width}
    height={(width / 600) * 200}
    style={{ opacity, display: "block" }}
  >
    <defs>
      <linearGradient id="carBody" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="1" />
        <stop offset="100%" stopColor={color} stopOpacity="0.85" />
      </linearGradient>
      <linearGradient id="window" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#000" stopOpacity="0.85" />
        <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
      </linearGradient>
    </defs>
    {/* Body */}
    <path
      d="M40 140 C 60 110 100 95 160 92 L 220 78 C 260 55 310 50 360 56 C 410 62 450 80 490 95 L 550 110 C 575 115 580 130 575 150 L 560 165 C 555 168 545 168 540 162 C 530 175 480 178 470 162 C 460 175 200 175 190 162 C 180 178 130 178 120 162 C 110 175 70 172 60 158 L 45 152 C 38 150 36 145 40 140 Z"
      fill="url(#carBody)"
    />
    {/* Window */}
    <path
      d="M180 95 L 230 70 C 260 55 310 50 360 56 C 400 60 430 72 458 86 L 470 92 L 460 95 L 200 96 Z"
      fill="url(#window)"
      opacity="0.85"
    />
    {/* Door line */}
    <path
      d="M270 95 L 270 145"
      stroke="#000"
      strokeWidth="1"
      opacity="0.25"
    />
    {/* Front wheel */}
    <circle cx="135" cy="160" r="22" fill="#0a0a0a" />
    <circle cx="135" cy="160" r="14" fill="#222" />
    <circle cx="135" cy="160" r="5" fill={color} opacity="0.6" />
    {/* Rear wheel */}
    <circle cx="495" cy="160" r="22" fill="#0a0a0a" />
    <circle cx="495" cy="160" r="14" fill="#222" />
    <circle cx="495" cy="160" r="5" fill={color} opacity="0.6" />
    {/* Headlight glow */}
    <circle cx="555" cy="125" r="8" fill="#fef3c7" opacity="0.9" />
    <circle cx="555" cy="125" r="14" fill="#fef3c7" opacity="0.3" />
  </svg>
);
