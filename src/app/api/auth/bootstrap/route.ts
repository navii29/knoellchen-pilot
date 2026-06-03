import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureOrgForUser } from "@/lib/org-bootstrap";

export const POST = async (req: Request) => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    org_name?: string;
    full_name?: string;
  };

  try {
    const r = await ensureOrgForUser(user, {
      orgName: body.org_name,
      fullName: body.full_name ?? null,
    });
    return NextResponse.json({
      ok: true,
      org_id: r.org_id,
      slug: r.slug,
      inbound_email: r.inbound_email,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Konnte Organisation nicht anlegen.";
    const status = msg.includes("org_name") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
};
