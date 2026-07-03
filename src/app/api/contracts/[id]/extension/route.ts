import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";
import { buildExtensionNotification } from "@/lib/extension-notify";
import { buildNachtragInput } from "@/lib/nachtrag-input";
import { generateNachtragPdf } from "@/lib/nachtrag-pdf";
import { fmtDate } from "@/lib/utils";

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

/**
 * Verlängerungs-Anfrage genehmigen oder ablehnen.
 * POST /api/contracts/[id]/extension
 * Body: { extension_id: string; action: "approve" | "decline" }
 *
 * approve → contract.return_date = extension.requested_return_date
 *            (+ return_time falls vorhanden)
 *            extension.status = 'bestaetigt'
 * decline → extension.status = 'abgelehnt'
 */
export const POST = async (req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  let body: { extension_id?: string; action?: string };
  try {
    body = (await req.json()) as { extension_id?: string; action?: string };
  } catch {
    return NextResponse.json({ error: "Ungültiger Request-Body" }, { status: 400 });
  }

  const { extension_id, action } = body;

  if (!extension_id || typeof extension_id !== "string") {
    return NextResponse.json({ error: "extension_id fehlt" }, { status: 400 });
  }
  if (action !== "approve" && action !== "decline") {
    return NextResponse.json({ error: "action muss 'approve' oder 'decline' sein" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verlängerungs-Anfrage laden — org-scoped UND zum richtigen Vertrag gehörig.
  const { data: extension } = await admin
    .from("contract_extensions")
    .select("*")
    .eq("id", extension_id)
    .eq("contract_id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();

  if (!extension) {
    return NextResponse.json({ error: "Verlängerungs-Anfrage nicht gefunden" }, { status: 404 });
  }

  // Bereits bearbeitet → klar abweisen, nicht stillschweigend ignorieren.
  if (extension.status !== "angefragt") {
    return NextResponse.json(
      { error: "Diese Verlängerungs-Anfrage wurde bereits bearbeitet." },
      { status: 400 }
    );
  }

  // Mieter-Benachrichtigung (best-effort): NUR nach persistierter Entscheidung
  // aufrufen. Fehlt der Empfänger (customer_id null) → überspringen. notify-
  // Fehler werden PII-frei geloggt und kippen die Entscheidung NICHT.
  const sendExtensionNotice = async (
    notifyAction: "approve" | "decline",
    customerId: string | null | undefined,
    requestedReturnDate: string
  ) => {
    const n = buildExtensionNotification({
      action: notifyAction,
      customerId,
      orgId: auth.org_id,
      contractId: params.id,
      requestedReturnDate,
    });
    if (!n) return;
    try {
      await notify(n);
    } catch {
      console.error(
        "[extension] notify fehlgeschlagen (contract_id=" +
          params.id +
          ", action=" +
          notifyAction +
          ")"
      );
    }
  };

  if (action === "approve") {
    // Aktuellen Vertrag laden (org-scoped) — VOR dem Überschreiben validieren.
    const { data: contract } = await admin
      .from("contracts")
      .select("contract_nr, return_date, return_time")
      .eq("id", params.id)
      .eq("org_id", auth.org_id)
      .maybeSingle();

    if (!contract) {
      return NextResponse.json({ error: "Vertrag nicht gefunden" }, { status: 404 });
    }

    // Optimistic-Concurrency: Wurde das Rückgabedatum zwischenzeitlich geändert
    // (gegenüber dem Stand, den die Anfrage gesehen hat), nicht blind überschreiben.
    if (
      extension.current_return_date != null &&
      extension.current_return_date !== contract.return_date
    ) {
      return NextResponse.json(
        { error: "Vertrag zwischenzeitlich geändert — bitte Anfrage neu prüfen." },
        { status: 409 }
      );
    }

    // Eine Verlängerung muss das Rückgabedatum in die Zukunft verschieben.
    if (
      contract.return_date &&
      new Date(extension.requested_return_date) <= new Date(contract.return_date)
    ) {
      return NextResponse.json(
        { error: "Das gewünschte Rückgabedatum liegt nicht nach dem aktuellen." },
        { status: 400 }
      );
    }

    // Vertrag org-scoped aktualisieren (return_date + optional return_time).
    const contractUpdate: Record<string, unknown> = {
      return_date: extension.requested_return_date,
      updated_at: new Date().toISOString(),
    };
    if (extension.requested_return_time) {
      contractUpdate.return_time = extension.requested_return_time;
    }

    const { error: contractErr } = await admin
      .from("contracts")
      .update(contractUpdate)
      .eq("id", params.id)
      .eq("org_id", auth.org_id);

    if (contractErr) {
      return NextResponse.json({ error: contractErr.message }, { status: 500 });
    }

    // Extension als bestätigt markieren.
    const { error: extErr } = await admin
      .from("contract_extensions")
      .update({ status: "bestaetigt" })
      .eq("id", extension_id)
      .eq("org_id", auth.org_id);

    if (extErr) {
      return NextResponse.json({ error: extErr.message }, { status: 500 });
    }

    // Andere noch offene Anfragen desselben Vertrags sind jetzt veraltet —
    // als abgelehnt markieren (best-effort, org-scoped). Die verdrängten Zeilen
    // zurückgeben, um ihre Mieter einzeln zu benachrichtigen.
    const { data: displaced } = await admin
      .from("contract_extensions")
      .update({ status: "abgelehnt" })
      .eq("contract_id", params.id)
      .eq("org_id", auth.org_id)
      .eq("status", "angefragt")
      .neq("id", extension_id)
      .select("customer_id, requested_return_date");

    await logActivity(
      admin,
      auth.user.id,
      auth.org_id,
      "contract.extension_approved",
      (contract as { contract_nr?: string } | null)?.contract_nr ?? null
    );

    // Entscheidung ist persistiert → jetzt benachrichtigen (best-effort):
    // genehmigter Mieter „bestätigt", verdrängte Anfragen je „abgelehnt".
    await sendExtensionNotice(
      "approve",
      extension.customer_id,
      extension.requested_return_date
    );
    for (const d of (displaced ?? []) as {
      customer_id: string | null;
      requested_return_date: string;
    }[]) {
      await sendExtensionNotice("decline", d.customer_id, d.requested_return_date);
    }

    // Nachtrag-zum-Mietvertrag-PDF best-effort NACH persistierter Entscheidung
    // erzeugen + speichern. Fehler werden PII-frei geloggt (nur contract_id +
    // error.code), kippen die Genehmigung NIE. Geteilte Loader/Funktionen.
    try {
      const { data: full } = await admin
        .from("contracts")
        .select("contract_nr, renter_name, plate, vehicle_id, vehicle_type, daily_rate, weekly_rate, monthly_rate")
        .eq("id", params.id)
        .eq("org_id", auth.org_id)
        .maybeSingle();
      const { data: org } = await admin
        .from("organizations")
        .select("name, city, logo_path, brand_color")
        .eq("id", auth.org_id)
        .maybeSingle();
      if (!full || !org) {
        console.error(
          "[extension] nachtrag übersprungen — contract/org nicht ladbar (contract_id=" +
            params.id +
            ")"
        );
      } else {
        // Geteilter Assembler — identische Logik wie zuvor inline (verhaltens-
        // neutral, bewiesen in nachtrag-input.test.ts). Unsigniert: keine
        // Signaturen → leere Unterschriftslinien wie bisher.
        const input = await buildNachtragInput(admin, {
          orgId: auth.org_id,
          org: org as {
            name: string | null;
            city: string | null;
            logo_path: string | null;
            brand_color: string | null;
          },
          contract: full as {
            contract_nr: string | null;
            renter_name: string | null;
            plate: string | null;
            vehicle_id: string | null;
            vehicle_type: string | null;
            daily_rate: number | null;
            weekly_rate: number | null;
            monthly_rate: number | null;
          },
          extension: extension as {
            customer_id: string | null;
            current_return_date: string | null;
            requested_return_date: string | null;
            extra_days: number | null;
          },
          dateStr: fmtDate(new Date().toISOString()),
        });
        const pdfBuf = await generateNachtragPdf(input);
        const stamp = Date.now().toString(36);
        const path = `${auth.org_id}/${params.id}/nachtrag-${stamp}.pdf`;
        const { error: upErr } = await admin.storage
          .from("generated-docs")
          .upload(path, pdfBuf, { contentType: "application/pdf", upsert: true });
        if (upErr) {
          // Storage-Fehler generisch loggen (message kann den Pfad spiegeln).
          console.error(
            "[extension] nachtrag upload fehlgeschlagen (contract_id=" + params.id + ")"
          );
        } else {
          const { error: pErr } = await admin
            .from("contract_extensions")
            .update({ addendum_pdf_path: path })
            .eq("id", extension_id)
            .eq("org_id", auth.org_id);
          if (pErr)
            console.error(
              "[extension] nachtrag addendum_pdf_path update fehlgeschlagen (contract_id=" +
                params.id +
                "):",
              pErr.code ?? ""
            );
        }
      }
    } catch {
      console.error(
        "[extension] nachtrag generierung fehlgeschlagen (contract_id=" + params.id + ")"
      );
    }

    return NextResponse.json({ ok: true, status: "bestaetigt" });
  }

  // decline
  const { error: extErr } = await admin
    .from("contract_extensions")
    .update({ status: "abgelehnt" })
    .eq("id", extension_id)
    .eq("org_id", auth.org_id);

  if (extErr) {
    return NextResponse.json({ error: extErr.message }, { status: 500 });
  }

  // Ablehnung ist persistiert → Mieter benachrichtigen (best-effort).
  await sendExtensionNotice("decline", extension.customer_id, extension.requested_return_date);

  return NextResponse.json({ ok: true, status: "abgelehnt" });
};
