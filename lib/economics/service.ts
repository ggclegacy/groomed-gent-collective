import type { Database } from '../commerce/model.ts';
import {
  applyObjective,
  applyOrder,
  position,
  type Eligibility,
} from './engine.ts';
import {
  emptyState,
  hash,
  integer,
  sum,
  timestamp,
  validateRules,
  type Entry,
  type Order,
  type Rules,
  type State,
} from './model.ts';
// Only server adapters may construct this context after verified Clerk/worker authentication.
// No HTTP route or autonomous payout client is exported.
export type Context = {
  db: Database;
  shop: string;
  actor: string;
  founderId?: string;
  workerAuthenticated?: boolean;
};
export type Command =
  | { kind: 'order'; id: string; reason: string; order: Order }
  | {
      kind: 'objective';
      id: string;
      reason: string;
      objective: Parameters<typeof applyObjective>[1];
    }
  | {
      kind: 'payout';
      id: string;
      reason: string;
      paymentId: string;
      ambassador: string;
      action: 'reserve' | 'paid' | 'void';
      minor: number;
      at: string;
      reference: string | null;
    }
  | {
      kind: 'adjust';
      id: string;
      reason: string;
      awardKey: string;
      deltaMinor: number;
      deltaXp: number;
    }
  | {
      kind: 'hold' | 'approve' | 'void';
      id: string;
      reason: string;
      awardKey: string;
      at: string;
    };
export async function execute(
  context: Context,
  command: Command,
  rules: Rules,
) {
  const founder = !!context.founderId && context.actor === context.founderId;
  if (
    !context.actor ||
    !(command.kind === 'order'
      ? context.workerAuthenticated || founder
      : founder)
  )
    throw new Error('Economic authority required');
  if (!command.id.trim() || !command.reason.trim())
    throw new Error('Event ID and reason required');
  validateRules(rules);
  const digest = hash(command);
  for (let attempt = 0; attempt < 4; attempt++) {
    const prior = await context.db.query(
      'SELECT digest FROM collective_economic_events WHERE shop=$1 AND id=$2',
      [context.shop, command.id],
    );
    if (prior.rows[0]) {
      if (prior.rows[0].digest !== digest)
        throw new Error('Idempotency conflict');
      return 'duplicate';
    }
    const read = await context.db.query(
      'SELECT revision::text,document FROM collective_economic_streams WHERE shop=$1',
      [context.shop],
    );
    const revision = read.rows[0]?.revision ?? '0';
    let state = (read.rows[0]?.document ?? emptyState()) as State;
    const people = await context.db.query(
      `SELECT a.id,a.shopify_customer_id,(a.status='active' AND m.status='active') AS active FROM commerce_ambassadors a JOIN members m ON m.user_id=a.member_id WHERE a.shop=$1`,
      [context.shop],
    );
    const eligible: Eligibility = Object.fromEntries(
      people.rows.map((a) => [
        String(a.id),
        {
          active: a.active === true,
          customer: a.shopify_customer_id as string | null,
        },
      ]),
    );
    let entries: Entry[];
    if (command.kind === 'order')
      ({ state, entries } = applyOrder(state, command.order, rules, eligible));
    else if (command.kind === 'objective') {
      if (!eligible[command.objective.ambassador]?.active)
        throw new Error('Active ambassador required');
      ({ state, entries } = applyObjective(state, command.objective, rules));
    } else if (command.kind === 'payout') {
      state = structuredClone(state);
      entries = [];
      timestamp(command.at);
      integer(command.minor, 1);
      if (!eligible[command.ambassador]?.active)
        throw new Error('Active ambassador required');
      const payment = state.payments[command.paymentId];
      const balance = economicPosition(
        state,
        command.ambassador,
        rules,
        command.at,
      );
      if (command.action === 'reserve') {
        if (
          payment ||
          balance.availableMinor < command.minor ||
          balance.heldMinor !== 0
        )
          throw new Error('Payout reservation unavailable');
        state.payments[command.paymentId] = {
          id: command.paymentId,
          ambassador: command.ambassador,
          currency: rules.currency,
          minor: command.minor,
          state: 'reserved',
          at: command.at,
          reference: null,
        };
      } else {
        if (
          !payment ||
          payment.state !== 'reserved' ||
          payment.ambassador !== command.ambassador ||
          payment.currency !== rules.currency ||
          payment.minor !== command.minor
        )
          throw new Error('Reservation mismatch');
        if (command.action === 'paid') {
          if (
            !command.reference?.trim() ||
            balance.availableMinor < 0 ||
            balance.heldMinor !== 0 ||
            Object.values(state.payments).some(
              (p) => p.reference === command.reference,
            )
          )
            throw new Error(
              'Payment needs reconciliation or unique external reference',
            );
          payment.state = 'paid';
          payment.reference = command.reference;
          payment.at = command.at;
        } else payment.state = 'void';
      }
    } else {
      state = structuredClone(state);
      const award = state.awards[command.awardKey];
      if (!award) throw new Error('Award not found');
      let deltaMinor = 0,
        deltaXp = 0;
      if (command.kind === 'adjust') {
        deltaMinor = integer(command.deltaMinor, -Number.MAX_SAFE_INTEGER);
        deltaXp = integer(command.deltaXp, -Number.MAX_SAFE_INTEGER);
        // Independent correction award: future Shopify recalculation must not erase an admin correction.
        const key = JSON.stringify(['adjustment', command.id]);
        const correction = {
          ...award,
          key,
          source: command.id,
          kind: 'manual_adjustment',
          minor: deltaMinor,
          xp: deltaXp,
          evidence: { originalAward: award.key, reason: command.reason },
        };
        state.awards[key] = correction;
        entries = [
          { ...correction, deltaMinor, deltaXp, reason: command.reason },
        ];
      } else {
        timestamp(command.at);
        if (state.controls[award.key]?.void)
          throw new Error('Voided award requires separate audited correction');
        if (command.kind === 'approve') {
          if (
            !eligible[award.ambassador]?.active ||
            timestamp(command.at) < timestamp(award.releaseAt)
          )
            throw new Error('Not eligible for approval');
          award.hold = null;
        } else if (command.kind === 'hold') award.hold = command.reason;
        else {
          deltaMinor = -award.minor;
          deltaXp = -award.xp;
          award.minor = 0;
          award.xp = 0;
          award.hold = 'voided';
        }
        state.controls[award.key] = {
          hold: command.kind === 'hold' ? command.reason : null,
          void: command.kind === 'void',
        };
        entries = [{ ...award, deltaMinor, deltaXp, reason: command.reason }];
      }
    }
    const result = await context.db.query(
      'SELECT collective_economic_commit($1,$2::bigint,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11::jsonb,$12::jsonb) AS result',
      [
        context.shop,
        revision,
        command.id,
        digest,
        context.actor,
        command.reason,
        command.kind,
        JSON.stringify(command),
        JSON.stringify(rules),
        hash(rules),
        JSON.stringify(state),
        JSON.stringify(entries),
      ],
    );
    if (result.rows[0]?.result !== 'retry')
      return String(result.rows[0]?.result);
  }
  throw new Error('Concurrent update; retry event');
}
export function economicPosition(
  state: State,
  ambassador: string,
  rules: Rules,
  at: string,
) {
  timestamp(at);
  const awards = Object.values(state.awards).filter(
    (a) => a.ambassador === ambassador && a.rules.currency === rules.currency,
  );
  const total = (predicate: (a: (typeof awards)[number]) => boolean) =>
    sum(awards.filter(predicate).map((a) => a.minor));
  const orders = Object.values(state.orders).filter(
    (o) => o.ambassador === ambassador && o.order.currency === rules.currency,
  );
  const book = Object.entries(state.books)
    .filter(([, b]) => b.ambassador === ambassador)
    .map(([customer, b]) => {
      const purchases = Object.values(state.orders).filter(
        (o) =>
          o.order.customer === customer && o.order.currency === rules.currency,
      );
      return {
        customer,
        ...b,
        ltvMinor: sum(purchases.map((o) => o.base)),
        orders: purchases.length,
        lastPurchaseAt:
          purchases
            .map((o) => o.order.createdAt)
            .sort()
            .at(-1) ?? null,
        replenishmentDueAt: null,
      };
    });
  const payments = Object.values(state.payments).filter(
    (p) => p.ambassador === ambassador && p.currency === rules.currency,
  );
  const committed = sum(
    payments.filter((p) => p.state !== 'void').map((p) => p.minor),
  );
  return {
    currency: rules.currency,
    asOf: at,
    paidMinor: sum(
      payments.filter((p) => p.state === 'paid').map((p) => p.minor),
    ),
    reservedMinor: sum(
      payments.filter((p) => p.state === 'reserved').map((p) => p.minor),
    ),
    availableMinor: sum([
      total((a) => !a.hold && timestamp(a.releaseAt) <= timestamp(at)),
      -committed,
    ]),
    pendingMinor: total(
      (a) => !a.hold && timestamp(a.releaseAt) > timestamp(at),
    ),
    heldMinor: total((a) => !!a.hold),
    lifetimeNetMinor: total(() => true),
    missionMinor: total((a) => a.kind.startsWith('mission')),
    relationshipMinor: total((a) => a.kind === 'relationship'),
    qualifiedRevenueMinor: sum(orders.map((o) => o.base)),
    acquiredCustomers: book.length,
    book,
    progression: position(state, ambassador, rules),
    missions: awards
      .filter((a) => a.kind === 'mission_completion')
      .map((a) => ({
        id: a.source,
        progress: a.evidence,
        earningsMinor: a.minor,
        xp: a.xp,
      })),
    payoutHistory: payments,
    payoutState: 'manual_bookkeeping_only' as const,
  };
}
export async function readPosition(context: Context, rules: Rules, at: string) {
  if (!context.actor) throw new Error('Sign in required');
  const member = await context.db.query(
    `SELECT a.id FROM commerce_ambassadors a JOIN members m ON m.user_id=a.member_id WHERE a.shop=$1 AND a.member_id=$2 AND a.status='active' AND m.status='active'`,
    [context.shop, context.actor],
  );
  if (!member.rows[0]) throw new Error('Active ambassador required');
  const row = await context.db.query(
    'SELECT document FROM collective_economic_streams WHERE shop=$1',
    [context.shop],
  );
  return economicPosition(
    (row.rows[0]?.document ?? emptyState()) as State,
    String(member.rows[0].id),
    rules,
    at,
  );
}
