import type { ReactNode } from "react";

export const BrowserFrame = ({
  url = "knoellchen-pilot.de/dashboard",
  children,
  variant = "light",
  className = "",
}: {
  url?: string;
  children: ReactNode;
  variant?: "light" | "dark";
  className?: string;
}) => {
  const dark = variant === "dark";
  return (
    <div
      className={`relative rounded-[14px] overflow-hidden shadow-2xl ${
        dark
          ? "bg-zinc-900 ring-1 ring-white/10"
          : "bg-white ring-1 ring-black/10"
      } ${className}`}
    >
      <div
        className={`flex items-center gap-2 px-4 h-9 border-b ${
          dark ? "border-white/10 bg-zinc-950/60" : "border-black/[0.06] bg-stone-50"
        }`}
      >
        <div className="flex gap-[6px]">
          <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
          <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
          <span className="w-3 h-3 rounded-full bg-[#28C840]" />
        </div>
        <div
          className={`mx-auto px-3 h-5 rounded-md flex items-center gap-1.5 text-[10.5px] font-mono ${
            dark
              ? "bg-white/[0.06] text-white/50"
              : "bg-black/[0.04] text-black/50"
          }`}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          {url}
        </div>
        <span className="w-8" />
      </div>
      <div className={dark ? "bg-zinc-900" : "bg-white"}>{children}</div>
    </div>
  );
};
