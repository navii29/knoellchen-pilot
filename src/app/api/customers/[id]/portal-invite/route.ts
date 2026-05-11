import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { hashPassword } from "@/lib/portal-auth";

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

export const POST = async (req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Bitte eine gültige E-Mail-Adresse angeben." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Passwort muss mindestens 8 Zeichen lang sein." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: customer } = await admin
    .from("customers")
    .select("id, org_id")
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!customer)
    return NextResponse.json({ error: "Kunde nicht gefunden" }, { status: 404 });

  // Bei Konflikt mit anderem Kunden im selben Org-Kontext: klare Fehlermeldung
  // (sonst wirft unique-Constraint einen kryptischen Postgres-Fehler)
  const { data: conflict } = await admin
    .from("customer_logins")
    .select("id, customer_id")
    .eq("org_id", auth.org_id)
    .eq("email", email)
    .maybeSingle();
  if (conflict && conflict.customer_id !== customer.id) {
    return NextResponse.json(
      {
        error:
          "Diese E-Mail-Adresse ist bereits einem anderen Kunden in deiner Organisation zugeordnet.",
      },
      { status: 409 }
    );
  }

  const password_hash = await hashPassword(password);

  // Bestehenden Login dieses Kunden überschreiben (Passwort-Reset-Pfad), sonst neu anlegen
  const { data: existingForCustomer } = await admin
    .from("customer_logins")
    .select("id")
    .eq("org_id", auth.org_id)
    .eq("customer_id", customer.id)
    .maybeSingle();

  if (existingForCustomer) {
    const { error } = await admin
      .from("customer_logins")
      .update({
        email,
        password_hash,
        magic_token: null,
        magic_token_expires: null,
        active: true,
      })
      .eq("id", existingForCustomer.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      ok: true,
      mode: "updated",
      email,
    });
  }

  const { error } = await admin.from("customer_logins").insert({
    customer_id: customer.id,
    org_id: auth.org_id,
    email,
    password_hash,
    active: true,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    mode: "created",
    email,
  });
};
