export type PlanKey = 'accountant' | 'middle' | 'standard';

export interface Plan {
  key: PlanKey;
  priceExclTax: number;
  priceInclTax: number;
}

export const PRICE_PLANS: Record<PlanKey, Plan> = {
  accountant: { key: 'accountant', priceExclTax: 9000, priceInclTax: 9900 },
  middle: { key: 'middle', priceExclTax: 18000, priceInclTax: 19800 },
  standard: { key: 'standard', priceExclTax: 21000, priceInclTax: 23100 },
};

export const PLAN_KEYS: PlanKey[] = ['accountant', 'middle', 'standard'];

export function getPlan(key: string | null | undefined): Plan {
  if (key && key in PRICE_PLANS) return PRICE_PLANS[key as PlanKey];
  return PRICE_PLANS.accountant;
}
