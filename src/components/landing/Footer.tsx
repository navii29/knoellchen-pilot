import Link from "next/link";

const Col = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <div className="text-[12px] uppercase tracking-wider text-zinc-500 font-medium mb-3">{title}</div>
    <div className="space-y-2">{children}</div>
  </div>
);

export const Footer = () => {
  return (
    <footer className="bg-zinc-950 border-t border-white/10 text-zinc-400">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-10">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-[7px] bg-white flex items-center justify-center text-zinc-950 text-[13px] font-semibold leading-none">
                K
              </div>
              <span className="font-semibold text-[15px] text-white tracking-[-0.02em]">
                Knöllchen-Pilot
              </span>
            </div>
            <p className="mt-4 text-[13.5px] leading-relaxed text-zinc-500">
              Die Betriebssoftware für moderne Autovermietungen. Eine Marke der
              Southern Phoenix GmbH.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-14 text-[13.5px]">
            <Col title="Produkt">
              <a href="#features" className="block hover:text-white transition-colors">Funktionen</a>
              <a href="#pricing" className="block hover:text-white transition-colors">Preise</a>
              <a href="#faq" className="block hover:text-white transition-colors">FAQ</a>
            </Col>
            <Col title="Konto">
              <Link href="/login" className="block hover:text-white transition-colors">Anmelden</Link>
              <Link href="/register" className="block hover:text-white transition-colors">Kostenlos testen</Link>
            </Col>
            <Col title="Rechtliches">
              <Link href="/impressum" className="block hover:text-white transition-colors">Impressum</Link>
              <Link href="/datenschutz" className="block hover:text-white transition-colors">Datenschutz</Link>
              <Link href="/agb" className="block hover:text-white transition-colors">AGB</Link>
            </Col>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12.5px] text-zinc-500">
          <span>© 2026 Southern Phoenix GmbH</span>
          <a href="mailto:kontakt@knoellchen-pilot.de" className="hover:text-white transition-colors">
            kontakt@knoellchen-pilot.de
          </a>
        </div>
      </div>
    </footer>
  );
};
