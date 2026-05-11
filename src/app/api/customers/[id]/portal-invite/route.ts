import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/postmark";
import {
  createMagicToken,
  hashPassword,
  portalBaseUrl,
} from "@/lib/portal-auth";
import { randomBytes } from "crypto";

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

const generateInitialPassword = () => {
  // Lesbares Initialpasswort: zwei zufällige 4-Zeichen-Blöcke + Bindestrich
  const seg = () => randomBytes(2).toString("hex");
  return `${seg()}-${seg()}-${seg()}`;
};

export const POST = async (_req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();

  const { data: customer } = await admin
    .from("customers")
    .select("id, org_id, first_name, last_name, email")
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!customer)
    return NextResponse.json({ error: "Kunde nicht gefunden" }, { status: 404 });
  const email = customer.email?.trim().toLowerCase();
  if (!email)
    return NextResponse.json(
      { error: "Kunde hat keine E-Mail-Adresse hinterlegt." },
      { status: 400 }
    );

  // Bereits vorhandener Login? Magic-Link senden statt neues Konto.
  const { data: existing } = await admin
    .from("customer_logins")
    .select("id")
    .eq("org_id", auth.org_id)
    .eq("email", email)
    .maybeSingle();

  const { token: magic, expires } = createMagicToken();

  let initialPassword: string | null = null;
  if (!existing) {
    initialPassword = generateInitialPassword();
    const password_hash = await hashPassword(initialPassword);
    const { error } = await admin.from("customer_logins").insert({
      customer_id: customer.id,
      org_id: auth.org_id,
      email,
      password_hash,
      magic_token: magic,
      magic_token_expires: expires.toISOString(),
      active: true,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    await admin
      .from("customer_logins")
      .update({
        magic_token: magic,
        magic_token_expires: expires.toISOString(),
        active: true,
      })
      .eq("id", existing.id);
  }

  // Org-Daten für Mail-Branding
  const { data: org } = await admin
    .from("organizations")
    .select("name, sender_name, sender_email")
    .eq("id", auth.org_id)
    .single();
  const orgName = org?.name ?? "Ihre Vermietung";
  const fromAddress = org?.sender_email ?? "kundenportal@knoellchen-pilot.de";
  const fromName = org?.sender_name ?? orgName;
  const greeting =
    customer.first_name || customer.last_name
      ? `Hallo ${[customer.first_name, customer.last_name].filter(Boolean).join(" ")},`
      : "Hallo,";
  const link = `${portalBaseUrl()}/api/portal/magic?token=${magic}`;

  const passwordSection = initialPassword
    ? `
        <p style="margin-top:16px">
          Falls Sie den Magic-Link einmal nicht zur Hand haben, können Sie sich auch mit
          E-Mail und Passwort einloggen:
        </p>
        <p style="font-family:ui-monospace,monospace;background:#f5f5f4;padding:10px 12px;border-radius:8px">
          E-Mail: ${email}<br>
          Initialpasswort: <strong>${initialPassword}</strong>
        </p>
        <p style="font-size:12px;color:#737373">
          Bitte ändern Sie das Passwort nach dem ersten Login im Profil.
        </p>`
    : "";

  await sendEmail({
    from: `${fromName} <${fromAddress}>`,
    to: email,
    subject: `Ihr Zugang zum Kundenportal von ${orgName}`,
    htmlBody: `
      <div style="font-family:system-ui,sans-serif;color:#171717;font-size:15px;line-height:1.5">
        <p>${greeting}</p>
        <p>
          ${orgName} hat ein Kundenkonto für Sie eingerichtet. Mit einem Klick auf den
          folgenden Button können Sie sich direkt einloggen — Verträge ansehen,
          unterschreiben und Dokumente herunterladen:
        </p>
        <p>
          <a href="${link}" style="display:inline-block;padding:12px 24px;background:#171717;color:#fff;border-radius:999px;text-decoration:none;font-weight:500">
            Kundenportal öffnen
          </a>
        </p>
        <p style="color:#737373;font-size:12px">${link}</p>
        ${passwordSection}
        <p style="margin-top:24px">Viele Grüße<br>Ihr Team von ${orgName}</p>
      </div>
    `,
    textBody: `${greeting}\n\n${orgName} hat ein Kundenkonto für Sie eingerichtet.\n\nLogin-Link (24h gültig):\n${link}\n${
      initialPassword
        ? `\nFalls der Link nicht funktioniert:\nE-Mail: ${email}\nInitialpasswort: ${initialPassword}\n`
        : ""
    }`,
  });

  return NextResponse.json({
    ok: true,
    initial_password: initialPassword, // wird im UI dem Admin angezeigt
    expires_at: expires.toISOString(),
  });
};
