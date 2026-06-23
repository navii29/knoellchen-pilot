import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { templates, isTemplateKey } from "@/lib/site/templates";
import type { PublicVehicle, SeedOrg } from "@/lib/site/types";

export const maxDuration = 30;

// Auth wie in den übrigen Dashboard-Routen: Supabase-Session → users.org_id.
// Jedes Org-Mitglied darf die Site initialisieren (owner-only NICHT gefordert).
const requireAuth = async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", user.id)
    .single();
  return profile ? { user, org_id: profile.org_id, role: profile.role } : null;
};

// POST /api/site/init — { template, published? }
// Legt die sites-Zeile der Org an/aktualisiert sie (Template + Theme) und seedet
// — NUR falls die Site noch keine Seiten hat — Seiten + Blöcke aus dem Template.
// Idempotent: existieren bereits Seiten, wird ausschließlich Template+Theme
// (und optional published) umgestellt, NICHT neu geseedet.
export const POST = async (req: Request) => {
  const auth = await requireAuth();
  if (!auth)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    template?: unknown;
    published?: unknown;
  } | null;
  const template = body?.template;
  if (!isTemplateKey(template))
    return NextResponse.json(
      { error: "Ungültiges Template (modern, klassisch oder bold)" },
      { status: 400 }
    );

  const orgId: string = auth.org_id;
  const admin = createAdminClient();
  const def = templates[template];

  // Org-Daten (org-scoped) für den Seed.
  const { data: orgRow } = await admin
    .from("organizations")
    .select("name, street, zip, city, phone, email, logo_path")
    .eq("id", orgId)
    .single();
  if (!orgRow)
    return NextResponse.json({ error: "Organisation nicht gefunden" }, { status: 404 });
  const org = orgRow as SeedOrg;

  // sites-Zeile upserten (eine pro Org via UNIQUE org_id).
  const publishedPatch =
    typeof body?.published === "boolean" ? { published: body.published } : {};
  const { data: site, error: upErr } = await admin
    .from("sites")
    .upsert(
      {
        org_id: orgId,
        template,
        theme: def.theme,
        ...publishedPatch,
      },
      { onConflict: "org_id" }
    )
    .select("*")
    .single();
  if (upErr || !site)
    return NextResponse.json(
      { error: upErr?.message ?? "Site konnte nicht gespeichert werden" },
      { status: 500 }
    );

  // Bereits Seiten vorhanden? Dann nur Template/Theme umgestellt — nicht neu seeden.
  const { count: existingPages } = await admin
    .from("site_pages")
    .select("*", { count: "exact", head: true })
    .eq("site_id", site.id)
    .eq("org_id", orgId);

  if ((existingPages ?? 0) > 0) {
    return NextResponse.json({ ok: true, site, seeded: false });
  }

  // Org-Fahrzeuge (org-scoped, nur öffentliche Anzeigefelder) für den Seed.
  const { data: vehicleRows } = await admin
    .from("vehicles")
    .select(
      "id, vehicle_type, manufacturer, model, body_type, fuel_type, transmission, seats, doors, daily_rate"
    )
    .eq("org_id", orgId)
    .eq("status", "aktiv")
    .order("manufacturer", { ascending: true })
    .limit(24);
  const vehicles = (vehicleRows ?? []) as PublicVehicle[];

  const seed = def.buildSeed(org, vehicles);

  // Seiten einfügen.
  const pageRows = seed.pages.map((p, i) => ({
    site_id: site.id,
    org_id: orgId,
    title: p.title,
    path: p.path,
    sort: i,
  }));
  const { data: insertedPages, error: pgErr } = await admin
    .from("site_pages")
    .insert(pageRows)
    .select("id, path");
  if (pgErr || !insertedPages)
    return NextResponse.json(
      { error: pgErr?.message ?? "Seiten konnten nicht angelegt werden" },
      { status: 500 }
    );

  const pageIdByPath = new Map(
    insertedPages.map((p) => [p.path as string, p.id as string])
  );

  // Blöcke einfügen.
  const blockRows = seed.pages.flatMap((p) => {
    const pageId = pageIdByPath.get(p.path);
    if (!pageId) return [];
    return p.blocks.map((b, i) => ({
      page_id: pageId,
      site_id: site.id,
      org_id: orgId,
      type: b.type,
      sort: i,
      content: b.content,
    }));
  });
  if (blockRows.length > 0) {
    const { error: blkErr } = await admin.from("site_blocks").insert(blockRows);
    if (blkErr)
      return NextResponse.json({ error: blkErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, site, seeded: true });
};

// PATCH /api/site/init — { published } : Veröffentlichungs-Status umschalten.
export const PATCH = async (req: Request) => {
  const auth = await requireAuth();
  if (!auth)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    published?: unknown;
  } | null;
  if (typeof body?.published !== "boolean")
    return NextResponse.json(
      { error: "published (boolean) erforderlich" },
      { status: 400 }
    );

  const admin = createAdminClient();
  const { data: site, error } = await admin
    .from("sites")
    .update({ published: body.published })
    .eq("org_id", auth.org_id)
    .select("*")
    .maybeSingle();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if (!site)
    return NextResponse.json(
      { error: "Noch keine Site — bitte zuerst ein Template wählen." },
      { status: 404 }
    );

  return NextResponse.json({ ok: true, site });
};
