import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { generateHandoverProtocolPdf } from "@/lib/handover-protocol-pdf";
import type { ProtocolPhoto } from "@/lib/handover-protocol-html";
import { POSITIONS } from "@/lib/handover";
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
  };

  const type = body.type;
  if (type !== "pickup" && type !== "return") {
    return NextResponse.json(
      { error: "Ungültiger Typ (erwartet: pickup oder return)." },
      { status: 400 }
    );
  }
  const handoverType = type as HandoverPhotoType;

  const sigLessor = body.signature_lessor;
  const sigRenter = body.signature_renter;
  if (!isPngDataUrl(sigLessor) || !isPngDataUrl(sigRenter)) {
    return NextResponse.json(
      { error: "Ungültige Unterschrift (erwartet: data:image/png;base64,…) — beide Felder." },
      { status: 400 }
    );
  }
  if (!hasInk(sigLessor) || !hasInk(sigRenter)) {
    return NextResponse.json(
      { error: "Unterschrift fehlt — beide Felder müssen unterschrieben sein." },
      { status: 400 }
    );
  }

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
  const km = parseKm(body.km);
  const fuel =
    typeof body.fuel_level === "string" ? body.fuel_level.trim() : undefined;
  const condition =
    typeof body.condition_notes === "string"
      ? body.condition_notes.trim()
      : undefined;

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (handoverType === "pickup") {
    if (km != null) update.km_pickup = km;
    if (fuel !== undefined) update.fuel_level_pickup = fuel;
    if (condition !== undefined) update.damages_at_handover = condition;
    update.handover_sig_lessor_pickup = sigLessor;
    update.handover_sig_renter_pickup = sigRenter;
  } else {
    if (km != null) update.km_return = km;
    if (fuel !== undefined) update.fuel_level_return = fuel;
    if (condition !== undefined) update.condition_at_return = condition;
    update.handover_sig_lessor_return = sigLessor;
    update.handover_sig_renter_return = sigRenter;
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
          fuel_level_pickup: fuel ?? contract.fuel_level_pickup,
          damages_at_handover: condition ?? contract.damages_at_handover,
        }
      : {
          km_return: km ?? contract.km_return,
          fuel_level_return: fuel ?? contract.fuel_level_return,
          condition_at_return: condition ?? contract.condition_at_return,
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
    sigRenterPng: sigRenter,
    logoDataUri,
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
  });
};
