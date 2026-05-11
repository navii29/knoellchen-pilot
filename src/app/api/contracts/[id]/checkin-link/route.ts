import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/postmark";
import { portalBaseUrl } from "@/lib/portal-auth";

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

export const POST = async (_req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data: contract } = await admin
    .from("contracts")
    .select(
      "id, contract_nr, customer_id, renter_email, renter_name, customers(first_name, last_name, email)"
    )
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!contract)
    return NextResponse.json({ error: "Vertrag nicht gefunden" }, { status: 404 });

  type Cust = { first_name?: string | null; last_name?: string | null; email?: string | null };
  const custRel = contract.customers as Cust | Cust[] | null;
  const cust: Cust = Array.isArray(custRel) ? custRel[0] ?? {} : custRel ?? {};
  const email = (cust.email ?? contract.renter_email ?? "").trim().toLowerCase();
  if (!email)
    return NextResponse.json(
      { error: "Keine E-Mail-Adresse für den Mieter hinterlegt." },
      { status: 400 }
    );
  if (!contract.customer_id)
    return NextResponse.json(
      {
        error:
          "Vertrag ist keinem Kundenkonto zugeordnet. Bitte zuerst Kunden in den Vertrag eintragen.",
      },
      { status: 400 }
    );

  const { data: org } = await admin
    .from("organizations")
    .select("name, sender_name, sender_email")
    .eq("id", auth.org_id)
    .single();
  const orgName = org?.name ?? "Ihre Vermietung";
  const fromAddress = org?.sender_email ?? "kundenportal@knoellchen-pilot.de";
  const fromName = org?.sender_name ?? orgName;
  const greeting =
    cust.first_name || cust.last_name
      ? `Hallo ${[cust.first_name, cust.last_name].filter(Boolean).join(" ")},`
      : `Hallo ${contract.renter_name},`;
  const link = `${portalBaseUrl()}/portal/contracts/${contract.id}`;

  await sendEmail({
    from: `${fromName} <${fromAddress}>`,
    to: email,
    subject: `Bitte erledigen Sie Ihren Check-in zu Vertrag ${contract.contract_nr}`,
    htmlBody: `
      <div style="font-family:system-ui,sans-serif;color:#171717;font-size:15px;line-height:1.5">
        <p>${greeting}</p>
        <p>
          bitte erledigen Sie vor der Fahrzeug-Abholung Ihren Check-in im
          Kundenportal von ${orgName} — das spart uns beiden Zeit.
        </p>
        <p>
          <a href="${link}" style="display:inline-block;padding:12px 24px;background:#171717;color:#fff;border-radius:999px;text-decoration:none;font-weight:500">
            Check-in starten
          </a>
        </p>
        <p style="color:#737373;font-size:12px">${link}</p>
        <p>
          Falls Sie noch keinen Portal-Zugang haben, fordern Sie auf der Login-Seite
          einen Magic-Link an — Sie bekommen ihn dann sofort an diese E-Mail-Adresse.
        </p>
        <p style="margin-top:24px">Viele Grüße<br>Ihr Team von ${orgName}</p>
      </div>
    `,
    textBody: `${greeting}\n\nBitte erledigen Sie vor der Fahrzeug-Abholung Ihren Check-in im Kundenportal von ${orgName}:\n${link}\n`,
  });

  return NextResponse.json({ ok: true, sent_to: email });
};
