import { createHash } from 'node:crypto';
export type Lane = string; // Open vocabulary: commerce, creator, field, network, future lanes.
export type Tier = {
  id: string;
  revenueMinor: number;
  basisPoints: number;
  xp: number;
};
export type Mission = {
  id: string;
  lane: Lane;
  startsAt: string;
  endsAt: string;
  metric:
    | 'revenue'
    | 'orders'
    | 'new_customers'
    | 'subscriptions'
    | 'objectives';
  target: number;
  products: string[];
  skus: string[];
  boostBps: number;
  completionMinor: number;
  xp: number;
};
export type Rules = {
  version: string;
  currency: string;
  holdDays: number;
  clickDays: number;
  relationshipDays: number;
  earlyPurchases: number;
  retentionBps: number;
  acquisitionMinor: number;
  excludeGiftCards: boolean;
  excludedProducts: string[];
  selfReferral: 'deny' | 'hold';
  tiers: Tier[];
  missions: Mission[];
};
export const proposedRules: Rules = {
  version: 'proposal-v1',
  currency: 'USD',
  holdDays: 30,
  clickDays: 30,
  relationshipDays: 365,
  earlyPurchases: 1,
  retentionBps: 500,
  acquisitionMinor: 0,
  excludeGiftCards: true,
  excludedProducts: [],
  selfReferral: 'deny',
  tiers: [
    { id: 'Member', revenueMinor: 0, basisPoints: 1500, xp: 0 },
    { id: 'Operator', revenueMinor: 100000, basisPoints: 1750, xp: 0 },
    { id: 'Proven', revenueMinor: 300000, basisPoints: 2000, xp: 0 },
    { id: 'Elite', revenueMinor: 750000, basisPoints: 2250, xp: 0 },
    { id: 'Legacy', revenueMinor: 1500000, basisPoints: 2500, xp: 0 },
  ],
  missions: [],
};
export type Touch = {
  id: string;
  ambassador: string;
  kind: 'code' | 'link' | 'qr';
  at: string;
  verified: boolean;
};
export type Line = {
  id: string;
  product: string;
  sku: string;
  netMinor: number;
  refundedMinor: number;
  giftCard: boolean;
};
export type Order = {
  id: string;
  updatedAt: string;
  createdAt: string;
  settledAt: string;
  currency: string;
  customer: string | null;
  newCustomer: boolean;
  purchaseNumber: number;
  subscription: boolean;
  lines: Line[];
  touches: Touch[];
  cancelled: boolean;
  chargeback: boolean;
  review: string | null;
};
export type Relationship = {
  ambassador: string;
  acquiredAt: string;
  expiresAt: string;
  source: string;
};
export type Award = {
  key: string;
  ambassador: string;
  source: string;
  lane: Lane;
  kind: string;
  minor: number;
  xp: number;
  releaseAt: string;
  hold: string | null;
  rules: Rules;
  evidence: unknown;
};
export type Entry = Award & {
  deltaMinor: number;
  deltaXp: number;
  reason: string;
};
export type OrderRecord = {
  order: Order;
  ambassador: string | null;
  attribution: string;
  rules: Rules;
  tier: Tier;
  base: number;
  hold: string | null;
};
export type Payment = {
  id: string;
  ambassador: string;
  currency: string;
  minor: number;
  state: 'reserved' | 'paid' | 'void';
  at: string;
  reference: string | null;
};
export type State = {
  controls: Record<string, { hold: string | null; void: boolean }>;
  payments: Record<string, Payment>;
  orders: Record<string, OrderRecord>;
  books: Record<string, Relationship>;
  awards: Record<string, Award>;
  objectives: Record<
    string,
    {
      ambassador: string;
      lane: string;
      at: string;
      count: number;
      rules: Rules;
    }
  >;
};
export const emptyState = (): State => ({
  controls: {},
  payments: {},
  orders: {},
  books: {},
  awards: {},
  objectives: {},
});
export function integer(n: number, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(n) || n < min || n > max)
    throw new Error('Invalid integer');
  return n;
}
export function sum(values: number[]) {
  return values.reduce((a, b) => integer(a + b, -Number.MAX_SAFE_INTEGER), 0);
}
export function rate(base: number, bps: number) {
  integer(base);
  integer(bps, 0, 10000);
  return Number((BigInt(base) * BigInt(bps) + BigInt(5000)) / BigInt(10000));
}
export function timestamp(s: string) {
  const n = Date.parse(s);
  if (!Number.isFinite(n)) throw new Error('Invalid date');
  return n;
}
export function days(s: string, n: number) {
  return new Date(timestamp(s) + integer(n, 0, 36500) * 86400000).toISOString();
}
export function hash(value: unknown): string {
  const canonical = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(canonical)
      : v && typeof v === 'object'
        ? Object.fromEntries(
            Object.entries(v)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, x]) => [k, canonical(x)]),
          )
        : v;
  return createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex');
}
export function validateRules(r: Rules) {
  if (
    !r.version ||
    !/^[A-Z]{3}$/.test(r.currency) ||
    !['deny', 'hold'].includes(r.selfReferral)
  )
    throw new Error('Invalid rules');
  for (const n of [r.holdDays, r.clickDays, r.relationshipDays])
    integer(n, 0, 36500);
  integer(r.earlyPurchases, 1);
  integer(r.retentionBps, 0, 10000);
  integer(r.acquisitionMinor);
  if (!r.tiers.length || r.tiers[0].revenueMinor !== 0 || r.tiers[0].xp !== 0)
    throw new Error('Missing entry tier');
  const ids = new Set<string>();
  for (const [i, t] of r.tiers.entries()) {
    if (
      !t.id ||
      ids.has(t.id) ||
      (i > 0 && t.revenueMinor <= r.tiers[i - 1].revenueMinor)
    )
      throw new Error('Invalid tiers');
    ids.add(t.id);
    integer(t.revenueMinor);
    integer(t.xp);
    integer(t.basisPoints, 0, 10000);
  }
  ids.clear();
  for (const m of r.missions) {
    if (
      !m.id ||
      ids.has(m.id) ||
      !m.lane ||
      ![
        'revenue',
        'orders',
        'new_customers',
        'subscriptions',
        'objectives',
      ].includes(m.metric) ||
      timestamp(m.startsAt) >= timestamp(m.endsAt)
    )
      throw new Error('Invalid mission');
    ids.add(m.id);
    integer(m.target, 1);
    integer(m.boostBps, 0, 10000);
    integer(m.completionMinor);
    integer(m.xp);
  }
}
