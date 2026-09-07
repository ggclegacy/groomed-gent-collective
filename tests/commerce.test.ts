import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import {
  minorUnits,
  commission,
  normalizeOrder,
  shopDomain,
  type ShopifyOrder,
  type Database,
} from '../lib/commerce/model.ts';
import { receiveWebhook, verifyHmac } from '../lib/commerce/webhook.ts';
import { commerceApi } from '../lib/commerce/service.ts';
import { ShopifyClient } from '../lib/commerce/shopify.ts';
import { drain, enqueue, startSync } from '../lib/commerce/worker.ts';
const shop = 'collective-test.myshopify.com';
function fixture(patch: Partial<ShopifyOrder> = {}): ShopifyOrder {
  return {
    id: 'gid://shopify/Order/100',
    name: '#100',
    createdAt: '2026-09-01T12:00:00Z',
    updatedAt: '2026-09-01T12:00:00Z',
    cancelledAt: null,
    test: false,
    taxesIncluded: false,
    currencyCode: 'USD',
    displayFinancialStatus: 'PAID',
    displayFulfillmentStatus: 'FULFILLED',
    discountCodes: ['GENT-ONE'],
    customer: { id: 'gid://shopify/Customer/90' },
    currentSubtotalPriceSet: {
      shopMoney: { amount: '100.00', currencyCode: 'USD' },
    },
    lineItems: {
      nodes: [{ id: 'gid://shopify/LineItem/1', isGiftCard: false }],
      pageInfo: { hasNextPage: false, endCursor: null },
    },
    refunds: [],
    ...patch,
  };
}
async function setup() {
  const pg = new PGlite();
  for (const file of readdirSync(
    new URL('../migrations/postgres/', import.meta.url),
  )
    .filter((f) => f.endsWith('.sql'))
    .sort())
    await pg.exec(
      readFileSync(
        new URL(`../migrations/postgres/${file}`, import.meta.url),
        'utf8',
      ),
    );
  await pg.exec(readFileSync(new URL('../docs/commerce/prepared/0006_commerce.sql', import.meta.url), 'utf8'));
  const db: Database = {
    query: async <T extends Record<string, unknown>>(
      q: string,
      v: unknown[] = [],
    ) => ({ rows: (await pg.query<T>(q, v)).rows }),
  };
  await pg.exec(`INSERT INTO invitations(id,token_hash,email,name,track,expires_at,created_at,created_by) VALUES('invite','hash','member@test.example','Member','ambassador','2027-01-01','2026-01-01','owner');
    INSERT INTO members(user_id,email,name,track,status,wholesale_status,joined_at,invitation_id) VALUES('member','member@test.example','Member','ambassador','active','not_reviewed','2026-01-01','invite');`);
  await db.query(
    "INSERT INTO commerce_shops(shop,reconciled_at,reconcile_started_at) VALUES($1,now(),'2026-01-01')",
    [shop],
  );
  await db.query(
    `INSERT INTO commerce_rules(shop,id,name,basis_points,hold_days,starts_at,created_by) VALUES($1,'rule','Test rule',1500,30,'2026-01-01','owner')`,
    [shop],
  );
  await db.query(
    `INSERT INTO commerce_ambassadors(shop,id,member_id,rule_id) VALUES($1,'ambassador','member','rule')`,
    [shop],
  );
  await db.query(
    `INSERT INTO commerce_offers(shop,id,purpose,shopify_discount_id,description) VALUES($1,'offer','customer','gid://shopify/DiscountCodeNode/1','Test fixture')`,
    [shop],
  );
  await db.query(
    `INSERT INTO commerce_codes(shop,code,ambassador_id,offer_id,starts_at) VALUES($1,'GENT-ONE','ambassador','offer','2026-01-01')`,
    [shop],
  );
  let tick = 0;
  const apply = (order = fixture()) =>
    db.query('SELECT commerce_apply_order($1,$2::jsonb) AS result', [
      shop,
      JSON.stringify(
        normalizeOrder(
          order,
          new Date(Date.UTC(2026, 8, 6, 12, 0, tick++)).toISOString(),
        ),
      ),
    ]);
  return { pg, db, apply };
}
void test('exact minor units and basis-point rounding support 0/2/3 decimal currencies and reject precision loss', () => {
  assert.equal(minorUnits('1.005', 'KWD'), 1005);
  assert.equal(minorUnits('10.00', 'JPY'), 10);
  assert.equal(minorUnits('10.01', 'USD'), 1001);
  assert.equal(commission(1001, 1500), 150);
  assert.equal(commission(1, 5000), 1);
  assert.throws(() => minorUnits('1.001', 'USD'));
  assert.throws(() => minorUnits('-1', 'USD'));
  assert.throws(() => minorUnits('9007199254740992', 'JPY'));
  assert.throws(() => minorUnits('1', 'ZZZ'));
  assert.throws(() => shopDomain('example.com/path'));
  assert.throws(() => shopDomain('x.myshopify.com@evil.test'));
});
void test('normalization holds ambiguous cases and preserves refund/cancellation semantics', () => {
  assert.equal(normalizeOrder(fixture()).base, 10000);
  assert.equal(normalizeOrder(fixture({ cancelledAt: '2026-09-02' })).base, 0);
  assert.equal(normalizeOrder(fixture({ test: true })).base, 0);
  assert.equal(
    normalizeOrder(fixture({ taxesIncluded: true })).hold,
    'tax_inclusive_review',
  );
  assert.equal(
    normalizeOrder(fixture({ displayFinancialStatus: 'PARTIALLY_PAID' })).hold,
    'payment_not_settled',
  );
  assert.equal(
    normalizeOrder(
      fixture({
        refunds: [
          {
            id: 'r',
            refundLineItems: { nodes: [] },
            orderAdjustments: { nodes: [] },
          },
        ],
      }),
    ).hold,
    'non_line_refund_review',
  );
  assert.throws(() => normalizeOrder(fixture({ currencyCode: 'CAD' })));
});
void test('real PostgreSQL migration: repeated paid event, partial refund, order edit, cancellation, stale delivery, immutable history', async () => {
  const { pg, db, apply } = await setup();
  try {
    await apply();
    await apply();
    assert.equal(
      (await db.query('SELECT count(*)::int AS n FROM commerce_ledger')).rows[0]
        .n,
      1,
    );
    const refund = fixture({
      updatedAt: '2026-09-02T12:00:00Z',
      displayFinancialStatus: 'PARTIALLY_REFUNDED',
      currentSubtotalPriceSet: {
        shopMoney: { amount: '60.00', currencyCode: 'USD' },
      },
      refunds: [
        {
          id: 'r',
          refundLineItems: { nodes: [{ id: 'rl' }] },
          orderAdjustments: { nodes: [] },
        },
      ],
    });
    await apply(refund);
    await apply(refund);
    await apply();
    assert.equal(
      (await db.query('SELECT target_minor::text AS n FROM commerce_orders'))
        .rows[0].n,
      '900',
    );
    await apply({
      ...refund,
      updatedAt: '2026-09-03T12:00:00Z',
      currentSubtotalPriceSet: {
        shopMoney: { amount: '80.00', currencyCode: 'USD' },
      },
    });
    await apply({
      ...refund,
      updatedAt: '2026-09-04T12:00:00Z',
      cancelledAt: '2026-09-04T12:00:00Z',
    });
    const amounts = (
      await db.query(
        'SELECT delta_minor::text AS n FROM commerce_ledger ORDER BY id',
      )
    ).rows.map((r) => r.n);
    assert.deepEqual(amounts, ['1500', '-600', '300', '-1200']);
    await assert.rejects(() =>
      db.query('UPDATE commerce_ledger SET delta_minor=0'),
    );
    await assert.rejects(() => db.query('DELETE FROM commerce_ledger'));
    await assert.rejects(() =>
      db.query('UPDATE commerce_rules SET basis_points=9999'),
    );
  } finally {
    await pg.close();
  }
});
void test('rule snapshot freezes historical rate; unknown/retired-at-order-time codes do not invent attribution', async () => {
  const { pg, db, apply } = await setup();
  try {
    await apply();
    await db.query(
      `INSERT INTO commerce_rules(shop,id,name,basis_points,hold_days,starts_at,created_by) VALUES($1,'new','New',5000,60,'2026-09-02','owner')`,
      [shop],
    );
    await db.query(
      `UPDATE commerce_ambassadors SET rule_id='new' WHERE shop=$1`,
      [shop],
    );
    await apply(
      fixture({
        updatedAt: '2026-09-03T12:00:00Z',
        currentSubtotalPriceSet: {
          shopMoney: { amount: '50.00', currencyCode: 'USD' },
        },
      }),
    );
    assert.equal(
      (await db.query('SELECT target_minor::text AS n FROM commerce_orders'))
        .rows[0].n,
      '750',
    );
    await apply(
      fixture({ id: 'gid://shopify/Order/101', discountCodes: ['UNKNOWN'] }),
    );
    assert.equal(
      (
        await db.query(
          `SELECT ambassador_id FROM commerce_orders WHERE id='gid://shopify/Order/101'`,
        )
      ).rows[0].ambassador_id,
      null,
    );
  } finally {
    await pg.close();
  }
});
void test('payouts reserve exactly once, block duplicate disbursement, and carry post-payment refund debt into future earnings', async () => {
  const { pg, db, apply } = await setup();
  try {
    await apply();
    const payout = (id: string, action: string, ref: string | null = null) =>
      db.query('SELECT commerce_payout($1,$2,$3,$4,$5,$6)', [
        shop,
        id,
        'USD',
        action,
        'owner',
        ref,
      ]);
    await assert.rejects(() => payout('too-early', 'approve'));
    await db.query(
      `UPDATE commerce_orders SET release_at=now()-interval '1 day'`,
    );
    await payout('batch', 'approve');
    await payout('batch', 'approve');
    assert.equal(
      (await db.query('SELECT count(*)::int AS n FROM commerce_payout_items'))
        .rows[0].n,
      1,
    );
    await assert.rejects(() => payout('duplicate', 'approve'));
    await payout('batch', 'paid', 'bank-reference');
    await payout('batch', 'paid', 'bank-reference');
    await assert.rejects(() => payout('batch', 'void'));
    await assert.rejects(() => payout('batch', 'paid', 'different-reference'));
    await apply(
      fixture({
        updatedAt: '2026-09-03T00:00:00Z',
        currentSubtotalPriceSet: {
          shopMoney: { amount: '50.00', currencyCode: 'USD' },
        },
      }),
    );
    assert.equal(
      (
        await db.query(
          'SELECT amount_minor::text AS n FROM commerce_available($1,$2)',
          [shop, 'USD'],
        )
      ).rows[0].n,
      '-750',
    );
    await assert.rejects(() => payout('negative', 'approve'));
  } finally {
    await pg.close();
  }
});
void test('approved batch cannot be marked paid after a refund; void releases the reservation', async () => {
  const { pg, db, apply } = await setup();
  try {
    await apply();
    await db.query(
      `UPDATE commerce_orders SET release_at=now()-interval '1 day'`,
    );
    const p = (a: string) =>
      db.query(`SELECT commerce_payout($1,'b','USD',$2,'owner','ref')`, [
        shop,
        a,
      ]);
    await p('approve');
    await apply(
      fixture({
        updatedAt: '2026-09-02T00:00:00Z',
        cancelledAt: '2026-09-02T00:00:00Z',
      }),
    );
    await assert.rejects(() => p('paid'));
    await p('void');
  } finally {
    await pg.close();
  }
});
void test('webhook HMAC checks exact bytes and shop; retries deduplicate durably without retaining customer PII', async () => {
  const { pg, db } = await setup();
  try {
    const secret = 'test-secret';
    const raw = JSON.stringify({
      id: 100,
      admin_graphql_api_id: 'gid://shopify/Order/100',
      email: 'do-not-retain@example.test',
    });
    const hmac = createHmac('sha256', secret).update(raw).digest('base64');
    assert.equal(verifyHmac(Buffer.from(raw), hmac, secret), true);
    assert.equal(verifyHmac(Buffer.from(raw + ' '), hmac, secret), false);
    const request = (signature = hmac, domain = shop) =>
      new Request('https://app.test/api/shopify/webhooks', {
        method: 'POST',
        body: raw,
        headers: {
          'x-shopify-hmac-sha256': signature,
          'x-shopify-shop-domain': domain,
          'x-shopify-topic': 'orders/paid',
          'x-shopify-webhook-id': 'delivery-100',
          'x-shopify-api-version': '2026-07',
        },
      });
    assert.equal(
      (await receiveWebhook(request('bad'), db, { shop, secret })).status,
      401,
    );
    assert.equal(
      (
        await receiveWebhook(request(hmac, 'wrong.myshopify.com'), db, {
          shop,
          secret,
        })
      ).status,
      403,
    );
    assert.equal(
      (await receiveWebhook(request(), db, { shop, secret })).status,
      200,
    );
    await receiveWebhook(request(), db, { shop, secret });
    const receipts = await db.query('SELECT * FROM commerce_receipts');
    assert.equal(receipts.rows.length, 1);
    assert.equal(
      JSON.stringify(receipts.rows).includes('do-not-retain'),
      false,
    );
  } finally {
    await pg.close();
  }
});
void test('member API ignores forged owner IDs, scopes reads, requires founder and same-origin writes', async () => {
  const { pg, db, apply } = await setup();
  try {
    await apply();
    const client = new ShopifyClient({
      shop,
      clientId: 'test',
      clientSecret: 'secret',
    });
    const call = (
      path: string,
      userId: string | null,
      method = 'GET',
      origin = 'https://app.test',
      body = {},
    ) =>
      commerceApi(
        new Request('https://app.test/api/commerce/' + path, {
          method,
          headers: {
            origin,
            'content-type': 'application/json',
            'oai-authenticated-user-id': 'owner',
          },
          ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
        }),
        { db, shop, client, userId, ownerId: 'owner' },
      );
    assert.equal((await call('admin', null)).status, 401);
    assert.equal((await call('admin', 'member')).status, 403);
    assert.equal(
      (await call('sync', 'owner', 'POST', 'https://evil.test')).status,
      403,
    );
    const perf = (await (
      await call('performance?ambassadorId=other', 'member')
    ).json()) as { state: string; orders: unknown[] };
    assert.equal(perf.state, 'ready');
    assert.equal(perf.orders.length, 1);
    assert.equal(
      ((await (await call('performance', 'other')).json()) as { state: string })
        .state,
      'pending',
    );
    await db.query(
      `UPDATE members SET status='suspended' WHERE user_id='member'`,
    );
    assert.equal(
      (
        (await (await call('performance', 'member')).json()) as {
          state: string;
        }
      ).state,
      'pending',
    );
  } finally {
    await pg.close();
  }
});
void test('worker fetches canonical order, retries failure, and recovers expired leases', async () => {
  const { pg, db } = await setup();
  try {
    let fail = false;
    const fetcher: typeof fetch = async (url) =>
      (url instanceof Request ? url.url : url.toString()).includes('/oauth/')
        ? Response.json({ access_token: 'test', expires_in: 86400 })
        : fail
          ? Response.json({ errors: [{ message: 'throttled' }] })
          : Response.json(
              { data: { order: fixture() } },
              { headers: { 'x-shopify-api-version': '2026-07' } },
            );
    const client = new ShopifyClient(
      { shop, clientId: 'test', clientSecret: 'secret' },
      fetcher,
    );
    await enqueue(db, shop, 'sync/order', 'gid://shopify/Order/100');
    assert.deepEqual(await drain(db, client, shop, 1), {
      completed: 1,
      failed: 0,
    });
    assert.equal(
      (await db.query('SELECT count(*)::int AS n FROM commerce_ledger')).rows[0]
        .n,
      1,
    );
    fail = true;
    await enqueue(db, shop, 'sync/order', 'gid://shopify/Order/100');
    assert.deepEqual(await drain(db, client, shop, 1), {
      completed: 0,
      failed: 1,
    });
    await db.query(
      `UPDATE commerce_receipts SET state='processing',lease_until=now()-interval '1 second' WHERE state='pending'`,
    );
    fail = false;
    assert.deepEqual(await drain(db, client, shop, 1), {
      completed: 1,
      failed: 0,
    });
    assert.equal(
      (await db.query('SELECT count(*)::int AS n FROM commerce_ledger')).rows[0]
        .n,
      1,
    );
  } finally {
    await pg.close();
  }
});
void test('paginated reconciliation schedules all pages and marks readiness only after all durable jobs complete', async () => {
  const { pg, db } = await setup();
  try {
    await db.query('UPDATE commerce_shops SET reconciled_at=NULL');
    const fetcher: typeof fetch = async (url, init) => {
      if (
        (url instanceof Request ? url.url : url.toString()).includes('/oauth/')
      )
        return Response.json({ access_token: 'token', expires_in: 86400 });
      const { query, variables } = JSON.parse(
        typeof init?.body === 'string' ? init.body : '',
      );
      const kind = query.includes('CollectiveVariants')
        ? 'productVariants'
        : query.includes('CollectiveDiscounts')
          ? 'discountNodes'
          : query.includes('CollectiveDisputes')
            ? 'disputes'
            : query.includes('CollectiveCustomers')
              ? 'customers'
              : query.includes('CollectiveOrders')
                ? 'orders'
                : 'products';
      return Response.json({
        data: {
          [kind]: {
            nodes: [],
            pageInfo: {
              hasNextPage: kind === 'products' && !variables.after,
              endCursor: 'page-2',
            },
          },
        },
      });
    };
    const client = new ShopifyClient(
      { shop, clientId: 'test', clientSecret: 'secret' },
      fetcher,
    );
    await startSync(db, shop);
    await drain(db, client, shop, 1);
    assert.equal(
      (await db.query('SELECT reconciled_at FROM commerce_shops')).rows[0]
        .reconciled_at,
      null,
    );
    await drain(db, client, shop, 10);
    assert.ok(
      (await db.query('SELECT reconciled_at FROM commerce_shops')).rows[0]
        .reconciled_at,
    );
  } finally {
    await pg.close();
  }
});

void test('ambiguous codes, self purchases, backbar codes, and disputes cannot become payable', async () => {
  const { pg, db, apply } = await setup();
  try {
    await pg.exec(`INSERT INTO invitations(id,token_hash,email,name,track,expires_at,created_at,created_by) VALUES('i2','h2','two@test.example','Two','ambassador','2027-01-01','2026-01-01','owner');
      INSERT INTO members(user_id,email,name,track,status,wholesale_status,joined_at,invitation_id) VALUES('m2','two@test.example','Two','ambassador','active','not_reviewed','2026-01-01','i2');`);
    await db.query(
      `INSERT INTO commerce_ambassadors(shop,id,member_id,rule_id) VALUES($1,'a2','m2','rule')`,
      [shop],
    );
    await db.query(
      `INSERT INTO commerce_codes(shop,code,ambassador_id,offer_id,starts_at) VALUES($1,'GENT-TWO','a2','offer','2026-01-01')`,
      [shop],
    );
    await apply(fixture({ discountCodes: ['GENT-ONE', 'GENT-TWO'] }));
    let order = (await db.query('SELECT * FROM commerce_orders')).rows[0];
    assert.equal(order.hold_reason, 'ambiguous_attribution');
    assert.equal(order.ambassador_id, null);
    await apply(fixture({ updatedAt: '2026-09-02T00:00:00Z' }));
    await db.query(
      `UPDATE commerce_ambassadors SET shopify_customer_id='gid://shopify/Customer/90' WHERE id='ambassador'`,
    );
    await apply(fixture({ updatedAt: '2026-09-03T00:00:00Z' }));
    order = (await db.query('SELECT * FROM commerce_orders')).rows[0];
    assert.equal(order.hold_reason, 'self_purchase_review');
    await db.query(
      `INSERT INTO commerce_offers(shop,id,purpose,shopify_discount_id,description) VALUES($1,'backbar','barber_backbar','gid://shopify/DiscountCodeNode/2','Backbar')`,
      [shop],
    );
    await db.query(
      `INSERT INTO commerce_codes(shop,code,ambassador_id,offer_id,starts_at) VALUES($1,'BARBER','ambassador','backbar','2026-01-01')`,
      [shop],
    );
    await apply(
      fixture({
        updatedAt: '2026-09-04T00:00:00Z',
        discountCodes: ['GENT-ONE', 'BARBER'],
      }),
    );
    assert.equal(
      (await db.query('SELECT hold_reason FROM commerce_orders')).rows[0]
        .hold_reason,
      'backbar_purchase',
    );
    await db.query(
      `INSERT INTO commerce_disputes(shop,id,order_id,status) VALUES($1,'dispute','gid://shopify/Order/100','NEEDS_RESPONSE')`,
      [shop],
    );
    await apply(fixture({ updatedAt: '2026-09-05T00:00:00Z' }));
    assert.equal(
      (await db.query('SELECT hold_reason FROM commerce_orders')).rows[0]
        .hold_reason,
      'dispute_open',
    );
    await assert.rejects(() =>
      db.query(`SELECT commerce_payout($1,'b','USD','approve','owner')`, [
        shop,
      ]),
    );
    await db.query(`UPDATE commerce_disputes SET status='LOST'`);
    await apply(fixture({ updatedAt: '2026-09-05T00:00:00Z' }));
    assert.equal(
      (await db.query('SELECT hold_reason FROM commerce_orders')).rows[0]
        .hold_reason,
      'dispute_loss_review',
    );
  } finally {
    await pg.close();
  }
});
void test('founder configuration is audited atomically, rejects unverified offers, and cannot create discounts from commission rates', async () => {
  const { pg, db } = await setup();
  try {
    const client = new ShopifyClient({
      shop,
      clientId: 'test',
      clientSecret: 'secret',
    });
    const call = (action: string, body: Record<string, unknown>) =>
      commerceApi(
        new Request('https://app.test/api/commerce/' + action, {
          method: 'POST',
          headers: {
            origin: 'https://app.test',
            'content-type': 'application/json',
          },
          body: JSON.stringify(body),
        }),
        { db, shop, client, userId: 'owner', ownerId: 'owner' },
      );
    assert.equal(
      (
        await call('rule', {
          id: 'new-rule',
          name: 'Approved rule',
          basisPoints: 1200,
          holdDays: 45,
          startsAt: '2026-09-06',
        })
      ).status,
      201,
    );
    assert.equal(
      (await db.query(`SELECT count(*)::int AS n FROM commerce_audit`)).rows[0]
        .n,
      1,
    );
    assert.equal(
      (
        await call('rule', {
          id: 'new-rule',
          name: 'Duplicate',
          basisPoints: 1200,
          holdDays: 45,
          startsAt: '2026-09-06',
        })
      ).status,
      409,
    );
    assert.equal(
      (await db.query(`SELECT count(*)::int AS n FROM commerce_audit`)).rows[0]
        .n,
      1,
    );
    assert.equal(
      (
        await call('offer', {
          id: 'unverified',
          purpose: 'customer',
          shopifyDiscountId: 'missing',
          description: 'No Shopify record',
        })
      ).status,
      409,
    );
    assert.equal(
      (await db.query(`SELECT count(*)::int AS n FROM commerce_offers`)).rows[0]
        .n,
      1,
    );
  } finally {
    await pg.close();
  }
});
void test('client reuses expiring tokens and rejects partial GraphQL errors and API version drift', async () => {
  let tokens = 0;
  let mode = 'ok';
  const fetcher: typeof fetch = async (url) => {
    if (
      (url instanceof Request ? url.url : url.toString()).includes('/oauth/')
    ) {
      tokens++;
      return Response.json({ access_token: 'token', expires_in: 86400 });
    }
    return Response.json(
      mode === 'partial'
        ? { data: { shop: {} }, errors: [{ message: 'denied' }] }
        : { data: { shop: { myshopifyDomain: shop } } },
      {
        headers: {
          'x-shopify-api-version': mode === 'drift' ? '2026-10' : '2026-07',
        },
      },
    );
  };
  const client = new ShopifyClient(
    { shop, clientId: 'test', clientSecret: 'secret' },
    fetcher,
  );
  await Promise.all([
    client.query('query { shop { id } }'),
    client.query('query { shop { id } }'),
  ]);
  assert.equal(tokens, 1);
  mode = 'partial';
  await assert.rejects(() => client.query('query { shop { id } }'));
  mode = 'drift';
  await assert.rejects(() => client.query('query { shop { id } }'));
});
void test('uninstall prevents financial processing and privacy deliveries remain visible for operator action', async () => {
  const { pg, db } = await setup();
  try {
    let calls = 0;
    const client = new ShopifyClient(
      { shop, clientId: 'test', clientSecret: 'secret' },
      async () => {
        calls++;
        throw new Error('no calls expected');
      },
    );
    await enqueue(db, shop, 'sync/order', 'gid://shopify/Order/100');
    await enqueue(db, shop, 'app/uninstalled', null);
    await enqueue(db, shop, 'customers/redact', null, { customerId: '90' });
    await drain(db, client, shop, 5);
    assert.equal(calls, 0);
    const rows = (
      await db.query('SELECT topic,state FROM commerce_receipts ORDER BY id')
    ).rows;
    assert.deepEqual(
      rows.map((r) => r.state),
      ['pending', 'done', 'dead'],
    );
    assert.equal(
      (await db.query('SELECT status FROM commerce_shops')).rows[0].status,
      'uninstalled',
    );
  } finally {
    await pg.close();
  }
});

void test('late payment restarts the holding period and missing old-order coverage blocks a fresh payout', async () => {
  const { pg, db, apply } = await setup();
  try {
    await apply(fixture({ displayFinancialStatus: 'PENDING' }));
    await db.query(
      `UPDATE commerce_orders SET release_at=now()-interval '1 day'`,
    );
    await apply(fixture({ updatedAt: '2026-09-02T00:00:00Z' }));
    assert.equal(
      (
        await db.query(
          `SELECT release_at>now()+interval '29 days' AS held FROM commerce_orders`,
        )
      ).rows[0].held,
      true,
    );
    await db.query(
      `UPDATE commerce_orders SET release_at=now()-interval '1 day'`,
    );
    await db.query(
      `UPDATE commerce_shops SET reconcile_started_at='2027-01-01'`,
    );
    await assert.rejects(() =>
      db.query(
        `SELECT commerce_payout($1,'missing-coverage','USD','approve','owner')`,
        [shop],
      ),
    );
  } finally {
    await pg.close();
  }
});
