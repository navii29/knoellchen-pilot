"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // An Sentry melden (No-Op ohne DSN) + lokal loggen.
    Sentry.captureException(error);
    console.error(error);
  }, [error]);

  return (
    <div className="apple min-h-screen flex items-center justify-center bg-mist px-5">
      <div className="text-center max-w-[440px]">
        <p className="text-[13px] font-medium text-azure-link mb-3">Etwas ist schiefgelaufen</p>
        <h1 className="apple-display text-[30px] sm:text-[38px] text-graphite leading-[1.1]">
          Da ist ein Fehler aufgetreten.
        </h1>
        <p className="mt-4 text-[16px] leading-[1.5] text-graphite-soft">
          Bitte versuchen Sie es erneut. Wenn das Problem bestehen bleibt,
          melden Sie sich bei uns.
        </p>
        <div className="mt-8">
          <button
            onClick={reset}
            className="inline-flex items-center h-11 px-6 rounded-pill bg-azure text-white text-[15px] font-medium hover:opacity-90 transition-opacity"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    </div>
  );
}
