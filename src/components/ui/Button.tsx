import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "signal" | "ink" | "ghost" | "outline-dark";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-btn font-medium tracking-tight transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/40 focus-visible:ring-offset-1 whitespace-nowrap";

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-[14px]",
  lg: "h-12 px-6 text-[15px]",
};

const variants: Record<Variant, string> = {
  // Primary brand action — signal orange. The one place the accent fills.
  signal: "bg-signal text-white hover:bg-signal-strong shadow-signal",
  // Strong neutral action on light surfaces.
  ink: "bg-ink text-white hover:bg-ink-soft",
  // Quiet action on light surfaces.
  ghost: "text-ink-soft hover:bg-ink/5 border border-transparent",
  // Secondary action on the dark void chrome.
  "outline-dark":
    "text-on-dark border border-hairline-dark bg-white/[0.04] hover:bg-white/[0.09]",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
};

export function Button({
  variant = "signal",
  size = "md",
  className = "",
  children,
  ...rest
}: CommonProps & ComponentProps<"button">) {
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "signal",
  size = "md",
  className = "",
  children,
  ...rest
}: CommonProps & ComponentProps<typeof Link>) {
  return (
    <Link className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </Link>
  );
}
