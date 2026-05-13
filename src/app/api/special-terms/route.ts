import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

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

export const GET = async () => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("special_terms_templates")
    .select("*")
    .eq("org_id", auth.org_id)
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, templates: data ?? [] });
};

export const POST = async (req: Request) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    text?: string;
    category?: string;
    sort_order?: number;
    active?: boolean;
  };

  const title = body.title?.trim();
  const text = body.text?.trim();
  if (!title || !text)
    return NextResponse.json(
      { error: "Titel und Text sind Pflichtfelder" },
      { status: 400 }
    );

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("special_terms_templates")
    .insert({
      org_id: auth.org_id,
      title,
      text,
      category: body.category ?? "general",
      sort_order: body.sort_order ?? 999,
      active: body.active ?? true,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, template: data });
};
