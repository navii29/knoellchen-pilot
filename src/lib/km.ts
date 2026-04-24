export type ExtraKmInput = {
  kmPickup: number | null | undefined;
  kmReturn: number | null | undefined;
  kmLimit: number | null | undefined;
  pricePerKm: number | null | undefined;
};

export type ExtraKmResult = {
  drivenKm: number;
  withinLimit: boolean;
  extraKm: number;
  pricePerKm: number;
  cost: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export const computeExtraKm = (input: ExtraKmInput): ExtraKmResult | null => {
  const pickup = Number(input.kmPickup ?? NaN);
  const ret = Number(input.kmReturn ?? NaN);
  if (!Number.isFinite(pickup) || !Number.isFinite(ret)) return null;
  if (ret < pickup) return null;

  const drivenKm = ret - pickup;
  const limit = Number(input.kmLimit ?? NaN);
  const price = Number(input.pricePerKm ?? NaN);

  if (!Number.isFinite(limit) || !Number.isFinite(price) || price <= 0) {
    return {
      drivenKm,
      withinLimit: true,
      extraKm: 0,
      pricePerKm: Number.isFinite(price) ? price : 0,
      cost: 0,
    };
  }

  const extraKm = Math.max(0, drivenKm - limit);
  return {
    drivenKm,
    withinLimit: extraKm === 0,
    extraKm,
    pricePerKm: price,
    cost: round2(extraKm * price),
  };
};
