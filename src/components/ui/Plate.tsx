/**
 * License plate (Kennzeichen) — the signature brand object.
 * EU-blue strip (stars + "D") + monospace black-on-white characters.
 * Used for the logo badge, hero centerpiece, and every vehicle/ID reference.
 *
 * Role rule: the EU blue (#003399) lives here only — never as a UI accent.
 */
export const Plate = ({
  value = "KP-AI 2041",
  size = "md",
  className = "",
}: {
  value?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) => {
  const fontSize = {
    sm: "12px",
    md: "16px",
    lg: "24px",
    xl: "40px",
  }[size];

  return (
    <span
      className={`plate ${className}`}
      style={{ fontSize }}
      aria-label={`Kennzeichen ${value}`}
    >
      <span className="plate__eu" aria-hidden>
        <span className="plate__eu-stars">★</span>
        <span className="plate__eu-d">D</span>
      </span>
      <span className="plate__num">{value}</span>
    </span>
  );
};
