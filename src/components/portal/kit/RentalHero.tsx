import Link from "next/link";
import { Plate } from "@/components/ui/Plate";
import { StatusBadge } from "./StatusBadge";

type Cta = { label: string; href: string };

// Hero-Karte der aktuellen Miete: Gradient-Kopf (Marke) + Plate/Fahrzeug/Status,
// darunter eine Aktionsleiste.
export const RentalHero = ({
  plate,
  vehicleType,
  status,
  dateLine,
  primary,
  secondary,
}: {
  plate: string;
  vehicleType: string | null;
  status: string;
  dateLine: string;
  primary?: Cta;
  secondary?: Cta;
}) => (
  <div className="rounded-card overflow-hidden glass-card shadow-raised">
    <div
      className="relative px-4 pt-4 pb-5 text-white"
      style={{ background: "linear-gradient(125deg,#0d9488 0%,#0071e3 100%)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <Plate value={plate} size="sm" />
        <StatusBadge status={status} />
      </div>
      <div className="mt-3 text-[18px] font-semibold tracking-tight leading-tight">
        {vehicleType || "Fahrzeug"}
      </div>
      <div className="text-[12px] text-white/80 font-mono tnum mt-0.5">{dateLine}</div>
    </div>
    {(primary || secondary) && (
      <div className="flex gap-2 px-4 py-3">
        {primary && (
          <Link
            href={primary.href}
            className="flex-1 text-center text-[13px] font-semibold text-white bg-signal rounded-btn py-2.5 shadow-azure active:scale-[.99] transition"
          >
            {primary.label}
          </Link>
        )}
        {secondary && (
          <Link
            href={secondary.href}
            className="flex-1 text-center text-[13px] font-semibold text-ink bg-paper border border-hairline rounded-btn py-2.5 active:scale-[.99] transition"
          >
            {secondary.label}
          </Link>
        )}
      </div>
    )}
  </div>
);
