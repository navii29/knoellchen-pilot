import { NextResponse } from "next/server";

/**
 * Fail-closed Auth-Gate für Cron-Routes.
 *
 * SICHERHEIT: Die alten Routes haben den Auth-Check in `if (secret) {...}`
 * gewrappt — war `CRON_SECRET` nicht gesetzt (Fehlkonfiguration / Staging),
 * lief die Route OHNE Auth und damit öffentlich. Das ist hier behoben:
 *
 *   - Ohne `CRON_SECRET` in der Env → 503 (Route bleibt geschlossen, nie offen).
 *   - Mit Secret → erlaubt entweder `Authorization: Bearer <secret>` ODER den
 *     von Vercel gesetzten `x-vercel-cron`-Header. Sonst 401.
 *
 * Rückgabe: eine `NextResponse` (= abgelehnt, an den Aufrufer zurückgeben) oder
 * `null` (= erlaubt, weitermachen).
 *
 * Verwendung am Anfang jedes Cron-GET-Handlers:
 *   const denied = requireCron(req);
 *   if (denied) return denied;
 */
export const requireCron = (req: Request): NextResponse | null => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Cron misconfigured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  const isVercelCron = req.headers.get("x-vercel-cron") !== null;
  if (auth !== `Bearer ${secret}` && !isVercelCron) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
};
