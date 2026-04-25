import type { Ticket } from "./types";

export const VAT_RATE = 0.19;

const round2 = (n: number) => Math.round(n * 100) / 100;

export type ChargeBreakdown = {
  charge_fine: boolean;
  charge_fee: boolean;
  fine_amount: number;
  fee_net: number;
  fee_vat: number;
  fee_gross: number;
  total_charge: number;
};

export type ChargeInput = {
  fineAmount: number | null | undefined;
  chargeFine: boolean;
  feeNet: number | null | undefined;
  chargeFee: boolean;
};

export const computeCharge = (input: ChargeInput): ChargeBreakdown => {
  const fineAmount = Number(input.fineAmount ?? 0) || 0;
  const feeNet = Number(input.feeNet ?? 0) || 0;
  const feeVat = round2(feeNet * VAT_RATE);
  const feeGross = round2(feeNet + feeVat);

  const fineApplied = input.chargeFine ? fineAmount : 0;
  const feeApplied = input.chargeFee ? feeGross : 0;
  const total = round2(fineApplied + feeApplied);

  return {
    charge_fine: input.chargeFine,
    charge_fee: input.chargeFee,
    fine_amount: fineAmount,
    fee_net: round2(feeNet),
    fee_vat: feeVat,
    fee_gross: feeGross,
    total_charge: total,
  };
};

export const chargeFromTicket = (
  t: Pick<Ticket, "fine_amount" | "charge_fine" | "charge_fee" | "fee_net" | "fee_vat" | "fee_gross" | "total_charge">
): ChargeBreakdown => {
  // Wenn alle Werte gesetzt sind, einfach übernehmen — sonst rechnen.
  if (
    t.fee_net != null &&
    t.fee_vat != null &&
    t.fee_gross != null &&
    t.total_charge != null
  ) {
    return {
      charge_fine: t.charge_fine,
      charge_fee: t.charge_fee,
      fine_amount: Number(t.fine_amount ?? 0) || 0,
      fee_net: Number(t.fee_net) || 0,
      fee_vat: Number(t.fee_vat) || 0,
      fee_gross: Number(t.fee_gross) || 0,
      total_charge: Number(t.total_charge) || 0,
    };
  }
  return computeCharge({
    fineAmount: t.fine_amount,
    chargeFine: t.charge_fine,
    feeNet: t.fee_net,
    chargeFee: t.charge_fee,
  });
};
