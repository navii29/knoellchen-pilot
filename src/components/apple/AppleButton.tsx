import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "azure" | "ghost" | "ghost-dark" | "soft";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-pill font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azure/30 whitespace-nowrap";

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[14px]",
  md: "h-11 px-5 text-[15px]",
  lg: "h-[52px] px-7 text-[17px]",
};

const variants: Record<Variant, string> = {
  // Primary — the one place the vivid blue fills.
  azure: "bg-azure text-white hover:bg-azure-link shadow-azure",
  // Quiet link-style action on light.
  ghost: "text-azure-link hover:opacity-70",
  // Quiet action on the black void.
  "ghost-dark": "text-white/90 hover:text-white",
  // Tertiary soft pill on light.
  soft: "bg-frost text-graphite hover:bg-silver/60",
};

type Common = { variant?: Variant; size?: Size; className?: string; children: ReactNode };

export function AppleButton({
  variant = "azure",
  size = "md",
  className = "",
  children,
  ...rest
}: Common & ComponentProps<"button">) {
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function AppleLink({
  variant = "azure",
  size = "md",
  className = "",
  children,
  ...rest
}: Common & ComponentProps<typeof Link>) {
  return (
    <Link className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </Link>
  );
}
