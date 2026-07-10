import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { generateHandoverProtocolPdf } from "@/lib/handover-protocol-pdf";
import type { ProtocolPhoto } from "@/lib/handover-protocol-html";
import { POSITIONS } from "@/lib/handover";
import { isFuelLevel } from "@/lib/fuel";
import { computeReturnSummary } from "@/lib/km";
import { resolveEffectiveDailyRate } from "@/lib/daily-rate";
import {
  loadCustomerForContract,
  loadLogoBase64,
  loadVehicleForContract,
} from "@/lib/contract-loaders";
import { customerDisplayName } from "@/lib/customer";
import { emailConfigured, sendDocumentEmail } from "@/lib/email";
import { hasInk, isPngDataUrl } from "@/lib/utils";
import type {
  Contract,
  HandoverPhoto,
  HandoverPhotoType,
  Organization,
} from "@/lib/types";

export const maxDuration = 30;

const requireAuth = async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();
  return profile ? { user, org_id: profile.org_id } : null;
};

type Ctx = { params: { id: string } };

// Foto-MIME aus dem Storage-Pfad ableiten (Default JPEG).
const mimeFromPath = (path: string): string => {
  const p = path.toLowerCase();
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
};

const labelForPosition = (position: string): string =>
  POSITIONS.find((p) => p.key === position)?.label ?? position;

// km robust parsen — leerer/ungültiger Wert ⇒ null (kein Überschreiben).
const parseKm = (v: number | string | undefined): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

export const POST = async (req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { org_id: orgId } = auth;

  const body = (await req.json().catch(() => ({}))) as {
    type?: unknown;
    km?: number | string;
    fuel_level?: string;
    condition_notes?: string;
    signature_lessor?: string;
    signature_renter?: string;
    send_email?: boolean;
    actual_return_date?: string;
    renter_absent?: boolean;
  };

  const type = body.type;
  if (type !== "pickup" && type !== "return") {
    return NextResponse.json(
      { error: "Ungültiger Typ (erwartet: pickup oder return)." },
      { status: 400 }
    );
  }
  const handoverType = type as HandoverPhotoType;

  // "Mieter nicht vor Ort" (nur bei Rückgabe): der Mieter kann nicht
  // unterschreiben → seine Unterschrift entfällt. Vermieter-Unterschrift + km
  // bleiben Pflicht (bewusste Lockerung der 2-Pflicht-Regel).
  const renterAbsent = handoverType === "return" && body.renter_absent === true;
  const sigLessor = body.signature_lessor;
  const sigRenter = renterAbsent ? null : body.signature_renter;

  // Vermieter-Unterschrift immer Pflicht.
  if (!isPngDataUrl(sigLessor) || !hasInk(sigLessor)) {
    return NextResponse.json(
      { error: "Unterschrift Vermieter fehlt oder ungültig." },
      { status: 400 }
    );
  }
  // Mieter-Unterschrift Pflicht, außer der Mieter war nicht vor Ort.
  if (!renterAbsent && (!isPngDataUrl(sigRenter) || !hasInk(sigRenter))) {
    return NextResponse.json(
      { error: "Unterschrift Mieter fehlt oder ungültig (oder „Mieter nicht vor Ort“ markieren)." },
      { status: 400 }
    );
  }

  // Km bei RÜCKGABE Pflicht (Übergabe optional). Früh prüfen — vor dem Laden von
  // Vertrag/Fotos. actual_return_date kommt (ab Schritt 2) aus dem Rücknahme-Tab.
  const km = parseKm(body.km);
  if (handoverType === "return" && km == null) {
    return NextResponse.json({ error: "Km bei Rückgabe erforderlich." }, { status: 400 });
  }
  if (km != null && km < 0) {
    return NextResponse.json({ error: "Km-Stand darf nicht negativ sein." }, { status: 400 });
  }
  const actualReturnDate =
    typeof body.actual_return_date === "string" && body.actual_return_date.trim()
      ? body.actual_return_date.trim()
      : null;

  const admin = createAdminClient();

  // --- Vertrag laden — STRIKT org-scoped (Multi-Tenant-Isolation) ---
  const { data: contractRow } = await admin
    .from("contracts")
    .select("*")
    .eq("id", params.id)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!contractRow)
    return NextResponse.json({ error: "Vertrag nicht gefunden." }, { status: 404 });
  const contract = contractRow as Contract;

  // Stornierte Verträge dürfen per Rückgabe-Protokoll NICHT auf "abgeschlossen"
  // wiederbelebt werden.
  if (handoverType === "return" && contract.status === "storniert") {
    return NextResponse.json(
      { error: "Vertrag ist storniert — Rückgabeprotokoll nicht möglich." },
      { status: 409 }
    );
  }
  // Plausibilität: Rückgabe-km nicht unter Übergabe-km (wie im Self-Checkout).
  if (handoverType === "return" && contract.km_pickup != null && km != null && km < Number(contract.km_pickup)) {
    return NextResponse.json(
      { error: "Rückgabe-km darf nicht kleiner als Übergabe-km sein." },
      { status: 400 }
    );
  }

  // --- Organisation (org-scoped) ---
  const { data: orgRow } = await admin
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();
  if (!orgRow)
    return NextResponse.json({ error: "Organisation fehlt." }, { status: 500 });
  const org = orgRow as Organization;

  // --- Kunde, Fahrzeug, Fotos, Logo — alle org-scoped ---
  const [customer, vehicle, logoDataUri] = await Promise.all([
    loadCustomerForContract(admin, orgId, contract.customer_id),
    loadVehicleForContract(admin, orgId, contract.vehicle_id, contract.plate),
    loadLogoBase64(admin, org.logo_path),
  ]);

  const { data: photoRows } = await admin
    .from("handover_photos")
    .select("*")
    .eq("contract_id", contract.id)
    .eq("org_id", orgId) // SECURITY: multi-tenant isolation
    .eq("type", handoverType);
  const photoRecords = (photoRows ?? []) as HandoverPhoto[];

  // Jedes Foto aus dem handover-photos-Bucket als Data-URI einbetten. Ein
  // einzelnes Foto darf scheitern, ohne das ganze Protokoll zu verhindern.
  const photos: ProtocolPhoto[] = [];
  for (const p of photoRecords) {
    const { data, error } = await admin.storage
      .from("handover-photos")
      .download(p.photo_path);
    if (error || !data) continue;
    const buf = Buffer.from(await data.arrayBuffer());
    photos.push({
      position: p.position,
      label: labelForPosition(p.position),
      dataUri: `data:${mimeFromPath(p.photo_path)};base64,${buf.toString("base64")}`,
    });
  }

  // --- Erfasste Werte am Vertrag persistieren — nur gesetzte Felder, org-scoped ---
  // Leer/ungültig → null (CHECK erlaubt null); gültiger Key → der Key. Behebt
  // sowohl den leeren String als auch die früheren deutschen Labels.
  const fuel: string | null = isFuelLevel(body.fuel_level) ? body.fuel_level : null;
  const condition =
    typeof body.condition_notes === "string"
      ? body.condition_notes.trim()
      : undefined;

  // Bei RÜCKGABE koppelt das Protokoll den Abschluss. Defensiv: war der Vertrag
  // schon "abgeschlossen" (z. B. Self-Checkout lief zuerst), die GETEILTEN Felder
  // (status / actual_return_date / km_return / fuel_level_return) NICHT
  // stillschweigend überschreiben — Protokoll-Artefakte (Signaturen/Zustand/PDF)
  // trotzdem speichern.
  const alreadyClosed = handoverType === "return" && contract.status === "abgeschlossen";
  // Effektives Rückgabedatum (auch fürs PDF): explizit > vorhandener Wert > heute.
  const effReturnDate =
    actualReturnDate ??
    (contract.actual_return_date as string | null) ??
    new Date().toISOString().slice(0, 10);

  // Rückgabe-Aufstellung EINMAL berechnen — fürs PDF (Mehrtage/Mehr-km) UND die
  // Persistenz. Bei schon-abgeschlossenem Vertrag die gespeicherten Werte nutzen.
  const returnSummary =
    handoverType === "return" && contract.pickup_date && contract.return_date
      ? computeReturnSummary({
          pickupDate: contract.pickup_date,
          plannedReturnDate: contract.return_date,
          actualReturnDate: alreadyClosed
            ? (contract.actual_return_date as string | null) ?? effReturnDate
            : effReturnDate,
          kmPickup: contract.km_pickup,
          kmReturn: alreadyClosed ? contract.km_return : km,
          inclusiveKmMonth: (vehicle?.inclusive_km_month as number | null) ?? null,
          kmLimitOverride: contract.km_limit,
          pricePerKm: (vehicle?.extra_km_price as number | null) ?? null,
          originalReturnDate: contract.original_return_date,
          dailyRate: resolveEffectiveDailyRate({
            contractRate: contract.daily_rate,
            vehicleRate: (vehicle?.daily_rate as number | null) ?? null,
            contractMonthlyRate: contract.monthly_rate,
            vehicleMonthlyRate: (vehicle?.monthly_rate as number | null) ?? null,
            contractWeeklyRate: contract.weekly_rate,
            vehicleWeeklyRate: (vehicle?.weekly_rate as number | null) ?? null,
          }),
        })
      : null;

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (handoverType === "pickup") {
    if (km != null) update.km_pickup = km;
    update.fuel_level_pickup = fuel; // null (nicht gewählt) oder gültiger Key
    if (condition !== undefined) update.damages_at_handover = condition;
    update.handover_sig_lessor_pickup = sigLessor;
    update.handover_sig_renter_pickup = sigRenter;
  } else {
    // Protokoll-eigene Felder: immer (Re-Erzeugung aktualisiert sie).
    if (condition !== undefined) update.condition_at_return = condition;
    update.handover_sig_lessor_return = sigLessor;
    update.handover_sig_renter_return = sigRenter;
    // Abschluss + geteilte Felder: nur, wenn noch NICHT abgeschlossen.
    if (!alreadyClosed) {
      update.status = "abgeschlossen";
      update.km_return = km; // bei Rückgabe Pflicht (oben geprüft)
      update.fuel_level_return = fuel;
      update.actual_return_date = effReturnDate;
      // Rückgabe-Aufstellung persistieren (wie der frühere Abschluss über
      // PATCH /api/contracts/[id]) — sonst fehlen Mehr-km/Zusatztage später
      // auf Auswertung und Rechnung (LexOffice liest diese Vertragsfelder).
      if (returnSummary) {
        update.actual_days = returnSummary.actualDays;
        update.actual_km_allowed = returnSummary.allowedKm;
        update.km_driven = returnSummary.drivenKm;
        update.km_excess = returnSummary.excessKm;
        update.extra_km_cost = returnSummary.cost;
        update.extra_days_cost = returnSummary.extraDaysCost;
      }
    }
  }

  const { error: updErr } = await admin
    .from("contracts")
    .update(update)
    .eq("id", contract.id)
    .eq("org_id", orgId); // SECURITY: multi-tenant isolation
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // Frischer Snapshot der erfassten Werte fürs PDF (statt erneut zu laden).
  const snapshot: Contract = {
    ...contract,
    ...(handoverType === "pickup"
      ? {
          km_pickup: km ?? contract.km_pickup,
          fuel_level_pickup: fuel,
          damages_at_handover: condition ?? contract.damages_at_handover,
        }
      : {
          // Bei schon-abgeschlossen die gespeicherten (Self-Checkout-)Werte zeigen,
          // sonst die jetzt erfassten — konsistent zum DB-Update oben.
          km_return: alreadyClosed ? contract.km_return : km,
          fuel_level_return: alreadyClosed ? contract.fuel_level_return : fuel,
          condition_at_return: condition ?? contract.condition_at_return,
          actual_return_date: alreadyClosed ? contract.actual_return_date : effReturnDate,
        }),
  };

  // --- PDF rendern ---
  const pdfBuf = await generateHandoverProtocolPdf({
    org,
    contract: snapshot,
    customer,
    vehicle,
    type: handoverType,
    photos,
    sigLessorPng: sigLessor,
    sigRenterPng: sigRenter ?? null,
    logoDataUri,
    returnSummary,
    renterAbsent,
  });

  // --- In generated-docs ablegen — org-scoped Pfad ---
  const stamp = Date.now().toString(36);
  const path = `${orgId}/${contract.id}/protokoll-${handoverType}-${stamp}.pdf`;
  const { error: upErr } = await admin.storage
    .from("generated-docs")
    .upload(path, pdfBuf, { contentType: "application/pdf", upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // Pfad am Vertrag vermerken — org-scoped.
  const pathField =
    handoverType === "pickup"
      ? "handover_protocol_pickup_path"
      : "handover_protocol_return_path";
  const { error: pathErr } = await admin
    .from("contracts")
    .update({ [pathField]: path })
    .eq("id", contract.id)
    .eq("org_id", orgId); // SECURITY: multi-tenant isolation
  if (pathErr) return NextResponse.json({ error: pathErr.message }, { status: 500 });

  // --- Optional: per E-Mail an den Kunden senden (best-effort) ---
  let emailed = false;
  const recipient = customer?.email?.trim() || "";
  if (body.send_email === true && emailConfigured() && recipient) {
    const fromEmail = (org.sender_email || "").trim();
    if (fromEmail) {
      const eventLabel = handoverType === "pickup" ? "Übergabe" : "Rückgabe";
      const mieter =
        (customer ? customerDisplayName(customer) : "") || contract.renter_name || "";
      const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;line-height:1.6;color:#1c1917;">Guten Tag ${mieter},<br><br>im Anhang finden Sie das Übergabeprotokoll (${eventLabel}) zu Ihrem Mietvertrag ${contract.contract_nr}.<br><br>Mit freundlichen Grüßen<br>${org.name}</div>`;
      try {
        await sendDocumentEmail({
          fromName: org.sender_name,
          fromEmail,
          to: recipient,
          subject: `Übergabeprotokoll (${eventLabel}) – ${contract.contract_nr}`,
          html,
          replyTo: fromEmail,
          attachments: [
            {
              filename: `Uebergabeprotokoll-${handoverType}-${contract.contract_nr}.pdf`,
              contentBase64: pdfBuf.toString("base64"),
            },
          ],
        });
        emailed = true;
      } catch {
        // best-effort — E-Mail-Fehler darf das Erzeugen nicht scheitern lassen.
        emailed = false;
      }
    }
  }

  // --- Signierte Download-URL ---
  const { data: signed } = await admin.storage
    .from("generated-docs")
    .createSignedUrl(path, 3600);

  return NextResponse.json({
    ok: true,
    path,
    url: signed?.signedUrl ?? null,
    emailed,
    // Für die UI (Schritt 2): wurde der Vertrag mit diesem Rückgabe-Protokoll
    // abgeschlossen, und war er es vorher schon (dann Werte nicht überschrieben)?
    closed: handoverType === "return",
    alreadyClosed,
  });
};
