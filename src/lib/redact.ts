import type { Contract, Vehicle } from "./types";

// Hilfen, um sensible Kosten-/Margen-/Partner-Felder aus Datensätzen zu entfernen,
// BEVOR sie an Client-Komponenten gehen (sonst im DevTools/RSC-Payload sichtbar,
// auch wenn die UI sie ausblendet). Für Inhaber unverändert.

export const redactVehicleCost = (v: Vehicle, isOwner: boolean): Vehicle =>
  isOwner ? v : { ...v, cost_daily: null, cost_monthly: null, target_daily_rate: null };

export const redactContractPartner = (c: Contract, isOwner: boolean): Contract =>
  isOwner
    ? c
    : {
        ...c,
        partner_purchase_price: null,
        partner_selling_price: null,
        partner_commission: null,
      };
