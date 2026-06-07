/**
 * Brand lockup — a plate-style "KP" badge + compact display wordmark.
 * `tone="dark"` for use on the dark void chrome / landing.
 */
export const Logo = ({
  size = 30,
  tone = "light",
  wordmark = true,
}: {
  size?: number;
  tone?: "light" | "dark";
  wordmark?: boolean;
}) => {
  const onDark = tone === "dark";
  return (
    <div className="flex items-center gap-2.5 select-none">
      <span
        className="inline-flex items-center justify-center font-display font-extrabold leading-none"
        style={{
          width: size,
          height: Math.round(size * 0.74),
          fontSize: Math.round(size * 0.42),
          background: "#fff",
          color: "#14110f",
          border: "1.5px solid #14110f",
          borderRadius: 5,
          letterSpacing: "0.02em",
          boxShadow: "inset 0 0 0 1.5px #fff, inset 0 0 0 2.5px rgba(0,0,0,0.06)",
        }}
        aria-hidden
      >
        <span style={{ color: "var(--plate-eu)" }}>K</span>P
      </span>
      {wordmark && (
        <span
          className="font-display font-bold tracking-tightest text-[15px] leading-none"
          style={{ color: onDark ? "var(--on-dark)" : "var(--ink)" }}
        >
          Knöllchen<span style={{ color: "var(--ink-muted)" }}>·</span>Pilot
        </span>
      )}
    </div>
  );
};
