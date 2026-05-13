import { COLORS } from "../lib/constants";

export const Logo = ({ size = 80 }: { size?: number }) => {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.18,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.24,
          background: `linear-gradient(135deg, ${COLORS.tealLight}, ${COLORS.emerald})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 ${size * 0.2}px ${size * 0.5}px -${size * 0.15}px ${COLORS.teal}aa`,
        }}
      >
        <span
          style={{
            color: "#000",
            fontWeight: 700,
            fontSize: size * 0.5,
            letterSpacing: "-0.02em",
          }}
        >
          K
        </span>
      </div>
      <span
        style={{
          fontSize: size * 0.55,
          fontWeight: 500,
          letterSpacing: "-0.025em",
          color: COLORS.white,
        }}
      >
        Knöllchen-Pilot
      </span>
    </div>
  );
};
