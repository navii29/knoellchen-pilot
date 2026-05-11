import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/postmark";
import {
  checkRateLimit,
  createMagicToken,
  ipFromHeaders,
  portalBaseUrl,
} from "@/lib/portal-auth";

export const POST = async (req: Request) => {
  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "E-Mail erforderlich" }, { status: 400 });

  const ip = ipFromHeaders();
  const limit = checkRateLimit(`portal-magic:${ip}:${email}`, 3, 5 * 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Zu viele Anfragen. Bitte in ${limit.retry_after_s}s erneut probieren.` },
      { status: 429 }
    );
  }

  const admin = createAdminClient();
  const { data: login } = await admin
    .from("customer_logins")
    .select("id, customer_id, org_id, email, active, customers(first_name, last_name), organizations(name, sender_name, sender_email)")
    .eq("email", email)
    .eq("active", true)
    .maybeSingle();

  // Generische Antwort — verrät nicht ob die E-Mail existiert
  if (!login) {
    return NextResponse.json({ ok: true, sent: false });
  }

  const { token, expires } = createMagicToken();
  await admin
    .from("customer_logins")
    .update({ magic_token: token, magic_token_expires: expires.toISOString() })
    .eq("id", login.id);

  type Org = { name?: string; sender_name?: string | null; sender_email?: string | null };
  type Cust = { first_name?: string | null; last_name?: string | null };
  const orgRel = login.organizations as Org | Org[] | null;
  const org: Org = Array.isArray(orgRel) ? orgRel[0] ?? {} : orgRel ?? {};
  const custRel = login.customers as Cust | Cust[] | null;
  const cust: Cust = Array.isArray(custRel) ? custRel[0] ?? {} : custRel ?? {};
  const orgName = org.name ?? "Ihre Vermietung";
  const fromAddress = org.sender_email ?? "kundenportal@knoellchen-pilot.de";
  const fromName = org.sender_name ?? orgName;
  const greeting =
    cust.first_name || cust.last_name
      ? `Hallo ${[cust.first_name, cust.last_name].filter(Boolean).join(" ")},`
      : "Hallo,";

  const link = `${portalBaseUrl()}/api/portal/magic?token=${token}`;
  await sendEmail({
    from: `${fromName} <${fromAddress}>`,
    to: email,
    subject: `Ihr Login-Link für ${orgName}`,
    htmlBody: `
      <p style="font-family:system-ui,sans-serif;color:#171717;font-size:15px;line-height:1.5">
        ${greeting}<br><br>
        klicken Sie auf den folgenden Link um sich einzuloggen. Der Link ist 24 Stunden gültig.<br><br>
        <a href="${link}" style="display:inline-block;padding:12px 24px;background:#171717;color:#fff;border-radius:999px;text-decoration:none;font-weight:500">Jetzt einloggen</a><br><br>
        Oder kopieren Sie diese Adresse in den Browser:<br>
        <span style="color:#737373;font-size:12px">${link}</span><br><br>
        Wenn Sie keinen Login angefordert haben, können Sie diese E-Mail ignorieren.
      </p>
    `,
    textBody: `${greeting}\n\nKlicken Sie auf den folgenden Link um sich einzuloggen (24h gültig):\n\n${link}\n\nWenn Sie keinen Login angefordert haben, ignorieren Sie diese E-Mail.`,
  });

  return NextResponse.json({ ok: true, sent: true });
};
