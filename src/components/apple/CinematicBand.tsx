import { Reveal } from "./Reveal";

/**
 * Full-bleed cinematic brand moment — a real generated automotive render with
 * a short emotional line. The "feel" beat between the functional sections.
 */
export const CinematicBand = () => {
  return (
    <section className="relative bg-black overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/car-cinematic.webp"
        alt="Modernes Mietfahrzeug in stimmungsvollem Licht"
        className="absolute inset-0 w-full h-full object-cover opacity-90"
      />
      {/* legibility + vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/30" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />

      <div className="relative max-w-[1120px] mx-auto px-5 py-32 sm:py-44 lg:py-56">
        <Reveal as="div" className="max-w-[640px]">
          <p className="text-[14px] font-medium text-azure-sky mb-4">Gebaut für den Betrieb</p>
          <h2 className="apple-display text-[34px] sm:text-[52px] lg:text-[60px] text-white leading-[1.04] max-w-[12ch]">
            Lieber vermieten als verwalten.
          </h2>
          <p className="mt-5 text-[18px] sm:text-[20px] leading-[1.45] text-white/70 max-w-[42ch]">
            Während Sie Schlüssel übergeben, kümmert sich Knöllchen-Pilot um Bescheide,
            Fristen und Rechnungen. Leise im Hintergrund. Zuverlässig.
          </p>
        </Reveal>
      </div>
    </section>
  );
};
