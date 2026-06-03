export const Logo = ({ size = 30 }: { size?: number }) => (
  <div className="flex items-center gap-2.5">
    <div
      className="rounded-[7px] bg-zinc-950 flex items-center justify-center text-white font-semibold leading-none"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}
    >
      K
    </div>
    <span className="font-semibold text-[16px] tracking-[-0.02em] text-zinc-950">
      Knöllchen-Pilot
    </span>
  </div>
);
