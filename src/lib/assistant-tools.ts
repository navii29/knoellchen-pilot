import type { SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { hashPassword } from "./portal-auth";
import { nextContractNr } from "./contract-utils";
import { computeDecommission } from "./decommission";
import { computeReturnSummary } from "./km";
import { normalizePlate } from "./plate";
import type { Vehicle } from "./types";
import {
  EVENT_TYPE_META,
  computeDue,
  type VehicleEvent,
  type VehicleEventType,
} from "./vehicle-events";
import { calculateOptimalPrice } from "./pricing";
import type { PricingRule } from "./types";
import {
  TIRE_TYPE_META,
  minTread,
  seasonMismatch,
  type VehicleTire,
} from "./tires";
import {
  PARTNER_TYPE_META,
  calculateCommission,
  contractDays,
  type SalesPartner,
} from "./partners";
import {
  computeFleetMargin,
  lastNDaysIso,
  previousPeriodIso,
} from "./margin";
import type { Contract } from "./types";

export type ToolContext = {
  org_id: string;
  admin: SupabaseClient;
  isOwner: boolean; // Mitarbeiter (false) bekommen keine Margen-/Partner-Tools/-Daten
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
    // insert statt upsert: ein bestehendes Fahrzeug darf NICHT blind (ggf. mit
    // leeren Werten) ueberschrieben werden. Nur gesetzte Felder schreiben.
    const row: Record<string, unknown> = { org_id: ctx.org_id, plate };
    const vt =
      typeof input.vehicle_type === "string" ? input.vehicle_type.trim() : "";
    const col = typeof input.color === "string" ? input.color.trim() : "";
    if (vt) row.vehicle_type = vt;
    if (col) row.color = col;
    const { data, error } = await ctx.admin
      .from("vehicles")
      .insert(row)
      .select("id, plate, vehicle_type, color")
      .single();
    if (error) {
      if (error.code === "23505")
        return { ok: false, error: "Kennzeichen ist bereits an einem Fahrzeug vergeben." };
      return { ok: false, error: error.message };
    }
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
    // Mitarbeiter sehen keine Partner-Verrechnung.
    const contracts = ctx.isOwner
      ? data ?? []
      : (data ?? []).map((c) => ({
          ...c,
          partner_purchase_price: null,
          partner_selling_price: null,
          partner_commission: null,
        }));
    return { ok: true, data: { count: contracts.length, contracts } };
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
    // Mitarbeiter sehen keine Partner-Verrechnung.
    const contract = ctx.isOwner
      ? match
      : {
          ...match,
          partner_purchase_price: null,
          partner_selling_price: null,
          partner_commission: null,
        };
    return { ok: true, data: { found: true, contract } };
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

// =========================================================
// 10) process_return
// =========================================================
const processReturn: Tool = {
  name: "process_return",
  description:
    "Verarbeitet die Rückgabe eines Mietvertrags: Status auf 'abgeschlossen' setzen, Rückgabedatum + Kilometerstand erfassen, taggenau Mehrkilometer berechnen (anteilig auf Inklusivkilometer pro Monat). Verwende dies wenn der Nutzer sagt 'Rückgabe für Vertrag X mit Kilometerstand Y' oder ähnlich. Wenn kein Datum angegeben wird, nimm heute. Vertrag wird per contract_nr ODER UUID identifiziert.",
  input_schema: {
    type: "object",
    properties: {
      contract: {
        type: "string",
        description: "Vertrags-Nr (z.B. 'MV-2026-8541') oder UUID",
      },
      km_return: {
        type: "number",
        description: "Kilometerstand bei Rückgabe",
      },
      actual_return_date: {
        type: "string",
        description: "YYYY-MM-DD. Wenn weggelassen: heute.",
      },
    },
    required: ["contract", "km_return"],
  },
  handler: async (input, ctx) => {
    const contractKey = String(input.contract || "").trim();
    const kmReturnRaw = input.km_return;
    if (!contractKey || kmReturnRaw == null) {
      return { ok: false, error: "contract und km_return sind Pflichtfelder" };
    }
    const kmReturn = Number(kmReturnRaw);
    if (!Number.isFinite(kmReturn)) {
      return { ok: false, error: "km_return ist keine gültige Zahl" };
    }

    const isUuid = (s: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    const cq = isUuid(contractKey)
      ? ctx.admin.from("contracts").select("*").eq("id", contractKey)
      : ctx.admin.from("contracts").select("*").eq("contract_nr", contractKey);
    const { data: contracts } = await cq.eq("org_id", ctx.org_id).limit(1);
    const contract = (contracts ?? [])[0];
    if (!contract) {
      return { ok: false, error: `Vertrag '${contractKey}' nicht gefunden` };
    }

    const actualReturn =
      typeof input.actual_return_date === "string" && input.actual_return_date.trim()
        ? parseDate(input.actual_return_date) || new Date().toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

    // Vehicle für Inklusiv-km + Preis
    let pricePerKm: number | null = null;
    let inclusiveKmMonth: number | null = null;
    if (contract.plate) {
      const { data: v } = await ctx.admin
        .from("vehicles")
        .select("extra_km_price, inclusive_km_month")
        .eq("org_id", ctx.org_id)
        .eq("plate", contract.plate)
        .maybeSingle();
      if (v?.extra_km_price != null) pricePerKm = Number(v.extra_km_price);
      if (v?.inclusive_km_month != null) inclusiveKmMonth = Number(v.inclusive_km_month);
    }

    const summary = computeReturnSummary({
      pickupDate: contract.pickup_date,
      plannedReturnDate: contract.return_date,
      actualReturnDate: actualReturn,
      kmPickup: contract.km_pickup,
      kmReturn,
      inclusiveKmMonth,
      kmLimitOverride: contract.km_limit,
      pricePerKm,
    });

    const { data: updated, error } = await ctx.admin
      .from("contracts")
      .update({
        status: "abgeschlossen",
        actual_return_date: actualReturn,
        km_return: kmReturn,
        actual_days: summary.actualDays,
        actual_km_allowed: summary.allowedKm,
        km_driven: summary.drivenKm,
        km_excess: summary.excessKm,
        extra_km_cost: summary.cost,
        updated_at: new Date().toISOString(),
      })
      .eq("id", contract.id)
      .eq("org_id", ctx.org_id)
      .select("id, contract_nr, plate, renter_name, pickup_date, return_date, actual_return_date, status")
      .single();
    if (error) return { ok: false, error: error.message };

    return {
      ok: true,
      data: {
        contract: updated,
        summary,
      },
    };
  },
};

// =========================================================
// 13) get_price_recommendation
// =========================================================
const getPriceRecommendation: Tool = {
  name: "get_price_recommendation",
  description:
    "Berechnet den optimalen Tagespreis für ein Fahrzeug an einem bestimmten Datum. Berücksichtigt aktive Preisregeln (Saison, Wochentag, Nachfrage/Auslastung, Pauschal). Liefert Basispreis, alle angewendeten Anpassungen mit Prozent und Eurobetrag, den Endpreis und eine kurze Begründung. Verwende dieses Tool wenn der Nutzer fragt: 'Was sollte X heute kosten?', 'Was ist der beste Preis für ... am Freitag?', 'Wie viel Aufschlag bei hoher Nachfrage?', 'Welcher Preis am Wochenende für M-OL 1001?'.",
  input_schema: {
    type: "object",
    properties: {
      plate: {
        type: "string",
        description:
          "Kennzeichen des Fahrzeugs, z. B. 'M-OL 1001'. Leerzeichen, Bindestriche und Groß/Kleinschreibung sind egal.",
      },
      date: {
        type: "string",
        description:
          "Datum im Format YYYY-MM-DD. Wenn weggelassen wird das heutige Datum verwendet. Akzeptiert auch deutsche Formate wie 14.05.2026.",
      },
    },
    required: ["plate"],
  },
  handler: async (input, ctx) => {
    const plateRaw = input.plate;
    if (typeof plateRaw !== "string" || !plateRaw.trim()) {
      return { ok: false, error: "Kennzeichen fehlt." };
    }
    const plate = normalizePlate(plateRaw);
    if (!plate) return { ok: false, error: `Kennzeichen ungültig: ${plateRaw}` };

    const dateInput = parseDate(input.date) ?? new Date().toISOString().slice(0, 10);

    const { data: vehicle, error: vErr } = await ctx.admin
      .from("vehicles")
      .select(
        "id, plate, manufacturer, model, vehicle_type, daily_rate, base_daily_rate"
      )
      .eq("org_id", ctx.org_id)
      .eq("plate", plate)
      .maybeSingle();
    if (vErr) return { ok: false, error: vErr.message };
    if (!vehicle)
      return { ok: false, error: `Kein Fahrzeug mit Kennzeichen ${plate} gefunden.` };

    const [{ data: rulesRaw }, { count: totalFleet }, { count: bookedCount }] =
      await Promise.all([
        ctx.admin
          .from("pricing_rules")
          .select("*")
          .eq("org_id", ctx.org_id)
          .eq("active", true),
        ctx.admin
          .from("vehicles")
          .select("*", { count: "exact", head: true })
          .eq("org_id", ctx.org_id),
        ctx.admin
          .from("contracts")
          .select("*", { count: "exact", head: true })
          .eq("org_id", ctx.org_id)
          .eq("status", "aktiv")
          .lte("pickup_date", dateInput)
          .gte("return_date", dateInput),
      ]);

    const total = totalFleet ?? 0;
    const free = Math.max(0, total - (bookedCount ?? 0));

    const recommendation = calculateOptimalPrice({
      vehicle: vehicle as { daily_rate: number | null; base_daily_rate: number | null },
      date: dateInput,
      rules: (rulesRaw ?? []) as PricingRule[],
      freeFleetCount: free,
      totalFleetCount: total,
    });

    return {
      ok: true,
      data: {
        vehicle: {
          id: vehicle.id,
          plate: vehicle.plate,
          label:
            [vehicle.manufacturer, vehicle.model].filter(Boolean).join(" ") ||
            vehicle.vehicle_type ||
            null,
        },
        date: recommendation.date,
        base_price_eur: recommendation.base_price,
        base_source: recommendation.base_source,
        adjustments: recommendation.adjustments,
        total_percent: recommendation.total_percent,
        final_price_eur: recommendation.final_price,
        free_fleet: free,
        total_fleet: total,
        explanation: recommendation.explanation,
      },
    };
  },
};

// =========================================================
// 12) get_vehicle_location
// =========================================================
const getVehicleLocation: Tool = {
  name: "get_vehicle_location",
  description:
    "Liefert die zuletzt bekannte GPS-Position eines Fahrzeugs anhand des Kennzeichens (aus dem internen Cache, der durch die Echoes.solutions-Sync befüllt wird). Gibt Latitude, Longitude, Zeitpunkt der Aufnahme und einen OpenStreetMap-Link zurück. Verwende dieses Tool wenn der Nutzer fragt: 'Wo ist M-OL 1001?', 'Wo steht das Auto X gerade?', 'Letzte Position von ...', 'Wann war das Auto zuletzt online?'.",
  input_schema: {
    type: "object",
    properties: {
      plate: {
        type: "string",
        description:
          "Kennzeichen des Fahrzeugs, z. B. 'M-OL 1001'. Leerzeichen, Bindestriche und Groß/Kleinschreibung sind egal.",
      },
    },
    required: ["plate"],
  },
  handler: async (input, ctx) => {
    const plateRaw = input.plate;
    if (typeof plateRaw !== "string" || !plateRaw.trim()) {
      return { ok: false, error: "Kennzeichen fehlt." };
    }
    const plate = normalizePlate(plateRaw);
    if (!plate) return { ok: false, error: `Kennzeichen ungültig: ${plateRaw}` };

    const { data: vehicle, error } = await ctx.admin
      .from("vehicles")
      .select(
        "id, plate, manufacturer, model, vehicle_type, echoes_device_id, last_gps_lat, last_gps_lng, last_gps_update"
      )
      .eq("org_id", ctx.org_id)
      .eq("plate", plate)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!vehicle)
      return { ok: false, error: `Kein Fahrzeug mit Kennzeichen ${plate} gefunden.` };

    if (!vehicle.echoes_device_id) {
      return {
        ok: true,
        data: {
          plate: vehicle.plate,
          tracker_assigned: false,
          message:
            "Diesem Fahrzeug ist kein GPS-Tracker zugeordnet. Die Tracker-ID kann im Fahrzeug-Formular ergänzt werden.",
        },
      };
    }

    const lat = vehicle.last_gps_lat;
    const lng = vehicle.last_gps_lng;
    const updatedAt = vehicle.last_gps_update;
    if (lat == null || lng == null) {
      return {
        ok: true,
        data: {
          plate: vehicle.plate,
          tracker_assigned: true,
          tracker_id: vehicle.echoes_device_id,
          has_position: false,
          message:
            "Tracker ist zugeordnet, es wurde aber noch keine Position empfangen. Sync ausführen.",
        },
      };
    }

    const minutesAgo = updatedAt
      ? Math.round((Date.now() - new Date(updatedAt).getTime()) / 60_000)
      : null;

    return {
      ok: true,
      data: {
        plate: vehicle.plate,
        label:
          [vehicle.manufacturer, vehicle.model].filter(Boolean).join(" ") ||
          vehicle.vehicle_type ||
          null,
        tracker_assigned: true,
        tracker_id: vehicle.echoes_device_id,
        has_position: true,
        latitude: Number(lat),
        longitude: Number(lng),
        recorded_at: updatedAt,
        minutes_ago: minutesAgo,
        map_url: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`,
      },
    };
  },
};

// =========================================================
// 11) get_vehicle_history
// =========================================================
const getVehicleHistory: Tool = {
  name: "get_vehicle_history",
  description:
    "Liefert die Wartungs- und Service-Historie eines Fahrzeugs anhand des Kennzeichens, inklusive Service, Reifenwechsel, TÜV/HU, Reparaturen, Versicherung und sonstigen Ereignissen. Für jeden Eintrag werden Datum, Kosten, Anbieter/Werkstatt und der nächste fällige Termin (Datum + Tage bis dahin + Ampel-Status) zurückgegeben. Verwende dieses Tool, wenn der Nutzer fragt: 'Wann war der letzte Service von …', 'Wann ist der TÜV von … fällig', 'Was ist die Historie von …', 'Wann wurden zuletzt die Reifen gewechselt' oder 'Welche Reparaturen wurden an … gemacht'. Optional kann nach Typ gefiltert werden.",
  input_schema: {
    type: "object",
    properties: {
      plate: {
        type: "string",
        description:
          "Kennzeichen des Fahrzeugs, z. B. 'M-OL 1001'. Leerzeichen, Bindestriche und Groß/Kleinschreibung sind egal.",
      },
      event_type: {
        type: "string",
        enum: ["service", "tires", "tuev", "repair", "insurance", "other"],
        description:
          "Optional: Nur Einträge dieses Typs. Beispiel: 'tuev' für reine TÜV-Abfrage.",
      },
      limit: {
        type: "number",
        description: "Maximale Anzahl Einträge (Default 10, max 50).",
      },
    },
    required: ["plate"],
  },
  handler: async (input, ctx) => {
    const plateRaw = input.plate;
    if (typeof plateRaw !== "string" || !plateRaw.trim()) {
      return { ok: false, error: "Kennzeichen fehlt." };
    }
    const plate = normalizePlate(plateRaw);
    if (!plate) return { ok: false, error: `Kennzeichen ungültig: ${plateRaw}` };

    const eventType = typeof input.event_type === "string" ? input.event_type : null;
    const limit = Math.min(
      Math.max(typeof input.limit === "number" ? input.limit : 10, 1),
      50
    );

    const { data: vehicle, error: vErr } = await ctx.admin
      .from("vehicles")
      .select("id, plate, manufacturer, model, vehicle_type")
      .eq("org_id", ctx.org_id)
      .eq("plate", plate)
      .maybeSingle();
    if (vErr) return { ok: false, error: vErr.message };
    if (!vehicle)
      return {
        ok: false,
        error: `Kein Fahrzeug mit Kennzeichen ${plate} gefunden.`,
      };

    let query = ctx.admin
      .from("vehicle_events")
      .select("*")
      .eq("org_id", ctx.org_id)
      .eq("vehicle_id", vehicle.id)
      .order("date", { ascending: false })
      .limit(limit);
    if (eventType) query = query.eq("type", eventType);

    const { data: events, error: eErr } = await query;
    if (eErr) return { ok: false, error: eErr.message };

    const enriched = ((events ?? []) as VehicleEvent[]).map((ev) => {
      const due = ev.next_due_date ? computeDue(ev.next_due_date) : null;
      return {
        id: ev.id,
        type: ev.type,
        type_label: EVENT_TYPE_META[ev.type as VehicleEventType].label,
        date: ev.date,
        km_at_event: ev.km_at_event,
        description: ev.description,
        cost_eur: ev.cost,
        provider: ev.provider,
        next_due_date: ev.next_due_date,
        next_due_km: ev.next_due_km,
        next_due_days_left: due?.daysLeft ?? null,
        next_due_level: due?.level ?? null,
        next_due_status: due?.label ?? null,
        has_document: !!ev.document_path,
      };
    });

    // Quick lookups for the common questions
    const typedEvents = (events ?? []) as VehicleEvent[];
    const lastService = typedEvents.find((e) => e.type === "service") ?? null;
    const tuevWithDue = typedEvents
      .filter((e) => e.type === "tuev" && e.next_due_date)
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0];

    return {
      ok: true,
      data: {
        vehicle: {
          id: vehicle.id,
          plate: vehicle.plate,
          label:
            [vehicle.manufacturer, vehicle.model].filter(Boolean).join(" ") ||
            vehicle.vehicle_type ||
            null,
        },
        count: enriched.length,
        filter_type: eventType,
        events: enriched,
        last_service_date: lastService?.date ?? null,
        next_tuev: tuevWithDue
          ? {
              due_date: tuevWithDue.next_due_date,
              days_left: computeDue(tuevWithDue.next_due_date).daysLeft,
              status: computeDue(tuevWithDue.next_due_date).label,
            }
          : null,
      },
    };
  },
};

// =========================================================
// 14) get_tire_status — aktuelle Reifen eines Fahrzeugs
// =========================================================
const getTireStatus: Tool = {
  name: "get_tire_status",
  description:
    "Liefert die aktuell montierten Reifen eines Fahrzeugs anhand des Kennzeichens — Typ (Sommer/Winter/Ganzjahres), Marke, Modell, Größe, Profiltiefe je Position (mm) und ob ein Wechsel empfohlen ist (< 3 mm) oder die Saison nicht passt. Verwende das Tool wenn der Nutzer fragt: 'Welche Reifen hat M-OL 1001?', 'Wie ist die Profiltiefe von ...?', 'Hat das Auto Sommer- oder Winterreifen?'.",
  input_schema: {
    type: "object",
    properties: {
      plate: {
        type: "string",
        description: "Kennzeichen, z. B. 'M-OL 1001'.",
      },
    },
    required: ["plate"],
  },
  handler: async (input, ctx) => {
    const plateRaw = input.plate;
    if (typeof plateRaw !== "string" || !plateRaw.trim())
      return { ok: false, error: "Kennzeichen fehlt." };
    const plate = normalizePlate(plateRaw);
    if (!plate) return { ok: false, error: `Kennzeichen ungültig: ${plateRaw}` };

    const { data: vehicle } = await ctx.admin
      .from("vehicles")
      .select("id, plate, manufacturer, model, vehicle_type")
      .eq("org_id", ctx.org_id)
      .eq("plate", plate)
      .maybeSingle();
    if (!vehicle)
      return { ok: false, error: `Kein Fahrzeug mit Kennzeichen ${plate} gefunden.` };

    const { data: tire } = await ctx.admin
      .from("vehicle_tires")
      .select("*")
      .eq("vehicle_id", vehicle.id)
      .eq("org_id", ctx.org_id)
      .eq("is_current", true)
      .maybeSingle();
    if (!tire) {
      return {
        ok: true,
        data: {
          plate: vehicle.plate,
          tire_recorded: false,
          message: "Für dieses Fahrzeug ist kein aktueller Reifensatz dokumentiert.",
        },
      };
    }
    const t = tire as VehicleTire;
    const min = minTread(t);
    const wrong = seasonMismatch(t.type);
    return {
      ok: true,
      data: {
        plate: vehicle.plate,
        tire_recorded: true,
        type: t.type,
        type_label: TIRE_TYPE_META[t.type].label,
        brand: t.brand,
        model: t.model,
        size: t.size,
        dot_number: t.dot_number,
        tread_depths_mm: {
          front_left: t.tread_depth_fl,
          front_right: t.tread_depth_fr,
          rear_left: t.tread_depth_rl,
          rear_right: t.tread_depth_rr,
        },
        min_tread_mm: min,
        replacement_recommended: min != null && min < 3,
        season_mismatch: wrong,
        season_advice:
          wrong === "summer_in_winter"
            ? "Sommerreifen montiert in Wintermonat — Winterreifen empfohlen."
            : wrong === "winter_in_summer"
            ? "Winterreifen montiert in Sommermonat — Sommerreifen empfohlen."
            : null,
        mounted_at: t.mounted_at,
        km_at_mount: t.km_at_mount,
      },
    };
  },
};

// =========================================================
// 15) get_low_tread_vehicles — Fahrzeuge mit Profiltiefe unter Schwelle
// =========================================================
const getLowTreadVehicles: Tool = {
  name: "get_low_tread_vehicles",
  description:
    "Liefert die Liste aller Fahrzeuge der Flotte, bei denen mindestens ein Reifen weniger als die angegebene Profiltiefe hat (Default 3 mm). Verwende das Tool wenn der Nutzer fragt: 'Welche Autos brauchen neue Reifen?', 'Wo ist die Profiltiefe niedrig?'.",
  input_schema: {
    type: "object",
    properties: {
      threshold_mm: {
        type: "number",
        description: "Schwellenwert in mm (Default 3).",
      },
    },
  },
  handler: async (input, ctx) => {
    const threshold =
      typeof input.threshold_mm === "number" ? input.threshold_mm : 3;
    const { data: tires } = await ctx.admin
      .from("vehicle_tires")
      .select("*, vehicles!inner(id, plate, manufacturer, model, vehicle_type)")
      .eq("org_id", ctx.org_id)
      .eq("is_current", true);

    type Row = VehicleTire & {
      vehicles:
        | {
            id: string;
            plate: string;
            manufacturer: string | null;
            model: string | null;
            vehicle_type: string | null;
          }
        | Array<{
            id: string;
            plate: string;
            manufacturer: string | null;
            model: string | null;
            vehicle_type: string | null;
          }>
        | null;
    };

    const items = ((tires ?? []) as unknown as Row[])
      .map((t) => {
        const v = Array.isArray(t.vehicles) ? t.vehicles[0] ?? null : t.vehicles;
        const min = minTread(t);
        return { tire: t, vehicle: v, min };
      })
      .filter((x) => x.vehicle && x.min != null && x.min < threshold)
      .map((x) => ({
        plate: x.vehicle!.plate,
        label:
          [x.vehicle!.manufacturer, x.vehicle!.model].filter(Boolean).join(" ") ||
          x.vehicle!.vehicle_type ||
          null,
        tire_type: x.tire.type,
        min_tread_mm: x.min,
      }))
      .sort((a, b) => (a.min_tread_mm ?? 99) - (b.min_tread_mm ?? 99));

    return {
      ok: true,
      data: {
        threshold_mm: threshold,
        count: items.length,
        vehicles: items,
      },
    };
  },
};

// =========================================================
// 16) get_vehicles_by_tire_type — Filter nach aktuellem Reifentyp
// =========================================================
const getVehiclesByTireType: Tool = {
  name: "get_vehicles_by_tire_type",
  description:
    "Liefert alle Fahrzeuge der Flotte, die aktuell den angegebenen Reifentyp montiert haben. Erlaubte Werte: 'summer' (Sommer), 'winter' (Winter), 'allseason' (Ganzjahres). Verwende das Tool wenn der Nutzer fragt: 'Welche Autos haben noch Sommerreifen?', 'Welche brauchen den Winter-Wechsel?'.",
  input_schema: {
    type: "object",
    properties: {
      tire_type: {
        type: "string",
        enum: ["summer", "winter", "allseason"],
        description: "Reifentyp.",
      },
    },
    required: ["tire_type"],
  },
  handler: async (input, ctx) => {
    const t = input.tire_type;
    if (t !== "summer" && t !== "winter" && t !== "allseason") {
      return { ok: false, error: "Ungültiger Reifentyp." };
    }
    const { data: rows } = await ctx.admin
      .from("vehicle_tires")
      .select("type, vehicles!inner(id, plate, manufacturer, model, vehicle_type)")
      .eq("org_id", ctx.org_id)
      .eq("is_current", true)
      .eq("type", t);

    type Row = {
      type: string;
      vehicles:
        | {
            id: string;
            plate: string;
            manufacturer: string | null;
            model: string | null;
            vehicle_type: string | null;
          }
        | Array<{
            id: string;
            plate: string;
            manufacturer: string | null;
            model: string | null;
            vehicle_type: string | null;
          }>
        | null;
    };

    const items = ((rows ?? []) as unknown as Row[])
      .map((r) => (Array.isArray(r.vehicles) ? r.vehicles[0] ?? null : r.vehicles))
      .filter((v): v is NonNullable<typeof v> => !!v)
      .map((v) => ({
        plate: v.plate,
        label:
          [v.manufacturer, v.model].filter(Boolean).join(" ") ||
          v.vehicle_type ||
          null,
      }));

    return {
      ok: true,
      data: {
        tire_type: t,
        type_label: TIRE_TYPE_META[t].label,
        count: items.length,
        vehicles: items,
      },
    };
  },
};

// =========================================================
// 17) get_partner_commission
// =========================================================
const getPartnerCommission: Tool = {
  name: "get_partner_commission",
  description:
    "Liefert die Summe der Provisionen für einen Vertriebspartner in einem Zeitraum (Default: aktueller Monat). Zeigt Anzahl Verträge, Mietage, VK-Umsatz und Brutto-Provision. Verwende das Tool wenn der Nutzer fragt: 'Wie viel Provision hat Hotel X diesen Monat?', 'Welche Provision hat Check24 im Mai gemacht?'.",
  input_schema: {
    type: "object",
    properties: {
      partner_name: { type: "string", description: "Name oder Teil des Namens des Partners." },
      from: { type: "string", description: "Startdatum YYYY-MM-DD oder dd.mm.yyyy. Default: 1. des aktuellen Monats." },
      to: { type: "string", description: "Enddatum YYYY-MM-DD oder dd.mm.yyyy. Default: heute." },
    },
    required: ["partner_name"],
  },
  handler: async (input, ctx) => {
    const name = String(input.partner_name ?? "").trim();
    if (!name) return { ok: false, error: "Partnername fehlt." };

    const today = new Date();
    const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString().slice(0, 10);
    const from = parseDate(input.from) ?? defaultFrom;
    const to = parseDate(input.to) ?? today.toISOString().slice(0, 10);

    const { data: partners } = await ctx.admin
      .from("sales_partners")
      .select("*")
      .eq("org_id", ctx.org_id)
      .ilike("name", `%${name}%`)
      .limit(5);
    if (!partners || partners.length === 0)
      return { ok: false, error: `Kein Partner mit Namen „${name}" gefunden.` };
    const partner = partners[0] as SalesPartner;

    const { data: contracts } = await ctx.admin
      .from("contracts")
      .select(
        "contract_nr, plate, renter_name, pickup_date, return_date, actual_return_date, partner_purchase_price, partner_selling_price"
      )
      .eq("org_id", ctx.org_id)
      .eq("partner_id", partner.id)
      .gte("pickup_date", from)
      .lte("pickup_date", to);

    const items = (contracts ?? []).map((c) => {
      const days = contractDays({
        pickup_date: c.pickup_date,
        return_date: c.return_date,
        actual_return_date: c.actual_return_date,
      });
      const result = calculateCommission({
        partner,
        purchase_price_per_day: c.partner_purchase_price,
        selling_price_per_day: c.partner_selling_price,
        days,
      });
      return {
        contract_nr: c.contract_nr,
        plate: c.plate,
        renter_name: c.renter_name,
        days,
        commission_eur: result.commission_eur,
        selling_total: result.total_selling,
      };
    });

    const totalCommission = items.reduce((s, x) => s + x.commission_eur, 0);
    const totalSelling = items.reduce((s, x) => s + x.selling_total, 0);
    const totalDays = items.reduce((s, x) => s + x.days, 0);

    return {
      ok: true,
      data: {
        partner: { id: partner.id, name: partner.name, type: partner.type },
        period: { from, to },
        contract_count: items.length,
        total_days: totalDays,
        total_selling_eur: Math.round(totalSelling * 100) / 100,
        total_commission_eur: Math.round(totalCommission * 100) / 100,
        contracts: items,
      },
    };
  },
};

// =========================================================
// 18) get_partner_contracts
// =========================================================
const getPartnerContracts: Tool = {
  name: "get_partner_contracts",
  description:
    "Liefert die Liste aller Verträge die über einen bestimmten Vertriebspartner liefen, optional gefiltert nach Status. Verwende wenn der Nutzer fragt: 'Welche Verträge liefen über Check24?', 'Was hat Hotel X gebucht?'.",
  input_schema: {
    type: "object",
    properties: {
      partner_name: { type: "string", description: "Name oder Teil des Namens des Partners." },
      status: { type: "string", description: "Optional: 'aktiv' / 'abgeschlossen' / 'storniert'." },
      limit: { type: "number", description: "Max Anzahl (Default 20, max 100)." },
    },
    required: ["partner_name"],
  },
  handler: async (input, ctx) => {
    const name = String(input.partner_name ?? "").trim();
    if (!name) return { ok: false, error: "Partnername fehlt." };
    const status = typeof input.status === "string" ? input.status : null;
    const limit = Math.min(
      Math.max(typeof input.limit === "number" ? input.limit : 20, 1), 100
    );

    const { data: partners } = await ctx.admin
      .from("sales_partners")
      .select("id, name, type")
      .eq("org_id", ctx.org_id)
      .ilike("name", `%${name}%`)
      .limit(5);
    if (!partners || partners.length === 0)
      return { ok: false, error: `Kein Partner mit Namen „${name}" gefunden.` };
    const partner = partners[0];

    let q = ctx.admin
      .from("contracts")
      .select(
        "contract_nr, plate, vehicle_type, renter_name, pickup_date, return_date, status, partner_commission"
      )
      .eq("org_id", ctx.org_id)
      .eq("partner_id", partner.id)
      .order("pickup_date", { ascending: false })
      .limit(limit);
    if (status) q = q.eq("status", status);

    const { data } = await q;
    return {
      ok: true,
      data: { partner, count: (data ?? []).length, contracts: data ?? [] },
    };
  },
};

// =========================================================
// 19) get_top_partners
// =========================================================
const getTopPartners: Tool = {
  name: "get_top_partners",
  description:
    "Liefert die umsatzstärksten Vertriebspartner sortiert nach Anzahl vermittelter Verträge oder Provisionssumme. Verwende wenn der Nutzer fragt: 'Welcher Partner bringt die meisten Kunden?', 'Wer macht die höchste Provision?'.",
  input_schema: {
    type: "object",
    properties: {
      sort_by: {
        type: "string",
        enum: ["count", "commission"],
        description: "Sortierung: 'count' (Vertragsanzahl) oder 'commission' (Provisionssumme). Default count.",
      },
      from: { type: "string", description: "Optional Startdatum." },
      to: { type: "string", description: "Optional Enddatum." },
      limit: { type: "number", description: "Top N (Default 10)." },
    },
  },
  handler: async (input, ctx) => {
    const sortBy = input.sort_by === "commission" ? "commission" : "count";
    const limit = typeof input.limit === "number" ? input.limit : 10;
    const from = parseDate(input.from);
    const to = parseDate(input.to);

    let q = ctx.admin
      .from("contracts")
      .select("partner_id, partner_commission, sales_partners!inner(id, name, type)")
      .eq("org_id", ctx.org_id)
      .not("partner_id", "is", null);
    if (from) q = q.gte("pickup_date", from);
    if (to) q = q.lte("pickup_date", to);

    const { data: rows } = await q;

    const agg = new Map<
      string,
      { partner_id: string; name: string; type: string; count: number; commission: number }
    >();
    for (const row of (rows ?? []) as Array<{
      partner_id: string;
      partner_commission: number | null;
      sales_partners:
        | { id: string; name: string; type: string }
        | Array<{ id: string; name: string; type: string }>
        | null;
    }>) {
      const sp = Array.isArray(row.sales_partners)
        ? row.sales_partners[0]
        : row.sales_partners;
      if (!sp) continue;
      const cur = agg.get(row.partner_id) ?? {
        partner_id: row.partner_id,
        name: sp.name,
        type: sp.type,
        count: 0,
        commission: 0,
      };
      cur.count += 1;
      cur.commission += Number(row.partner_commission ?? 0);
      agg.set(row.partner_id, cur);
    }

    const list = Array.from(agg.values())
      .sort((a, b) =>
        sortBy === "commission" ? b.commission - a.commission : b.count - a.count
      )
      .slice(0, limit)
      .map((x) => ({
        ...x,
        type_label:
          PARTNER_TYPE_META[x.type as keyof typeof PARTNER_TYPE_META]?.label ?? x.type,
        commission: Math.round(x.commission * 100) / 100,
      }));

    return {
      ok: true,
      data: {
        sort_by: sortBy,
        period: { from, to },
        partner_count: list.length,
        partners: list,
      },
    };
  },
};

// Hilfsfunktion zum Laden der Fahrzeuge + Verträge im Zeitraum
const loadVehiclesAndContractsForMargin = async (
  ctx: ToolContext,
  from: string,
  to: string
) => {
  const [{ data: vehicles }, { data: contracts }] = await Promise.all([
    ctx.admin
      .from("vehicles")
      // onetime_cost_* + first_registration + decommission_date MÜSSEN mit dabei
      // sein, sonst rechnet effectiveCostDaily ohne umgelegte Einmalkosten und der
      // Assistent meldet eine zu hohe Marge, abweichend von Dashboard/PDF.
      .select(
        "id, plate, manufacturer, model, vehicle_type, cost_daily, cost_monthly, target_daily_rate, daily_rate, status, onetime_cost_supplier, onetime_cost_pickup, onetime_cost_return, first_registration, decommission_date"
      )
      .eq("org_id", ctx.org_id)
      .neq("status", "ausgesteuert"),
    ctx.admin
      .from("contracts")
      .select(
        "id, plate, vehicle_id, pickup_date, return_date, actual_return_date, daily_rate, status"
      )
      .eq("org_id", ctx.org_id)
      .lte("pickup_date", to)
      .gte("return_date", from),
  ]);
  return {
    vehicles: (vehicles ?? []) as unknown as Vehicle[],
    contracts: (contracts ?? []) as Contract[],
  };
};

// =========================================================
// 20) get_fleet_margin
// =========================================================
const getFleetMargin: Tool = {
  name: "get_fleet_margin",
  description:
    "Liefert die Marge der gesamten Flotte für einen Zeitraum (Default: letzte 7 Tage). Vergleicht mit der Vorperiode. Verwende wenn der Nutzer fragt: 'Wie ist die Marge diese Woche?', 'Was haben wir diesen Monat verdient?'.",
  input_schema: {
    type: "object",
    properties: {
      days: {
        type: "number",
        description: "Anzahl Tage rückwärts (Default 7).",
      },
      from: { type: "string", description: "Startdatum YYYY-MM-DD." },
      to: { type: "string", description: "Enddatum YYYY-MM-DD." },
    },
  },
  handler: async (input, ctx) => {
    const days = typeof input.days === "number" ? input.days : 7;
    const def = lastNDaysIso(days);
    const from = parseDate(input.from) ?? def.from;
    const to = parseDate(input.to) ?? def.to;

    const { vehicles, contracts } = await loadVehiclesAndContractsForMargin(
      ctx,
      from,
      to
    );
    const current = computeFleetMargin({ vehicles, contracts, from, to });

    const prev = previousPeriodIso(from, to);
    const { contracts: prevContracts } = await loadVehiclesAndContractsForMargin(
      ctx,
      prev.from,
      prev.to
    );
    const previous = computeFleetMargin({
      vehicles,
      contracts: prevContracts,
      from: prev.from,
      to: prev.to,
    });

    const delta = current.total_margin - previous.total_margin;
    const deltaPct =
      Math.abs(previous.total_margin) > 0.01
        ? (delta / Math.abs(previous.total_margin)) * 100
        : null;

    return {
      ok: true,
      data: {
        period: { from, to },
        vehicle_count: current.vehicle_count,
        rented_days: current.total_rented_days,
        possible_days: current.total_possible_days,
        ist_vk_eur: current.total_ist_vk,
        ek_eur: current.total_ek,
        margin_eur: current.total_margin,
        margin_pct: current.total_margin_pct,
        utilization_pct: current.avg_utilization_pct,
        previous_period: {
          from: prev.from,
          to: prev.to,
          margin_eur: previous.total_margin,
        },
        delta_eur: Math.round(delta * 100) / 100,
        delta_pct: deltaPct != null ? Math.round(deltaPct * 10) / 10 : null,
      },
    };
  },
};

// =========================================================
// 21) get_best_margin_vehicle
// =========================================================
const getBestMarginVehicle: Tool = {
  name: "get_best_margin_vehicle",
  description:
    "Liefert das Fahrzeug mit der höchsten Marge in einem Zeitraum. Verwende wenn der Nutzer fragt: 'Welches Auto hat die beste Marge?', 'Welcher verdient am meisten?'.",
  input_schema: {
    type: "object",
    properties: {
      days: { type: "number", description: "Anzahl Tage (Default 30)." },
      top: { type: "number", description: "Top N (Default 5)." },
    },
  },
  handler: async (input, ctx) => {
    const days = typeof input.days === "number" ? input.days : 30;
    const top = typeof input.top === "number" ? input.top : 5;
    const def = lastNDaysIso(days);
    const { vehicles, contracts } = await loadVehiclesAndContractsForMargin(
      ctx,
      def.from,
      def.to
    );
    const margin = computeFleetMargin({
      vehicles,
      contracts,
      from: def.from,
      to: def.to,
    });
    const sorted = [...margin.vehicles].sort((a, b) => b.margin_eur - a.margin_eur);
    return {
      ok: true,
      data: {
        period: def,
        vehicles: sorted.slice(0, top).map((v) => ({
          plate: v.plate,
          label: v.label,
          margin_eur: v.margin_eur,
          margin_pct: v.margin_pct,
          utilization_pct: v.utilization_pct,
          rented_days: v.rented_days,
        })),
      },
    };
  },
};

// =========================================================
// 22) get_worst_margin_vehicle
// =========================================================
const getWorstMarginVehicle: Tool = {
  name: "get_worst_margin_vehicle",
  description:
    "Liefert das Fahrzeug mit der schlechtesten Marge (am ehesten Verlustbringer). Verwende wenn der Nutzer fragt: 'Welches Auto lohnt sich nicht?', 'Welche machen Verlust?'.",
  input_schema: {
    type: "object",
    properties: {
      days: { type: "number", description: "Anzahl Tage (Default 30)." },
      top: { type: "number", description: "Top N (Default 5)." },
    },
  },
  handler: async (input, ctx) => {
    const days = typeof input.days === "number" ? input.days : 30;
    const top = typeof input.top === "number" ? input.top : 5;
    const def = lastNDaysIso(days);
    const { vehicles, contracts } = await loadVehiclesAndContractsForMargin(
      ctx,
      def.from,
      def.to
    );
    const margin = computeFleetMargin({
      vehicles,
      contracts,
      from: def.from,
      to: def.to,
    });
    const eligible = margin.vehicles.filter((v) => v.cost_daily != null);
    const sorted = eligible.sort((a, b) => a.margin_eur - b.margin_eur);
    return {
      ok: true,
      data: {
        period: def,
        vehicles: sorted.slice(0, top).map((v) => ({
          plate: v.plate,
          label: v.label,
          margin_eur: v.margin_eur,
          margin_pct: v.margin_pct,
          utilization_pct: v.utilization_pct,
          rented_days: v.rented_days,
          ek_total: v.ek_total,
          ist_vk_total: v.ist_vk_total,
        })),
      },
    };
  },
};

// =========================================================
// 23) get_fleet_utilization
// =========================================================
const getFleetUtilization: Tool = {
  name: "get_fleet_utilization",
  description:
    "Liefert die Auslastung der Flotte für einen Zeitraum, plus Detail pro Fahrzeug. Verwende wenn der Nutzer fragt: 'Wie hoch ist unsere Auslastung?', 'Welche Autos stehen rum?'.",
  input_schema: {
    type: "object",
    properties: {
      days: { type: "number", description: "Anzahl Tage (Default 30)." },
    },
  },
  handler: async (input, ctx) => {
    const days = typeof input.days === "number" ? input.days : 30;
    const def = lastNDaysIso(days);
    const { vehicles, contracts } = await loadVehiclesAndContractsForMargin(
      ctx,
      def.from,
      def.to
    );
    const margin = computeFleetMargin({
      vehicles,
      contracts,
      from: def.from,
      to: def.to,
    });
    return {
      ok: true,
      data: {
        period: def,
        avg_utilization_pct: margin.avg_utilization_pct,
        total_rented_days: margin.total_rented_days,
        total_possible_days: margin.total_possible_days,
        vehicle_count: margin.vehicle_count,
        vehicles: margin.vehicles
          .slice()
          .sort((a, b) => a.utilization_pct - b.utilization_pct)
          .map((v) => ({
            plate: v.plate,
            label: v.label,
            utilization_pct: v.utilization_pct,
            rented_days: v.rented_days,
            period_days: v.period_days,
          })),
      },
    };
  },
};

// =========================================================
// 24) create_portal_access — Self-Check-in-Zugang für einen Mieter
// =========================================================
const PW_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const genPassword = (len = 10): string => {
  const bytes = randomBytes(len);
  let s = "";
  for (let i = 0; i < len; i++) s += PW_ALPHABET[bytes[i] % PW_ALPHABET.length];
  return s;
};

const splitName = (full: string): { first: string; last: string } => {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { first: "", last: parts[0] ?? "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
};

const findOrCreateCustomer = async (
  ctx: ToolContext,
  name: string,
  email: string
): Promise<{ id: string; created: boolean } | null> => {
  // 1) per E-Mail (eindeutig)
  const { data: byEmail } = await ctx.admin
    .from("customers")
    .select("id")
    .eq("org_id", ctx.org_id)
    .ilike("email", email)
    .maybeSingle();
  if (byEmail) return { id: byEmail.id as string, created: false };

  // 2) per exaktem Vor-/Nachnamen
  const { first, last } = splitName(name);
  if (last) {
    const { data: byName } = await ctx.admin
      .from("customers")
      .select("id, first_name, last_name")
      .eq("org_id", ctx.org_id)
      .ilike("last_name", last)
      .limit(10);
    const match = (byName ?? []).find(
      (c) => (c.first_name ?? "").trim().toLowerCase() === first.trim().toLowerCase()
    );
    if (match) return { id: match.id as string, created: false };
  }

  // 3) neu anlegen
  const { data: created, error } = await ctx.admin
    .from("customers")
    .insert({
      org_id: ctx.org_id,
      first_name: first || null,
      last_name: last || name.trim(),
      email,
    })
    .select("id")
    .single();
  if (error || !created) return null;
  return { id: created.id as string, created: true };
};

const createPortalAccess: Tool = {
  name: "create_portal_access",
  description:
    "Erstellt Self-Check-in / Portal-Zugangsdaten (E-Mail + Passwort) für einen Mieter, damit er sich unter knoellchen-pilot.de/portal einloggen und seinen Vertrag selbst ansehen/unterschreiben kann. Legt bei Bedarf einen Kundendatensatz an und verknüpft dessen Mietverträge, sodass sie im Portal erscheinen. Das Portal-Login ist E-Mail-basiert: name UND email sind Pflicht — wenn keine E-Mail bekannt ist, frage den Nutzer danach. Das Passwort wird automatisch generiert, falls nicht angegeben, und im Ergebnis im Klartext zurückgegeben, damit der Vermieter es dem Mieter weitergeben kann.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Name des Mieters, z. B. 'Max Mustermann'." },
      email: { type: "string", description: "E-Mail-Adresse für den Portal-Login (Pflicht)." },
      password: {
        type: "string",
        description: "Optionales Wunschpasswort (min. 8 Zeichen). Sonst wird eines generiert.",
      },
    },
    required: ["name", "email"],
  },
  handler: async (input, ctx) => {
    const name = String(input.name ?? "").trim();
    const email = String(input.email ?? "").trim().toLowerCase();
    if (!name) return { ok: false, error: "Name fehlt." };
    if (!email || !email.includes("@"))
      return {
        ok: false,
        error:
          "Für den Portal-Zugang ist eine gültige E-Mail nötig — bitte nach der E-Mail des Mieters fragen.",
      };

    const password =
      typeof input.password === "string" && input.password.length >= 8
        ? input.password
        : genPassword();

    const customer = await findOrCreateCustomer(ctx, name, email);
    if (!customer) return { ok: false, error: "Kunde konnte nicht angelegt/gefunden werden." };

    // E-Mail am Kunden setzen, falls noch leer
    await ctx.admin
      .from("customers")
      .update({ email })
      .eq("id", customer.id)
      .eq("org_id", ctx.org_id)
      .is("email", null);

    // Noch nicht zugeordnete Verträge dieses Mieters mit dem Kunden verknüpfen
    // (sonst erscheinen sie nicht im Portal/Self-Check-in).
    const { data: linked } = await ctx.admin
      .from("contracts")
      .update({ customer_id: customer.id })
      .eq("org_id", ctx.org_id)
      .is("customer_id", null)
      .ilike("renter_name", name)
      .select("id");

    // Konflikt: E-Mail gehört bereits einem ANDEREN Kunden
    const { data: conflict } = await ctx.admin
      .from("customer_logins")
      .select("id, customer_id")
      .eq("org_id", ctx.org_id)
      .eq("email", email)
      .maybeSingle();
    if (conflict && conflict.customer_id !== customer.id)
      return {
        ok: false,
        error: "Diese E-Mail ist bereits einem anderen Kunden in der Organisation zugeordnet.",
      };

    const password_hash = await hashPassword(password);

    const { data: existing } = await ctx.admin
      .from("customer_logins")
      .select("id")
      .eq("org_id", ctx.org_id)
      .eq("customer_id", customer.id)
      .maybeSingle();

    let mode: "created" | "updated";
    if (existing) {
      const { error } = await ctx.admin
        .from("customer_logins")
        .update({
          email,
          password_hash,
          magic_token: null,
          magic_token_expires: null,
          active: true,
        })
        .eq("id", existing.id);
      if (error) return { ok: false, error: error.message };
      mode = "updated";
    } else {
      const { error } = await ctx.admin.from("customer_logins").insert({
        customer_id: customer.id,
        org_id: ctx.org_id,
        email,
        password_hash,
        active: true,
      });
      if (error) return { ok: false, error: error.message };
      mode = "created";
    }

    return {
      ok: true,
      data: {
        mode,
        customer_created: customer.created,
        customer: { id: customer.id, name },
        login: { email, password },
        linked_contracts: (linked ?? []).length,
        portal_url: "https://www.knoellchen-pilot.de/portal",
      },
    };
  },
};

export const TOOLS: Tool[] = [
  createContract,
  createPortalAccess,
  createVehicle,
  searchContracts,
  searchTickets,
  getStats,
  findDriverForDate,
  getDecommissionAlerts,
  findAvailableVehicles,
  assignTicketToContract,
  processReturn,
  getVehicleHistory,
  getVehicleLocation,
  getPriceRecommendation,
  getTireStatus,
  getLowTreadVehicles,
  getVehiclesByTireType,
  getPartnerCommission,
  getPartnerContracts,
  getTopPartners,
  getFleetMargin,
  getBestMarginVehicle,
  getWorstMarginVehicle,
  getFleetUtilization,
];

export const TOOLS_FOR_API = TOOLS.map((t) => ({
  name: t.name,
  description: t.description,
  input_schema: t.input_schema,
}));

// Tools, die Margen/Kosten/Partner-Verrechnung offenlegen — nur für Inhaber.
export const OWNER_ONLY_TOOLS = new Set<string>([
  "get_partner_commission",
  "get_partner_contracts",
  "get_top_partners",
  "get_fleet_margin",
  "get_best_margin_vehicle",
  "get_worst_margin_vehicle",
]);

/** Tool-Liste fürs Modell, je nach Rolle (Mitarbeiter ohne Margen-/Partner-Tools). */
export const toolsForApi = (isOwner: boolean) =>
  TOOLS_FOR_API.filter((t) => isOwner || !OWNER_ONLY_TOOLS.has(t.name));

export const handleTool = async (
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<ToolResult> => {
  // Defense-in-depth: Margen-/Partner-Tools auch im Handler für Mitarbeiter sperren.
  if (!ctx.isOwner && OWNER_ONLY_TOOLS.has(name))
    return { ok: false, error: "Diese Auswertung ist nur für Inhaber verfügbar." };
  const t = TOOLS.find((x) => x.name === name);
  if (!t) return { ok: false, error: `Unbekanntes Tool: ${name}` };
  try {
    return await t.handler(input, ctx);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
};
