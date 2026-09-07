import {
  days,
  hash,
  integer,
  rate,
  sum,
  timestamp,
  validateRules,
  type Award,
  type Entry,
  type Mission,
  type Order,
  type Rules,
  type State,
  type Tier,
} from './model.ts';
export type Eligibility = Record<
  string,
  { active: boolean; customer: string | null }
>;
export function position(
  state: State,
  ambassador: string,
  rules: Rules,
): {
  revenue: number;
  xp: number;
  tier: Tier;
  next: Tier | null;
  revenueToNext: number;
  xpToNext: number;
} {
  const revenue = sum(
    Object.values(state.orders)
      .filter(
        (o) =>
          o.ambassador === ambassador &&
          o.order.currency === rules.currency &&
          !o.hold,
      )
      .map((o) => o.base),
  );
  const xp = sum(
    Object.values(state.awards)
      .filter((a) => a.ambassador === ambassador && !a.hold)
      .map((a) => a.xp),
  );
  const tier =
    [...rules.tiers]
      .reverse()
      .find((t) => t.revenueMinor <= revenue && t.xp <= xp) ?? rules.tiers[0];
  const next = rules.tiers[rules.tiers.indexOf(tier) + 1] ?? null;
  return {
    revenue,
    xp,
    tier,
    next,
    revenueToNext: next ? Math.max(0, next.revenueMinor - revenue) : 0,
    xpToNext: next ? Math.max(0, next.xp - xp) : 0,
  };
}
export function attribution(
  order: Order,
  state: State,
  rules: Rules,
  eligible: Eligibility,
) {
  const valid = order.touches.filter(
    (t) =>
      t.verified &&
      eligible[t.ambassador]?.active &&
      timestamp(t.at) <= timestamp(order.createdAt),
  );
  const codes = [
    ...new Set(valid.filter((t) => t.kind === 'code').map((t) => t.ambassador)),
  ];
  if (codes.length > 1) return { ambassador: null, reason: 'competing_codes' };
  if (codes.length === 1)
    return { ambassador: codes[0], reason: 'explicit_code' };
  const clicks = valid
    .filter(
      (t) =>
        t.kind !== 'code' &&
        timestamp(days(t.at, rules.clickDays)) > timestamp(order.createdAt),
    )
    .sort(
      (a, b) => timestamp(b.at) - timestamp(a.at) || a.id.localeCompare(b.id),
    );
  if (clicks[0])
    return { ambassador: clicks[0].ambassador, reason: clicks[0].kind };
  const book = order.customer ? state.books[order.customer] : null;
  if (
    book &&
    eligible[book.ambassador]?.active &&
    timestamp(book.acquiredAt) <= timestamp(order.createdAt) &&
    timestamp(book.expiresAt) > timestamp(order.createdAt)
  )
    return { ambassador: book.ambassador, reason: 'relationship' };
  return { ambassador: null, reason: 'unattributed' };
}
export function qualified(order: Order, rules: Rules, mission?: Mission) {
  if (order.currency !== rules.currency) throw new Error('Currency mismatch');
  if (new Set(order.lines.map((l) => l.id)).size !== order.lines.length)
    throw new Error('Duplicate line');
  const values = order.lines.map((l) => {
    integer(l.netMinor);
    integer(l.refundedMinor, 0, l.netMinor);
    if (
      rules.excludedProducts.includes(l.product) ||
      (rules.excludeGiftCards && l.giftCard) ||
      (mission?.products.length && !mission.products.includes(l.product)) ||
      (mission?.skus.length && !mission.skus.includes(l.sku))
    )
      return 0;
    return l.netMinor - l.refundedMinor;
  });
  return order.cancelled || order.chargeback ? 0 : sum(values);
}
function replace(state: State, entries: Entry[], award: Award, reason: string) {
  const control = state.controls[award.key];
  if (control?.hold) award.hold = control.hold;
  if (control?.void) {
    award.minor = 0;
    award.xp = 0;
    award.hold = 'voided';
  }
  const old = state.awards[award.key];
  if (
    old &&
    (old.ambassador !== award.ambassador ||
      old.rules.currency !== award.rules.currency)
  )
    throw new Error('Award identity changed');
  const deltaMinor = award.minor - (old?.minor ?? 0),
    deltaXp = award.xp - (old?.xp ?? 0);
  if (deltaMinor || deltaXp || old?.hold !== award.hold)
    entries.push({ ...award, deltaMinor, deltaXp, reason });
  state.awards[award.key] = award;
}
function missions(
  state: State,
  entries: Entry[],
  ambassador: string,
  rules: Rules,
  at: string,
) {
  for (const m of rules.missions) {
    const orders = Object.values(state.orders).filter(
      (o) =>
        o.ambassador === ambassador &&
        o.rules.version === rules.version &&
        !o.hold &&
        timestamp(o.order.createdAt) >= timestamp(m.startsAt) &&
        timestamp(o.order.createdAt) < timestamp(m.endsAt) &&
        qualified(o.order, rules, m) > 0,
    );
    let progress =
      m.lane === 'commerce'
        ? sum(
            orders.map((o) =>
              m.metric === 'revenue'
                ? qualified(o.order, rules, m)
                : m.metric === 'new_customers'
                  ? Number(
                      !!o.order.customer &&
                        state.books[o.order.customer]?.source === o.order.id,
                    )
                  : m.metric === 'subscriptions'
                    ? Number(o.order.subscription)
                    : m.metric === 'orders'
                      ? 1
                      : 0,
            ),
          )
        : 0;
    if (m.metric === 'objectives')
      progress = sum(
        Object.values(state.objectives)
          .filter(
            (o) =>
              o.ambassador === ambassador &&
              o.lane === m.lane &&
              o.rules.version === rules.version &&
              timestamp(o.at) >= timestamp(m.startsAt) &&
              timestamp(o.at) < timestamp(m.endsAt),
          )
          .map((o) => o.count),
      );
    const key = JSON.stringify(['mission', ambassador, rules.version, m.id]);
    const old = state.awards[key];
    const complete = progress >= m.target;
    replace(
      state,
      entries,
      {
        key,
        ambassador,
        source: m.id,
        lane: m.lane,
        kind: 'mission_completion',
        minor: complete ? m.completionMinor : 0,
        xp: complete ? m.xp : 0,
        releaseAt:
          old && old.minor > 0 ? old.releaseAt : days(at, rules.holdDays),
        hold: null,
        rules,
        evidence: { progress, target: m.target },
      },
      'mission_recalculation',
    );
  }
}
export function applyOrder(
  input: State,
  order: Order,
  proposed: Rules,
  eligible: Eligibility,
): { state: State; entries: Entry[]; outcome: string } {
  validateRules(proposed);
  timestamp(order.createdAt);
  timestamp(order.updatedAt);
  timestamp(order.settledAt);
  integer(order.purchaseNumber, 1);
  if (
    timestamp(order.updatedAt) < timestamp(order.createdAt) ||
    timestamp(order.settledAt) < timestamp(order.createdAt)
  )
    throw new Error('Invalid order chronology');
  const state = structuredClone(input),
    entries: Entry[] = [];
  const old = state.orders[order.id];
  if (old && timestamp(order.updatedAt) < timestamp(old.order.updatedAt))
    return { state, entries, outcome: 'stale' };
  if (old && timestamp(order.updatedAt) === timestamp(old.order.updatedAt)) {
    if (hash(order) !== hash(old.order))
      throw new Error('Conflicting same-version order');
    return { state, entries, outcome: 'duplicate' };
  }
  if (
    old &&
    (old.order.customer !== order.customer ||
      old.order.createdAt !== order.createdAt ||
      old.order.newCustomer !== order.newCustomer ||
      old.order.purchaseNumber !== order.purchaseNumber)
  )
    throw new Error('Order identity changed; review required');
  const rules = old?.rules ?? structuredClone(proposed);
  const choice = old
    ? { ambassador: old.ambassador, reason: old.attribution }
    : attribution(order, state, rules, eligible);
  const ambassador = choice.ambassador;
  let hold = order.review;
  const self =
    ambassador &&
    order.customer &&
    eligible[ambassador]?.customer === order.customer;
  if (self) hold = 'self_referral';
  if (ambassador && !eligible[ambassador]?.active) hold = 'ambassador_inactive';
  const base =
    self && rules.selfReferral === 'deny' ? 0 : qualified(order, rules);
  const tier = old?.tier ?? position(state, ambassador ?? '', rules).tier;
  state.orders[order.id] = {
    order,
    hold,
    ambassador,
    attribution: choice.reason,
    rules,
    tier,
    base,
  };
  if (!ambassador) return { state, entries, outcome: choice.reason };
  if (
    order.customer &&
    order.newCustomer &&
    base > 0 &&
    !hold &&
    !state.books[order.customer]
  )
    state.books[order.customer] = {
      ambassador,
      acquiredAt: order.createdAt,
      expiresAt: days(order.createdAt, rules.relationshipDays),
      source: order.id,
    };
  const book = order.customer ? state.books[order.customer] : null;
  const relationship =
    choice.reason === 'relationship' &&
    order.purchaseNumber > rules.earlyPurchases;
  const bps = relationship ? rules.retentionBps : tier.basisPoints;
  const write = (kind: string, minor: number, evidence: unknown) => {
    const key = JSON.stringify(['order', order.id, kind]);
    const previous = state.awards[key];
    replace(
      state,
      entries,
      {
        key,
        source: order.id,
        ambassador,
        lane: 'commerce',
        kind,
        minor,
        xp: 0,
        hold,
        rules,
        evidence,
        releaseAt:
          previous && minor <= previous.minor
            ? previous.releaseAt
            : days(
                previous ? order.updatedAt : order.settledAt,
                rules.holdDays,
              ),
      },
      order.chargeback
        ? 'chargeback'
        : order.cancelled
          ? 'cancellation'
          : old
            ? 'order_adjustment'
            : 'accrual',
    );
  };
  write(relationship ? 'relationship' : 'sale', rate(base, bps), {
    base,
    bps,
    attribution: choice,
    tier,
    book,
  });
  write(
    'acquisition',
    book?.source === order.id && base > 0 ? rules.acquisitionMinor : 0,
    { customer: order.customer, book },
  );
  // Boosts stack independently, each rounded half-up; total is explicitly visible.
  for (const m of rules.missions)
    if (
      m.lane === 'commerce' &&
      m.boostBps &&
      timestamp(order.createdAt) >= timestamp(m.startsAt) &&
      timestamp(order.createdAt) < timestamp(m.endsAt)
    ) {
      const matches =
        (m.metric !== 'new_customers' &&
          m.metric !== 'subscriptions' &&
          m.metric !== 'objectives') ||
        (m.metric === 'new_customers' && order.newCustomer) ||
        (m.metric === 'subscriptions' && order.subscription);
      write(
        `mission_boost:${m.id}`,
        matches && base > 0 ? rate(qualified(order, rules, m), m.boostBps) : 0,
        { mission: m.id },
      );
    }
  missions(state, entries, ambassador, rules, order.updatedAt);
  return { state, entries, outcome: 'applied' };
}
export function applyObjective(
  input: State,
  objective: {
    id: string;
    ambassador: string;
    lane: string;
    at: string;
    count: number;
    bountyMinor: number;
    xp: number;
    reason: string;
  },
  rules: Rules,
) {
  validateRules(rules);
  integer(objective.count, 1);
  integer(objective.bountyMinor);
  integer(objective.xp);
  timestamp(objective.at);
  if (!objective.reason.trim() || !objective.lane)
    throw new Error('Objective evidence required');
  const state = structuredClone(input),
    entries: Entry[] = [];
  if (state.objectives[objective.id])
    throw new Error('Objective already recorded');
  state.objectives[objective.id] = {
    ...objective,
    rules: structuredClone(rules),
  };
  replace(
    state,
    entries,
    {
      key: JSON.stringify(['objective', objective.id]),
      source: objective.id,
      ambassador: objective.ambassador,
      lane: objective.lane,
      kind: 'bounty',
      minor: objective.bountyMinor,
      xp: objective.xp,
      releaseAt: days(objective.at, rules.holdDays),
      hold: null,
      rules: structuredClone(rules),
      evidence: objective,
    },
    objective.reason,
  );
  missions(state, entries, objective.ambassador, rules, objective.at);
  return { state, entries };
}
