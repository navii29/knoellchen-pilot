import type { SupabaseClient } from "@supabase/supabase-js";
import { nextContractNr } from "./contract-utils";
import { computeDecommission } from "./decommission";
import { normalizePlate } from "./plate";
import type { Vehicle } from "./types";

export type ToolContext = {
  org_id: string;
  admin: SupabaseClient;
};

export type ToolResult = {
  ok: boolean;
  data?: unknown;
  error?: string;
};

export type Tool = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  handler: (input: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>;
};

// Hilfsfunktion: Datum normalisieren (YYYY-MM-DD oder dd.mm.yyyy → ISO)
const parseDate = (s: unknown): string | null => {
  if (typeof s !== "string") return null;
  const trimmed = s.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const m = trimmed.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})/);
  if (m) {
    const [, d, mm, y] = m;
    const yyyy = y.length === 2 ? "20" + y : y;
    return `${yyyy}-${mm.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
};

// =========================================================
// 1) create_contract
// =========================================================
const createContract: Tool = {
  name: "create_contract",
  description:
    "Legt einen neuen Mietvertrag an. Verwende dies wenn der Nutzer eine Vermietung erfassen möchte. Pflichtfelder: plate, renter_name, pickup_date, return_date. Optionale Felder: vehicle_type, renter_email, renter_phone, renter_address, renter_birthday, renter_license_nr, daily_rate, total_amount, deposit, contract_nr.",
  input_schema: {
    type: "object",
    properties: {
      plate: { type: "string", description: "Kennzeichen, z.B. 'M-AV 5678'" },
      vehicle_type: { type: "string", description: "Fahrzeugtyp, z.B. 'VW Golf VIII'" },
      renter_name: { type: "string" },
      renter_email: { type: "string" },
      renter_phone: { type: "string" },
      renter_address: { type: "string" },
      renter_birthday: { type: "string", description: "YYYY-MM-DD" },
      renter_license_nr: { type: "string" },
      pickup_date: { type: "string", description: "YYYY-MM-DD" },
      return_date: { type: "string", description: "YYYY-MM-DD" },
      pickup_time: { type: "string", description: "HH:MM" },
      return_time: { type: "string", description: "HH:MM" },
      daily_rate: { type: "number" },
      total_amount: { type: "number" },
      deposit: { type: "number" },
      contract_nr: { type: "string" },
    },
    required: ["plate", "renter_name", "pickup_date", "return_date"],
  },
  handler: async (input, ctx) => {
    const plate = normalizePlate(input.plate as string);
    const pickup = parseDate(input.pickup_date);
    const ret = parseDate(input.return_date);
    if (!pickup || !ret) return { ok: false, error: "Ungültiges Datumsformat — bitte YYYY-MM-DD verwenden" };

    await ctx.admin
      .from("vehicles")
      .upsert(
        { org_id: ctx.org_id, plate, vehicle_type: input.vehicle_type ?? null },
        { onConflict: "org_id,plate", ignoreDuplicates: true }
      );

    const { data: vehicle } = await ctx.admin
      .from("vehicles")
      .select("id")
      .eq("org_id", ctx.org_id)
      .eq("plate", plate)
      .maybeSingle();

    const { data, error } = await ctx.admin
      .from("contracts")
      .insert({
        org_id: ctx.org_id,
        contract_nr: (input.contract_nr as string) || nextContractNr(),
        vehicle_id: vehicle?.id ?? null,
        plate,
        vehicle_type: (input.vehicle_type as string) ?? null,
        renter_name: String(input.renter_name).trim(),
        renter_email: (input.renter_email as string)?.trim() || null,
        renter_phone: (input.renter_phone as string)?.trim() || null,
        renter_address: (input.renter_address as string)?.trim() || null,
        renter_birthday: parseDate(input.renter_birthday),
        renter_license_nr: (input.renter_license_nr as string)?.trim() || null,
        pickup_date: pickup,
        return_date: ret,
        pickup_time: (input.pickup_time as string) ?? null,
        return_time: (input.return_time as string) ?? null,
        daily_rate: typeof input.daily_rate === "number" ? input.daily_rate : null,
        total_amount: typeof input.total_amount === "number" ? input.total_amount : null,
        deposit: typeof input.deposit === "number" ? input.deposit : null,
        status: "aktiv",
      })
      .select("id, contract_nr, plate, renter_name, renter_email, pickup_date, return_date")
      .single();

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: { contract: data } };
  },
};

// =========================================================
// 2) create_vehicle
// =========================================================
const createVehicle: Tool = {
  name: "create_vehicle",
  description: "Legt ein neues Fahrzeug zur Flotte hinzu (Kennzeichen + optional Typ und Farbe).",
  input_schema: {
    type: "object",
    properties: {
      plate: { type: "string" },
      vehicle_type: { type: "string" },
      color: { type: "string" },
    },
    required: ["plate"],
  },
  handler: async (input, ctx) => {
    const plate = normalizePlate(input.plate as string);
    const { data, error } = await ctx.admin
      .from("vehicles")
      .upsert(
        {
          org_id: ctx.org_id,
          plate,
          vehicle_type: (input.vehicle_type as string) ?? null,
          color: (input.color as string) ?? null,
        },
        { onConflict: "org_id,plate" }
      )
      .select("id, plate, vehicle_type, color")
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: { vehicle: data } };
  },
};

// =========================================================
// 3) search_contracts
// =========================================================
const searchContracts: Tool = {
  name: "search_contracts",
  description:
    "Sucht Mietverträge. Mindestens ein Filter sollte gesetzt sein. Filtert nach Kennzeichen, Mietername, Status oder Zeitraum (Vertrag aktiv an einem bestimmten Datum).",
  input_schema: {
    type: "object",
    properties: {
      plate: { type: "string" },
      renter_query: { type: "string", description: "Teil des Mieternamens oder der E-Mail" },
      status: { type: "string", enum: ["aktiv", "abgeschlossen", "storniert"] },
      active_on: { type: "string", description: "YYYY-MM-DD — nur Verträge die an diesem Tag aktiv waren" },
      limit: { type: "number" },
    },
  },
  handler: async (input, ctx) => {
    let q = ctx.admin.from("contracts").select("*").eq("org_id", ctx.org_id);
    if (input.plate) {
      const p = normalizePlate(input.plate as string);
      q = q.eq("plate", p);
    }
    if (input.renter_query) {
      const term = `%${input.renter_query}%`;
      q = q.or(`renter_name.ilike.${term},renter_email.ilike.${term}`);
    }
    if (input.status) q = q.eq("status", input.status);
    if (input.active_on) {
      const d = parseDate(input.active_on);
      if (d) q = q.lte("pickup_date", d).gte("return_date", d);
    }
    q = q.order("pickup_date", { ascending: false }).limit(Number(input.limit) || 10);
    const { data, error } = await q;
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: { count: data?.length ?? 0, contracts: data ?? [] } };
  },
};

// =========================================================
// 4) search_tickets
// =========================================================
const searchTickets: Tool = {
  name: "search_tickets",
  description: "Sucht Strafzettel nach Status, Kennzeichen oder Datumsbereich.",
  input_schema: {
    type: "object",
    properties: {
      status: { type: "string", enum: ["neu", "zugeordnet", "weiterbelastet", "bezahlt"] },
      plate: { type: "string" },
      from_date: { type: "string", description: "YYYY-MM-DD (offense_date >=)" },
      to_date: { type: "string", description: "YYYY-MM-DD (offense_date <=)" },
      limit: { type: "number" },
    },
  },
  handler: async (input, ctx) => {
    let q = ctx.admin.from("tickets").select("*").eq("org_id", ctx.org_id);
    if (input.status) q = q.eq("status", input.status);
    if (input.plate) {
      const p = normalizePlate(input.plate as string);
      q = q.eq("plate", p);
    }
    if (input.from_date) {
      const d = parseDate(input.from_date);
      if (d) q = q.gte("offense_date", d);
    }
    if (input.to_date) {
      const d = parseDate(input.to_date);
      if (d) q = q.lte("offense_date", d);
    }
    q = q.order("created_at", { ascending: false }).limit(Number(input.limit) || 20);
    const { data, error } = await q;
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: { count: data?.length ?? 0, tickets: data ?? [] } };
  },
};

// =========================================================
// 5) get_stats
// =========================================================
const getStats: Tool = {
  name: "get_stats",
  description: "Liefert Dashboard-Kennzahlen (Verträge nach Status, Strafzettel nach Status, Flottengröße).",
  input_schema: { type: "object", properties: {} },
  handler: async (_input, ctx) => {
    const [
      { count: vehicles },
      { count: contractsActive },
      { count: contractsClosed },
      { count: ticketsNew },
      { count: ticketsAssigned },
      { count: ticketsBilled },
      { count: ticketsPaid },
      { data: feeRows },
    ] = await Promise.all([
      ctx.admin.from("vehicles").select("*", { count: "exact", head: true }).eq("org_id", ctx.org_id),
      ctx.admin.from("contracts").select("*", { count: "exact", head: true }).eq("org_id", ctx.org_id).eq("status", "aktiv"),
      ctx.admin.from("contracts").select("*", { count: "exact", head: true }).eq("org_id", ctx.org_id).eq("status", "abgeschlossen"),
      ctx.admin.from("tickets").select("*", { count: "exact", head: true }).eq("org_id", ctx.org_id).eq("status", "neu"),
      ctx.admin.from("tickets").select("*", { count: "exact", head: true }).eq("org_id", ctx.org_id).eq("status", "zugeordnet"),
      ctx.admin.from("tickets").select("*", { count: "exact", head: true }).eq("org_id", ctx.org_id).eq("status", "weiterbelastet"),
      ctx.admin.from("tickets").select("*", { count: "exact", head: true }).eq("org_id", ctx.org_id).eq("status", "bezahlt"),
      ctx.admin
        .from("tickets")
        .select("processing_fee, fine_amount, status")
        .eq("org_id", ctx.org_id)
        .in("status", ["weiterbelastet", "bezahlt"]),
    ]);

    const fees = (feeRows ?? []).reduce((s, r) => s + Number((r as { processing_fee: number }).processing_fee || 0), 0);
    const volume = (feeRows ?? []).reduce(
      (s, r) =>
        s +
        Number((r as { processing_fee: number }).processing_fee || 0) +
        Number((r as { fine_amount: number }).fine_amount || 0),
      0
    );

    return {
      ok: true,
      data: {
        stats: {
          vehicles_total: vehicles ?? 0,
          contracts_active: contractsActive ?? 0,
          contracts_closed: contractsClosed ?? 0,
          tickets_new: ticketsNew ?? 0,
          tickets_assigned: ticketsAssigned ?? 0,
          tickets_billed: ticketsBilled ?? 0,
          tickets_paid: ticketsPaid ?? 0,
          processing_fees_eur: Number(fees.toFixed(2)),
          total_volume_eur: Number(volume.toFixed(2)),
        },
      },
    };
  },
};

// =========================================================
// 6) find_driver_for_date
// =========================================================
const findDriverForDate: Tool = {
  name: "find_driver_for_date",
  description:
    "Findet den Mieter eines Fahrzeugs an einem bestimmten Datum (Kennzeichen + Datum → Mietvertrag).",
  input_schema: {
    type: "object",
    properties: {
      plate: { type: "string" },
      date: { type: "string", description: "YYYY-MM-DD" },
    },
    required: ["plate", "date"],
  },
  handler: async (input, ctx) => {
    const plate = normalizePlate(input.plate as string);
    const date = parseDate(input.date);
    if (!date) return { ok: false, error: "Ungültiges Datum" };

    const { data } = await ctx.admin
      .from("contracts")
      .select("*")
      .eq("org_id", ctx.org_id)
      .eq("plate", plate)
      .lte("pickup_date", date)
      .order("pickup_date", { ascending: false });

    const match = (data ?? []).find((c) => {
      const end = (c as { actual_return_date?: string; return_date: string }).actual_return_date ?? c.return_date;
      return end >= date;
    });

    if (!match) return { ok: true, data: { found: false, query: { plate, date } } };
    return { ok: true, data: { found: true, contract: match } };
  },
};

// =========================================================
// 7) get_decommission_alerts
// =========================================================
const getDecommissionAlerts: Tool = {
  name: "get_decommission_alerts",
  description:
    "Liefert die Liste der Fahrzeuge, die bald ausgesteuert werden müssen (Aussteuerungsdatum innerhalb des Fensters). Default: 21 Tage. Verwende dieses Tool wenn der Nutzer fragt, welche Autos demnächst aus der Flotte fliegen, ausgesteuert werden, abgemeldet werden müssen oder das 6-Monats-Limit erreichen.",
  input_schema: {
    type: "object",
    properties: {
      window_days: {
        type: "number",
        description:
          "Wie viele Tage in die Zukunft geschaut wird. Default 21. Auch überfällige Fahrzeuge werden immer mitgeliefert.",
      },
    },
  },
  handler: async (input, ctx) => {
    const windowDays = typeof input.window_days === "number" ? input.window_days : 21;
    const today = new Date().toISOString().slice(0, 10);
    const upper = new Date();
    upper.setDate(upper.getDate() + windowDays);
    const upperIso = upper.toISOString().slice(0, 10);

    const { data, error } = await ctx.admin
      .from("vehicles")
      .select("*")
      .eq("org_id", ctx.org_id)
      .not("decommission_date", "is", null)
      .lte("decommission_date", upperIso)
      .order("decommission_date", { ascending: true });

    if (error) return { ok: false, error: error.message };

    const vehicles = (data ?? []) as Vehicle[];
    const enriched = vehicles.map((v) => {
      const info = computeDecommission(v);
      return {
        id: v.id,
        plate: v.plate,
        vehicle_type: v.vehicle_type,
        first_registration: v.first_registration,
        decommission_date: v.decommission_date,
        days_left: info.daysLeft,
        level: info.level,
        status: info.label,
      };
    });

    return {
      ok: true,
      data: {
        count: enriched.length,
        window_days: windowDays,
        today,
        vehicles: enriched,
      },
    };
  },
};

// =========================================================
// 8) find_available_vehicles
// =========================================================
const findAvailableVehicles: Tool = {
  name: "find_available_vehicles",
  description:
    "Findet Fahrzeuge die in einem Zeitraum nicht vermietet sind (also für eine neue Buchung verfügbar). Verwende dies wenn der Nutzer fragt welche Autos an einem bestimmten Tag oder Zeitraum frei sind. Mindestens `from` muss gesetzt sein. Wenn `to` weggelassen wird, prüft das Tool nur diesen einen Tag.",
  input_schema: {
    type: "object",
    properties: {
      from: { type: "string", description: "Startdatum YYYY-MM-DD (inklusive)" },
      to: { type: "string", description: "Enddatum YYYY-MM-DD (inklusive). Default = from." },
    },
    required: ["from"],
  },
  handler: async (input, ctx) => {
    const from = parseDate(input.from);
    const to = parseDate(input.to) ?? from;
    if (!from || !to) return { ok: false, error: "Ungültiges Datumsformat" };
    if (to < from) return { ok: false, error: "Enddatum vor Startdatum" };

    const [{ data: vehiclesData }, { data: contractsData }] = await Promise.all([
      ctx.admin
        .from("vehicles")
        .select("id, plate, vehicle_type, color, decommission_date")
        .eq("org_id", ctx.org_id)
        .order("plate", { ascending: true }),
      ctx.admin
        .from("contracts")
        .select("plate, pickup_date, return_date, actual_return_date, renter_name, contract_nr, status")
        .eq("org_id", ctx.org_id)
        .neq("status", "storniert")
        .lte("pickup_date", to),
    ]);

    type ContractRow = {
      plate: string;
      pickup_date: string;
      return_date: string;
      actual_return_date: string | null;
      renter_name: string;
      contract_nr: string;
      status: string;
    };
    const allContracts = (contractsData ?? []) as ContractRow[];

    // Vertrag belegt einen Tag X wenn pickup_date <= X <= COALESCE(actual_return_date, return_date)
    const overlaps = (c: ContractRow): boolean => {
      const end = c.actual_return_date ?? c.return_date;
      return c.pickup_date <= to && end >= from;
    };

    const blockedByPlate = new Map<string, ContractRow[]>();
    for (const c of allContracts) {
      if (!overlaps(c)) continue;
      const list = blockedByPlate.get(c.plate) ?? [];
      list.push(c);
      blockedByPlate.set(c.plate, list);
    }

    const vehicles = (vehiclesData ?? []) as Array<{
      id: string;
      plate: string;
      vehicle_type: string | null;
      color: string | null;
      decommission_date: string | null;
    }>;

    const available = vehicles
      .filter((v) => !blockedByPlate.has(v.plate))
      .map((v) => ({
        id: v.id,
        plate: v.plate,
        vehicle_type: v.vehicle_type,
        color: v.color,
        decommission_warning:
          v.decommission_date != null && v.decommission_date <= to ? v.decommission_date : null,
      }));

    const blocked = vehicles
      .filter((v) => blockedByPlate.has(v.plate))
      .map((v) => {
        const conflicts = blockedByPlate.get(v.plate) ?? [];
        return {
          plate: v.plate,
          vehicle_type: v.vehicle_type,
          conflicts: conflicts.map((c) => ({
            contract_nr: c.contract_nr,
            renter_name: c.renter_name,
            pickup_date: c.pickup_date,
            return_date: c.actual_return_date ?? c.return_date,
          })),
        };
      });

    return {
      ok: true,
      data: {
        range: { from, to },
        available_count: available.length,
        blocked_count: blocked.length,
        available,
        blocked,
      },
    };
  },
};

// =========================================================
// 9) assign_ticket_to_contract
// =========================================================
const assignTicketToContract: Tool = {
  name: "assign_ticket_to_contract",
  description:
    "Ordnet einen Strafzettel manuell einem Mietvertrag zu — übernimmt renter_name und renter_email vom Vertrag, setzt status='zugeordnet'. Verwende dies wenn der Nutzer explizit eine Zuordnung verlangt (z.B. 'Ordne Strafzettel KP-405715 dem Vertrag MV-2026-8541 zu') oder wenn das automatische Matching scheiterte und der Nutzer den richtigen Vertrag nennt. Ticket und Vertrag werden über ihre Nummer (ticket_nr / contract_nr) ODER über ihre UUID identifiziert.",
  input_schema: {
    type: "object",
    properties: {
      ticket: {
        type: "string",
        description: "Strafzettel-Nr (z.B. 'KP-405715') oder UUID des Tickets",
      },
      contract: {
        type: "string",
        description: "Vertrags-Nr (z.B. 'MV-2026-8541') oder UUID des Vertrags",
      },
    },
    required: ["ticket", "contract"],
  },
  handler: async (input, ctx) => {
    const ticketKey = String(input.ticket || "").trim();
    const contractKey = String(input.contract || "").trim();
    if (!ticketKey || !contractKey) {
      return { ok: false, error: "ticket und contract sind Pflichtfelder" };
    }

    const isUuid = (s: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

    const ticketQuery = isUuid(ticketKey)
      ? ctx.admin.from("tickets").select("*").eq("id", ticketKey)
      : ctx.admin.from("tickets").select("*").eq("ticket_nr", ticketKey);
    const { data: tickets } = await ticketQuery.eq("org_id", ctx.org_id).limit(1);
    const ticket = (tickets ?? [])[0];
    if (!ticket) {
      return { ok: false, error: `Strafzettel '${ticketKey}' nicht gefunden` };
    }

    const contractQuery = isUuid(contractKey)
      ? ctx.admin.from("contracts").select("*").eq("id", contractKey)
      : ctx.admin.from("contracts").select("*").eq("contract_nr", contractKey);
    const { data: contracts } = await contractQuery.eq("org_id", ctx.org_id).limit(1);
    const contract = (contracts ?? [])[0];
    if (!contract) {
      return { ok: false, error: `Vertrag '${contractKey}' nicht gefunden` };
    }

    const { data: updated, error } = await ctx.admin
      .from("tickets")
      .update({
        contract_id: contract.id,
        renter_name: contract.renter_name,
        renter_email: contract.renter_email,
        status: "zugeordnet",
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticket.id)
      .eq("org_id", ctx.org_id)
      .select("id, ticket_nr, status, renter_name, renter_email, contract_id")
      .single();
    if (error) return { ok: false, error: error.message };

    await ctx.admin.from("ticket_logs").insert({
      ticket_id: ticket.id,
      action: "matched",
      details: {
        renter_name: contract.renter_name,
        contract_id: contract.id,
        contract_nr: contract.contract_nr,
        manual: true,
      },
    });

    return {
      ok: true,
      data: {
        ticket: updated,
        contract: {
          id: contract.id,
          contract_nr: contract.contract_nr,
          plate: contract.plate,
          renter_name: contract.renter_name,
        },
      },
    };
  },
};

export const TOOLS: Tool[] = [
  createContract,
  createVehicle,
  searchContracts,
  searchTickets,
  getStats,
  findDriverForDate,
  getDecommissionAlerts,
  findAvailableVehicles,
  assignTicketToContract,
];

export const TOOLS_FOR_API = TOOLS.map((t) => ({
  name: t.name,
  description: t.description,
  input_schema: t.input_schema,
}));

export const handleTool = async (
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<ToolResult> => {
  const t = TOOLS.find((x) => x.name === name);
  if (!t) return { ok: false, error: `Unbekanntes Tool: ${name}` };
  try {
    return await t.handler(input, ctx);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
};
