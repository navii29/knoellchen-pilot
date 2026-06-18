import { NextResponse } from "next/server";
import { loadPortalContract } from "@/lib/portal-contract-guard";

// Schaden-/Vorfallmeldung des Mieters während der Miete. Legt einen
// damage_reports-Eintrag an (Admin-Client via loadPortalContract, Ownership
// ist dort geprüft).
export const POST = async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await loadPortalContract(params.id);
  if (!ctx) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    date?: string;
    time?: string;
    location?: string;
    description?: string;
    other_party_name?: string;
    other_party_plate?: string;
    other_party_insurance?: string;
    photos?: string[];
  };
  const photos = Array.isArray(body.photos) ? body.photos.slice(0, 20) : [];
  if (!body.description?.trim() && photos.length === 0) {
    return NextResponse.json(
      { error: "Bitte eine Beschreibung oder ein Foto angeben." },
      { status: 400 }
    );
  }
  const clean = (v?: string) => (v && v.trim() ? v.trim() : null);

  const { data, error } = await ctx.admin
    .from("damage_reports")
    .insert({
      org_id: ctx.session.org_id,
      contract_id: ctx.contract.id,
      vehicle_id: ctx.contract.vehicle_id ?? null,
      date: body.date || new Date().toISOString().slice(0, 10),
      time: clean(body.time),
      location: clean(body.location),
      description: clean(body.description),
      other_party_name: clean(body.other_party_name),
      other_party_plate: clean(body.other_party_plate),
      other_party_insurance: clean(body.other_party_insurance),
      photos,
      status: "offen",
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: data.id });
};
