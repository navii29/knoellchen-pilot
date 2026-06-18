import Link from "next/link";

export default function NotFound() {
  return (
    <div className="apple min-h-screen flex items-center justify-center bg-mist px-5">
      <div className="text-center max-w-[440px]">
        <p className="text-[13px] font-medium text-azure-link mb-3">Fehler 404</p>
        <h1 className="apple-display text-[32px] sm:text-[40px] text-graphite leading-[1.1]">
          Diese Seite gibt es nicht.
        </h1>
        <p className="mt-4 text-[16px] leading-[1.5] text-graphite-soft">
          Der Link ist vielleicht veraltet oder die Seite wurde verschoben.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center h-11 px-6 rounded-pill bg-azure text-white text-[15px] font-medium hover:opacity-90 transition-opacity"
          >
            Zur Startseite
          </Link>
          <Link
            href="/dashboard"
            className="text-[15px] text-azure-link hover:opacity-70 transition-opacity"
          >
            Zum Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
