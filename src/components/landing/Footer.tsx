import Link from "next/link";

export const Footer = () => {
  return (
    <footer className="bg-black border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-white/40">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
            <span className="text-black font-bold text-[11px]">K</span>
          </div>
          <span className="text-white/70 font-medium">Knöllchen-Pilot</span>
          <span className="ml-2">© 2026</span>
        </div>
        <nav className="flex items-center gap-6">
          <Link href="/impressum" className="hover:text-white/80 transition-colors">
            Impressum
          </Link>
          <Link href="/datenschutz" className="hover:text-white/80 transition-colors">
            Datenschutz
          </Link>
          <Link href="/agb" className="hover:text-white/80 transition-colors">
            AGB
          </Link>
        </nav>
      </div>
    </footer>
  );
};
