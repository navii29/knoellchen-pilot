import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { bootstrapOrgForUser } from "@/lib/auth-bootstrap";

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

  const admin = createAdminClient();
  const result = await bootstrapOrgForUser(admin, user, {
    orgName: body.org_name,
    fullName: body.full_name,
  });
  if ("error" in result)
    return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
};
