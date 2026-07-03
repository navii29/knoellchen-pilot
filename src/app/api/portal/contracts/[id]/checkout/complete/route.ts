import { NextResponse } from "next/server";
import { loadPortalContract } from "@/lib/portal-contract-guard";
import { isFuelLevel } from "@/lib/fuel";

export const maxDuration = 60;

type Ctx = { params: { id: string } };

export const POST = async (req: Request, { params }: Ctx) => {
  const ctx = await loadPortalContract(params.id);
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Status-Guard: stornierte Verträge nicht abschließen; bereits abgeschlossene
  // (z. B. durch den Vermieter per Rückgabeprotokoll) NICHT überschreiben —
  // idempotent beantworten statt Operator-Daten per Replay zu ersetzen.
  if (ctx.contract.status === "storniert")
    return NextResponse.json({ error: "Vertrag ist storniert." }, { status: 409 });
  if (ctx.contract.status === "abgeschlossen")
    return NextResponse.json({
      ok: true,
      alreadyClosed: true,
      checkout_step: 4,
      km_return: ctx.contract.km_return,
      fuel_level_return: ctx.contract.fuel_level_return,
    });

  const body = (await req.json().catch(() => ({}))) as {
    km_return?: number;
    fuel_level_return?: string;
  };
  const km =
    typeof body.km_return === "number" && Number.isFinite(body.km_return)
      ? Math.round(body.km_return)
      : null;
  const fuel = body.fuel_level_return ?? null;
  if (km == null || km < 0)
    return NextResponse.json({ error: "Kilometerstand fehlt" }, { status: 400 });
  if (!isFuelLevel(fuel))
    return NextResponse.json({ error: "Tankstand fehlt" }, { status: 400 });
  if (ctx.contract.km_pickup != null && km < Number(ctx.contract.km_pickup))
    return NextResponse.json(
      { error: "Rückgabe-km darf nicht kleiner als Übergabe-km sein" },
      { status: 400 }
    );

  // Foto-Minimum SERVERSEITIG durchsetzen (der Client fordert 4 — nur als
  // deaktivierter Button; ein direkter API-Call konnte bisher ohne ein einziges
  // Rückgabe-Foto abschließen).
  const { count: returnPhotos } = await ctx.admin
    .from("handover_photos")
    .select("id", { count: "exact", head: true })
    .eq("contract_id", params.id)
    .eq("org_id", ctx.session.org_id)
    .eq("type", "return");
  if ((returnPhotos ?? 0) < 4)
    return NextResponse.json(
      { error: "Bitte zuerst mindestens 4 Rückgabe-Fotos hochladen." },
      { status: 400 }
    );

  const nowIso = new Date().toISOString().slice(0, 10);

  const { error } = await ctx.admin
    .from("contracts")
    .update({
      actual_return_date: nowIso,
      km_return: km,
      fuel_level_return: fuel,
      status: "abgeschlossen",
      checkout_step: 4,
    })
    .eq("id", params.id)
    .eq("org_id", ctx.session.org_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // KI-Schadenvergleich asynchron anstoßen — fire-and-forget,
  // wir warten nicht auf die Antwort. Bei Vercel reicht das,
  // da der Edge-Worker die Connection bis zur API-Antwort offen hält.
  // Falls die Compare-Route lange dauert, läuft sie weiter ohne den
  // Kunden zu blockieren.
  //
  // WICHTIG: Dieser Trigger ist nur "best effort" und env-gated
  // (INTERNAL_API_SECRET). Die Compare-Route persistiert das Ergebnis zwar
  // mittlerweile am Vertrag, aber die ZUVERLÄSSIGE Sichtbarkeit kommt vom
  // Auto-Run im Dashboard (HandoverClient): beim Öffnen der Übergabe-Seite
  // wird der Vergleich genau einmal nachgeholt, falls noch keiner
  // persistiert ist. Der Checkout darf hier NICHT auf den Vergleich warten.
  const compareUrl = `${
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  }/api/contracts/${params.id}/compare-photos`;
  // System-Token-Header für interne Triggerung
  if (process.env.INTERNAL_API_SECRET) {
    fetch(compareUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.INTERNAL_API_SECRET,
      },
      body: JSON.stringify({ contract_id: params.id, org_id: ctx.session.org_id }),
    }).catch(() => {
      // best-effort — Admin kann den Vergleich später manuell starten
    });
  }

  return NextResponse.json({
    ok: true,
    checkout_step: 4,
    km_return: km,
    fuel_level_return: fuel,
  });
};
