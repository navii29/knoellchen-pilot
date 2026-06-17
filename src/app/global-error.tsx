"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Fängt Fehler, die sogar das Root-Layout betreffen. Ersetzt das gesamte
 * Dokument, daher eigenes <html>/<body>. Meldet an Sentry (No-Op ohne DSN).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="de">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", margin: 0, background: "#f5f5f7", color: "#1d1d1f" }}>
        <div style={{ textAlign: "center", maxWidth: 440, padding: "0 24px" }}>
          <h1 style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.1 }}>Da ist ein Fehler aufgetreten.</h1>
          <p style={{ fontSize: 16, color: "#424245", marginTop: 12 }}>
            Bitte laden Sie die Seite neu. Wenn das Problem bestehen bleibt, melden Sie sich bei uns.
          </p>
          <button
            onClick={reset}
            style={{ marginTop: 28, height: 44, padding: "0 24px", borderRadius: 9999, background: "#0071e3", color: "#fff", border: "none", fontSize: 15, fontWeight: 500, cursor: "pointer" }}
          >
            Erneut versuchen
          </button>
        </div>
      </body>
    </html>
  );
}
