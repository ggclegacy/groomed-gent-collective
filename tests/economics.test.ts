import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import {
  applyOrder,
  applyObjective,
  attribution,
  qualified,
} from '../lib/economics/engine.ts';
import {
  emptyState,
  proposedRules,
  rate,
  validateRules,
  type Order,
  type Rules,
} from '../lib/economics/model.ts';
import {
  execute,
  economicPosition,
  readPosition,
  type Context,
} from '../lib/economics/service.ts';
const rules = (): Rules => structuredClone(proposedRules);
const eligible = {
  ambassador: { active: true, customer: 'self' },
  other: { active: true, customer: null },
};
const order = (patch: Partial<Order> = {}): Order => ({
  id: 'order1',
  updatedAt: '2026-09-01T00:00:00Z',
  createdAt: '2026-09-01T00:00:00Z',
  settledAt: '2026-09-01T00:00:00Z',
  currency: 'USD',
  customer: 'customer1',
  newCustomer: true,
  purchaseNumber: 1,
  subscription: false,
  lines: [
    {
      id: 'line1',
      product: 'p1',
      sku: 'sku1',
      netMinor: 10000,
      refundedMinor: 0,
      giftCard: false,
    },
  ],
  touches: [
    {
      id: 'code1',
      ambassador: 'ambassador',
      kind: 'code',
      at: '2026-08-01',
      verified: true,
    },
  ],
  cancelled: false,
  chargeback: false,
  review: null,
  ...patch,
});
void test('integer calculation, eligibility exclusions and configuration validation', () => {
  assert.equal(rate(1, 5000), 1);
  assert.equal(rate(Number.MAX_SAFE_INTEGER, 10000), Number.MAX_SAFE_INTEGER);
  assert.throws(() => rate(1.5, 1500));
  assert.throws(() => rate(1, 10001));
  const r = rules();
  r.excludedProducts = ['p1'];
  assert.equal(qualified(order(), r), 0);
  assert.equal(
    qualified(
      order({ lines: [{ ...order().lines[0], giftCard: true }] }),
      rules(),
    ),
    0,
  );
  assert.throws(() =>
    qualified(
      order({ lines: [{ ...order().lines[0], refundedMinor: 10001 }] }),
      rules(),
    ),
  );
  r.tiers[1].revenueMinor = 0;
  assert.throws(() => validateRules(r));
});
void test('attribution precedence, conflict, expiry, signed evidence and deterministic tie break', () => {
  const r = rules(),
    state = emptyState();
  state.books.customer1 = {
    ambassador: 'other',
    acquiredAt: '2026-08-01',
    expiresAt: '2027-08-01',
    source: 'original',
  };
  assert.equal(
    attribution(order(), state, r, eligible).ambassador,
    'ambassador',
  );
  assert.equal(
    attribution(
      order({
        touches: [
          ...order().touches,
          { ...order().touches[0], ambassador: 'other' },
        ],
      }),
      state,
      r,
      eligible,
    ).reason,
    'competing_codes',
  );
  const touch = {
    id: 'b',
    ambassador: 'ambassador',
    kind: 'qr' as const,
    at: '2026-08-25',
    verified: true,
  };
  assert.equal(
    attribution(order({ touches: [touch] }), state, r, eligible).reason,
    'qr',
  );
  assert.equal(
    attribution(
      order({ touches: [{ ...touch, at: '2026-08-01' }] }),
      state,
      r,
      eligible,
    ).reason,
    'relationship',
  );
  assert.equal(
    attribution(
      order({ touches: [{ ...touch, verified: false }] }),
      emptyState(),
      r,
      eligible,
    ).reason,
    'unattributed',
  );
  assert.equal(
    attribution(
      order({ touches: [touch, { ...touch, id: 'a', ambassador: 'other' }] }),
      state,
      r,
      eligible,
    ).ambassador,
    'other',
  );
});
void test('frozen rates, partial/full refund delta, stale and duplicate events', () => {
  const r = rules();
  r.acquisitionMinor = 500;
  const initial = applyOrder(emptyState(), order(), r, eligible);
  assert.equal(
    initial.entries.reduce((n, e) => n + e.deltaMinor, 0),
    2000,
  );
  r.tiers[0].basisPoints = 2500;
  r.version = 'next';
  const refund = order({
    updatedAt: '2026-09-02',
    lines: [{ ...order().lines[0], refundedMinor: 5000 }],
  });
  const second = applyOrder(initial.state, refund, r, eligible);
  assert.equal(
    second.entries.reduce((n, e) => n + e.deltaMinor, 0),
    -750,
  );
  assert.equal(
    applyOrder(second.state, refund, r, eligible).outcome,
    'duplicate',
  );
  assert.equal(applyOrder(second.state, order(), r, eligible).outcome, 'stale');
  assert.throws(() =>
    applyOrder(second.state, { ...refund, cancelled: true }, r, eligible),
  );
  const full = applyOrder(
    second.state,
    order({ updatedAt: '2026-09-03', cancelled: true }),
    r,
    eligible,
  );
  assert.equal(
    full.entries.reduce((n, e) => n + e.deltaMinor, 0),
    -1250,
  );
  assert.equal(initial.state.orders.order1.base, 10000);
});
void test('customer book survives code conflict on later sale and expires', () => {
  const initial = applyOrder(emptyState(), order(), rules(), eligible);
  const repeat = order({
    id: 'order2',
    createdAt: '2026-10-01',
    updatedAt: '2026-10-01',
    settledAt: '2026-10-01',
    newCustomer: false,
    purchaseNumber: 2,
    touches: [],
  });
  const second = applyOrder(initial.state, repeat, rules(), eligible);
  assert.equal(
    second.entries.find((e) => e.kind === 'relationship')?.minor,
    500,
  );
  const third = applyOrder(
    second.state,
    {
      ...repeat,
      id: 'order3',
      touches: [{ ...order().touches[0], ambassador: 'other' }],
    },
    rules(),
    eligible,
  );
  assert.equal(third.state.books.customer1.ambassador, 'ambassador');
  assert.equal(third.state.orders.order3.ambassador, 'other');
  assert.equal(
    attribution(
      { ...repeat, createdAt: '2028-01-01' },
      third.state,
      rules(),
      eligible,
    ).reason,
    'unattributed',
  );
});
void test('missions target eligible SKUs, reverse completion and keep XP separate', () => {
  const r = rules();
  r.missions = [
    {
      id: 'launch',
      lane: 'commerce',
      startsAt: '2026-09-01',
      endsAt: '2026-10-01',
      metric: 'revenue',
      target: 10000,
      products: [],
      skus: ['sku1'],
      boostBps: 500,
      completionMinor: 200,
      xp: 100,
    },
  ];
  const first = applyOrder(emptyState(), order(), r, eligible);
  assert.equal(
    first.entries.reduce((n, e) => n + e.deltaMinor, 0),
    2200,
  );
  assert.equal(
    first.entries.reduce((n, e) => n + e.deltaXp, 0),
    100,
  );
  const refund = applyOrder(
    first.state,
    order({ updatedAt: '2026-10-02', chargeback: true }),
    r,
    eligible,
  );
  assert.equal(
    refund.entries.reduce((n, e) => n + e.deltaMinor, 0),
    -2200,
  );
  assert.equal(
    refund.entries.reduce((n, e) => n + e.deltaXp, 0),
    -100,
  );
  const denied = applyOrder(
    emptyState(),
    order({ customer: 'self' }),
    r,
    eligible,
  );
  assert.equal(
    denied.entries.reduce((n, e) => n + e.deltaMinor, 0),
    0,
  );
});
void test('new earning lanes and objective missions require no schema change', () => {
  const r = rules();
  r.missions = [
    {
      id: 'shops',
      lane: 'field',
      startsAt: '2026-09-01',
      endsAt: '2026-10-01',
      metric: 'objectives',
      target: 2,
      products: [],
      skus: [],
      boostBps: 0,
      completionMinor: 5000,
      xp: 500,
    },
  ];
  const result = applyObjective(
    emptyState(),
    {
      id: 'visit',
      ambassador: 'ambassador',
      lane: 'field',
      at: '2026-09-02',
      count: 2,
      bountyMinor: 2500,
      xp: 20,
      reason: 'Two verified barber placements',
    },
    r,
  );
  const view = economicPosition(result.state, 'ambassador', r, '2026-11-01');
  assert.equal(view.availableMinor, 7500);
  assert.equal(view.progression.xp, 520);
});
async function setup() {
  const pg = new PGlite();
  for (const f of readdirSync(
    new URL('../migrations/postgres/', import.meta.url),
  )
    .filter((f) => f.endsWith('.sql'))
    .sort())
    await pg.exec(
      readFileSync(
        new URL(`../migrations/postgres/${f}`, import.meta.url),
        'utf8',
      ),
    );
  for (const f of [
    'commerce/prepared/0006_commerce.sql',
    'economics/prepared/0007_economics.sql',
  ])
    await pg.exec(
      readFileSync(new URL(`../docs/${f}`, import.meta.url), 'utf8'),
    );
  await pg.exec(`INSERT INTO invitations(id,token_hash,email,name,track,expires_at,created_at,created_by) VALUES('invite','hash','member@test.example','Member','ambassador','2027-01-01','2026-01-01','owner');
 INSERT INTO members(user_id,email,name,track,status,wholesale_status,joined_at,invitation_id) VALUES('member','member@test.example','Member','ambassador','active','not_reviewed','2026-01-01','invite');
 INSERT INTO commerce_shops(shop) VALUES('test.myshopify.com');
 INSERT INTO commerce_rules(shop,id,name,basis_points,hold_days,starts_at,created_by) VALUES('test.myshopify.com','old','Old',1500,30,'2026-01-01','owner');
 INSERT INTO commerce_ambassadors(shop,id,member_id,rule_id) VALUES('test.myshopify.com','ambassador','member','old');`);
  const ctx: Context = {
    db: {
      query: async <T extends Record<string, unknown>>(
        q: string,
        values: unknown[] = [],
      ) => ({ rows: (await pg.query<T>(q, values)).rows }),
    },
    shop: 'test.myshopify.com',
    actor: 'owner',
    founderId: 'owner',
  };
  return { pg, ctx };
}
void test('transactional persistence, audit immutability, replay, authorization, manual payout and negative carry', async () => {
  const { pg, ctx } = await setup();
  try {
    const r = rules();
    const command = {
      kind: 'order' as const,
      id: 'webhook1',
      reason: 'Verified Shopify snapshot',
      order: order(),
    };
    assert.equal(await execute(ctx, command, r), 'applied');
    assert.equal(await execute(ctx, command, r), 'duplicate');
    assert.equal(
      await execute(ctx, { ...command, id: 'different-topic' }, r),
      'applied',
    );
    assert.equal(
      (
        await pg.query<{ n: number }>(
          'SELECT count(*)::int AS n FROM collective_economic_ledger WHERE delta_minor<>0',
        )
      ).rows[0].n,
      1,
    );
    await assert.rejects(() =>
      execute(ctx, { ...command, reason: 'changed' }, r),
    );
    await assert.rejects(() =>
      execute(
        { ...ctx, actor: 'stranger' },
        { ...command, id: 'forbidden' },
        r,
      ),
    );
    await assert.rejects(() =>
      pg.exec('DELETE FROM collective_economic_ledger'),
    );
    await assert.rejects(() =>
      pg.exec("UPDATE collective_economic_rules SET digest='changed'"),
    );
    const pay = {
      kind: 'payout' as const,
      id: 'reserve',
      reason: 'Local bookkeeping test',
      paymentId: 'p1',
      ambassador: 'ambassador',
      action: 'reserve' as const,
      minor: 1500,
      at: '2026-11-01',
      reference: null,
    };
    await execute(ctx, pay, r);
    await execute(
      ctx,
      {
        ...pay,
        id: 'paid',
        action: 'paid',
        reference: 'external-test-reference',
      },
      r,
    );
    await execute(
      ctx,
      {
        ...command,
        id: 'refund',
        order: order({ updatedAt: '2026-11-02', cancelled: true }),
      },
      r,
    );
    const view = await readPosition(
      { ...ctx, actor: 'member' },
      r,
      '2026-11-03',
    );
    assert.equal(view.availableMinor, -1500);
    assert.equal(view.paidMinor, 1500);
    await assert.rejects(() =>
      readPosition({ ...ctx, actor: 'stranger' }, r, '2026-11-03'),
    );
    const changed = rules();
    changed.tiers[0].basisPoints = 1700;
    await assert.rejects(() =>
      execute(ctx, { ...command, id: 'bad-version' }, changed),
    );
    assert.equal(
      (
        await pg.query<{ n: number }>(
          "SELECT count(*)::int AS n FROM collective_economic_events WHERE id='bad-version'",
        )
      ).rows[0].n,
      0,
    );
  } finally {
    await pg.close();
  }
});
void test('manual holds persist across order refresh; corrections never rewrite original award', async () => {
  const { pg, ctx } = await setup();
  try {
    const r = rules();
    await execute(
      ctx,
      { kind: 'order', id: 'o1', reason: 'order', order: order() },
      r,
    );
    const awardKey = JSON.stringify(['order', 'order1', 'sale']);
    await execute(
      ctx,
      {
        kind: 'hold',
        id: 'h1',
        reason: 'Fraud investigation',
        awardKey,
        at: '2026-09-02',
      },
      r,
    );
    await execute(
      ctx,
      {
        kind: 'order',
        id: 'o2',
        reason: 'refresh',
        order: order({ updatedAt: '2026-09-03' }),
      },
      r,
    );
    assert.equal(
      (await readPosition({ ...ctx, actor: 'member' }, r, '2026-11-01'))
        .heldMinor,
      1500,
    );
    await assert.rejects(() =>
      execute(
        ctx,
        {
          kind: 'approve',
          id: 'early',
          reason: 'too early',
          awardKey,
          at: '2026-09-02',
        },
        r,
      ),
    );
    await execute(
      ctx,
      {
        kind: 'adjust',
        id: 'a1',
        reason: 'Verified content supplement',
        awardKey,
        deltaMinor: 200,
        deltaXp: 10,
      },
      r,
    );
    await execute(
      ctx,
      {
        kind: 'order',
        id: 'o3',
        reason: 'refresh',
        order: order({ updatedAt: '2026-09-04' }),
      },
      r,
    );
    assert.equal(
      (await readPosition({ ...ctx, actor: 'member' }, r, '2026-11-01'))
        .lifetimeNetMinor,
      1700,
    );
  } finally {
    await pg.close();
  }
});

void test('concurrent processing retries without duplicate commissions', async () => {
  const { pg, ctx } = await setup();
  try {
    const results = await Promise.all([
      execute(
        ctx,
        { kind: 'order', id: 'concurrent1', reason: 'order', order: order() },
        rules(),
      ),
      execute(
        ctx,
        {
          kind: 'order',
          id: 'concurrent2',
          reason: 'order',
          order: order({ id: 'order2', customer: 'customer2' }),
        },
        rules(),
      ),
    ]);
    assert.deepEqual(results, ['applied', 'applied']);
    assert.equal(
      (await readPosition({ ...ctx, actor: 'member' }, rules(), '2026-11-01'))
        .availableMinor,
      3000,
    );
    assert.equal(
      (
        await pg.query<{ n: number }>(
          'SELECT count(*)::int AS n FROM collective_economic_events',
        )
      ).rows[0].n,
      2,
    );
  } finally {
    await pg.close();
  }
});

void test('increase restarts hold and mission boundaries do not leak', () => {
  const r = rules();
  const first = applyOrder(emptyState(), order(), r, eligible);
  const increased = applyOrder(
    first.state,
    order({
      updatedAt: '2026-10-15',
      lines: [{ ...order().lines[0], netMinor: 20000 }],
    }),
    r,
    eligible,
  );
  const sale = Object.values(increased.state.awards).find(
    (a) => a.kind === 'sale',
  );
  assert.equal(sale?.releaseAt, '2026-11-14T00:00:00.000Z');
  assert.equal(
    economicPosition(increased.state, 'ambassador', r, '2026-10-20')
      .availableMinor,
    0,
  );
  r.missions = [
    {
      id: 'ended',
      lane: 'commerce',
      startsAt: '2026-08-01',
      endsAt: '2026-09-01',
      metric: 'orders',
      target: 1,
      products: [],
      skus: [],
      boostBps: 500,
      completionMinor: 500,
      xp: 50,
    },
  ];
  const ended = applyOrder(emptyState(), order(), r, eligible);
  assert.equal(
    ended.entries.reduce((n, e) => n + e.deltaMinor, 0),
    1500,
  );
});

void test('Shopify adapter requires verified complete source facts and reconciled amounts', async () => {
  const { processPreparedOrder } =
    await import('../lib/economics/shopify-adapter.ts');
  const { pg, ctx } = await setup();
  try {
    const snapshot = {
      id: 'gid://shopify/Order/1',
      name: '#1',
      createdAt: order().createdAt,
      updatedAt: order().updatedAt,
      fetchedAt: order().updatedAt,
      customerId: 'customer1',
      currency: 'USD',
      codes: ['GENT'],
      base: 10000,
      hold: null,
      cancelled: false,
      financialStatus: 'PAID',
      fulfillmentStatus: 'FULFILLED',
      refundIds: [],
      fingerprint: 'test',
    };
    const details = {
      lines: order().lines,
      complete: true,
      taxExclusive: true,
      firstSettledAt: order().settledAt,
      isNewCustomer: true,
      purchaseNumber: 1,
      subscription: false,
      touches: order().touches,
    };
    await assert.rejects(() =>
      processPreparedOrder(ctx, snapshot, details, rules()),
    );
    const worker = { ...ctx, workerAuthenticated: true };
    await assert.rejects(() =>
      processPreparedOrder(
        worker,
        snapshot,
        { ...details, complete: false },
        rules(),
      ),
    );
    await assert.rejects(() =>
      processPreparedOrder(
        worker,
        { ...snapshot, base: 9999 },
        details,
        rules(),
      ),
    );
    assert.equal(
      await processPreparedOrder(worker, snapshot, details, rules()),
      'applied',
    );
    assert.equal(
      await processPreparedOrder(worker, snapshot, details, rules()),
      'duplicate',
    );
  } finally {
    await pg.close();
  }
});

void test('database rejects legacy/new ledger overlap in either direction', async () => {
  const { pg, ctx } = await setup();
  try {
    await execute(
      ctx,
      { kind: 'order', id: 'new-order', reason: 'test', order: order() },
      rules(),
    );
    const seed = async (id: string) => {
      await pg.query(
        `INSERT INTO commerce_orders(shop,id,snapshot,updated_at,fetched_at,fingerprint,ambassador_id,currency,base_minor) VALUES('test.myshopify.com',$1,'{}',now(),now(),'test','ambassador','USD',10000)`,
        [id],
      );
    };
    const legacy = (id: string) =>
      pg.query(
        `INSERT INTO commerce_ledger(shop,order_id,ambassador_id,currency,delta_minor,revision,rule_snapshot,reason) VALUES('test.myshopify.com',$1,'ambassador','USD',1500,'test','{}','test')`,
        [id],
      );
    await seed('order1');
    await assert.rejects(() => legacy('order1'));
    await seed('legacy2');
    await legacy('legacy2');
    await assert.rejects(() =>
      execute(
        ctx,
        {
          kind: 'order',
          id: 'legacy-overlap',
          reason: 'test',
          order: order({ id: 'legacy2' }),
        },
        rules(),
      ),
    );
    assert.equal(
      (
        await pg.query<{ n: number }>(
          "SELECT count(*)::int AS n FROM collective_economic_events WHERE id='legacy-overlap'",
        )
      ).rows[0].n,
      0,
    );
  } finally {
    await pg.close();
  }
});
