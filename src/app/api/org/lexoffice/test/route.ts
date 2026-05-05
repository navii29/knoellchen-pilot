import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { LexOfficeError, lxGetProfile } from "@/lib/lexoffice";

export const POST = async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 401 });

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("lexoffice_api_key")
    .eq("id", profile.org_id)
    .single();
  const apiKey = org?.lexoffice_api_key;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Kein LexOffice API-Key hinterlegt." },
      { status: 400 }
    );
  }

  try {
    const lxProfile = await lxGetProfile(apiKey);
    return NextResponse.json({
      ok: true,
      profile: {
        company_name: lxProfile.companyName,
        organization_id: lxProfile.organizationId,
        tax_number: lxProfile.taxNumber ?? null,
        vat_id: lxProfile.vatId ?? null,
        email: lxProfile.email ?? null,
      },
    });
  } catch (e) {
    if (e instanceof LexOfficeError) {
      const hint =
        e.status === 401
          ? "API-Key ungültig oder abgelaufen."
          : e.status === 403
          ? "API-Key hat keine ausreichenden Rechte."
          : `LexOffice-Fehler ${e.status}.`;
      return NextResponse.json({ error: hint, detail: e.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unbekannter Fehler" },
      { status: 500 }
    );
  }
};
