import { randomUUID } from 'node:crypto';
import { boundedBody, json, type Database } from './model.ts';
import { ShopifyClient } from './shopify.ts';
import { drain, enqueue, startSync } from './worker.ts';
export interface CommerceContext {
  db: Database;
  shop: string;
  userId: string | null;
  ownerId?: string;
  client: ShopifyClient;
}
function textField(body: Record<string, unknown>, key: string, max = 160) {
  const value = body[key];
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw new Error(`Invalid ${key}`);
  return value.trim();
}
function integer(
  body: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
) {
  const value = body[key];
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  )
    throw new Error(`Invalid ${key}`);
  return value;
}
function dateField(body: Record<string, unknown>, key: string) {
  const value = textField(body, key);
  if (!Number.isFinite(Date.parse(value))) throw new Error(`Invalid ${key}`);
  return new Date(value).toISOString();
}
export async function commerceApi(request: Request, context: CommerceContext) {
  const { db, shop, userId, ownerId, client } = context;
  if (!userId)
    return json({ error: 'Sign in to view commerce activity.' }, 401);
  const action = new URL(request.url).pathname.split('/api/commerce/')[1] ?? '';
  const founder = !!ownerId && userId === ownerId;
  const member = await db.query(
    `SELECT a.id FROM commerce_ambassadors a JOIN members m ON m.user_id=a.member_id WHERE a.shop=$1 AND a.member_id=$2 AND a.status='active' AND m.status='active'`,
    [shop, userId],
  );
  if (action === 'performance' && request.method === 'GET') {
    if (!member.rows[0])
      return json({
        state: 'pending',
        message: 'Your ambassador commerce profile is not active.',
      });
    const id = member.rows[0].id;
    const status = await db.query(
      'SELECT status,reconciled_at FROM commerce_shops WHERE shop=$1',
      [shop],
    );
    if (status.rows[0]?.status !== 'active' || !status.rows[0]?.reconciled_at)
      return json({
        state: 'pending',
        message: 'Shopify reporting is awaiting a complete synchronization.',
      });
    const balances = await db.query(
      `WITH totals AS (
      SELECT currency,count(*)::int AS orders,sum(base_minor)::text AS revenue_minor,
        sum(CASE WHEN hold_reason IS NOT NULL OR release_at>now() THEN target_minor ELSE 0 END)::text AS pending_minor,
        sum(CASE WHEN hold_reason IS NULL AND release_at<=now() THEN target_minor ELSE 0 END)::text AS cleared_minor
      FROM commerce_orders WHERE shop=$1 AND ambassador_id=$2 GROUP BY currency
    ), payouts AS (SELECT b.currency,sum(CASE WHEN b.state='paid' THEN i.amount_minor ELSE 0 END)::text AS paid_minor,
      sum(CASE WHEN b.state='approved' THEN i.amount_minor ELSE 0 END)::text AS reserved_minor
      FROM commerce_payout_items i JOIN commerce_payout_batches b ON b.shop=i.shop AND b.id=i.batch_id
      WHERE i.shop=$1 AND i.ambassador_id=$2 GROUP BY b.currency)
    SELECT t.*,coalesce(p.paid_minor,'0') AS paid_minor,coalesce(p.reserved_minor,'0') AS reserved_minor
    FROM totals t LEFT JOIN payouts p USING(currency)`,
      [shop, id],
    );
    const orders = await db.query(
      `SELECT id,snapshot->>'name' AS name,currency,base_minor::text,target_minor::text,hold_reason,release_at,updated_at FROM commerce_orders WHERE shop=$1 AND ambassador_id=$2 ORDER BY updated_at DESC LIMIT 100`,
      [shop, id],
    );
    const codes = await db.query(
      'SELECT code,starts_at,ends_at FROM commerce_codes WHERE shop=$1 AND ambassador_id=$2',
      [shop, id],
    );
    return json({
      state: 'ready',
      source: 'Shopify + Collective ledger',
      updatedAt: status.rows[0].reconciled_at,
      balances: balances.rows,
      orders: orders.rows,
      codes: codes.rows,
    });
  }
  if (action === 'catalog' && request.method === 'GET') {
    if (!member.rows[0])
      return json({ error: 'Active ambassador membership required.' }, 403);
    const rows = await db.query(
      `SELECT r.id,r.document,r.synced_at FROM commerce_resources r JOIN commerce_shops s ON s.shop=r.shop
      WHERE r.shop=$1 AND r.kind='products' AND r.deleted_at IS NULL AND r.document->>'status'='ACTIVE'
      AND s.status='active' AND s.reconciled_at IS NOT NULL ORDER BY r.id LIMIT 100`,
      [shop],
    );
    return json({ source: 'Shopify', products: rows.rows, limit: 100 });
  }
  if (!founder) return json({ error: 'Founder access required.' }, 403);
  if (request.method === 'GET' && action === 'admin') {
    const queries = {
      shops:
        'SELECT shop,status,reconciled_at FROM commerce_shops WHERE shop=$1',
      ambassadors:
        'SELECT id,member_id,status,tier_id,rule_id FROM commerce_ambassadors WHERE shop=$1',
      tiers: 'SELECT id,name FROM commerce_tiers WHERE shop=$1',
      rules: 'SELECT * FROM commerce_rules WHERE shop=$1',
      offers: 'SELECT * FROM commerce_offers WHERE shop=$1',
      codes: 'SELECT * FROM commerce_codes WHERE shop=$1',
      queue:
        "SELECT id,topic,state,attempts,error_code,received_at FROM commerce_receipts WHERE shop=$1 AND state<>'done' ORDER BY id LIMIT 100",
      holds:
        'SELECT id,hold_reason,currency,target_minor::text FROM commerce_orders WHERE shop=$1 AND hold_reason IS NOT NULL ORDER BY updated_at DESC LIMIT 100',
      batches:
        'SELECT * FROM commerce_payout_batches WHERE shop=$1 ORDER BY created_at DESC LIMIT 100',
      sync: 'SELECT * FROM commerce_sync_runs WHERE shop=$1 ORDER BY started_at DESC LIMIT 20',
    };
    const result: Record<string, unknown> = {};
    for (const [key, sql] of Object.entries(queries))
      result[key] = (await db.query(sql, [shop])).rows;
    return json(result);
  }
  if (request.method !== 'POST') return json({ error: 'Not found' }, 404);
  if (
    request.headers.get('origin') !== new URL(request.url).origin ||
    !request.headers.get('content-type')?.startsWith('application/json')
  )
    return json({ error: 'Same-origin JSON required' }, 403);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(
      new TextDecoder().decode(await boundedBody(request, 16000)),
    );
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new Error();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }
  try {
    if (action === 'connect') {
      const result = await client.query<{ shop: { myshopifyDomain: string } }>(
        'query CollectiveConnection { shop { myshopifyDomain } }',
      );
      if (result.shop.myshopifyDomain !== shop)
        throw new Error('Shop mismatch');
      await db.query(
        `INSERT INTO commerce_shops(shop) VALUES($1) ON CONFLICT(shop) DO NOTHING`,
        [shop],
      );
      return json({ connected: true });
    }
    if (action === 'sync')
      return json({ runId: await startSync(db, shop) }, 202);
    if (action === 'drain') return json(await drain(db, client, shop, 1));
    if (action === 'replay') {
      const id = textField(body, 'receiptId');
      // Privacy and version/scope changes cannot be hidden by a generic retry button.
      await db.query(
        `WITH replay AS (UPDATE commerce_receipts SET state='pending',attempts=0,error_code=NULL,available_at=now()
        WHERE shop=$1 AND id=$2::bigint AND state='dead' AND topic NOT IN ('customers/data_request','customers/redact','shop/redact','app/scopes_update','orders/delete')
        AND coalesce((payload->>'versionMismatch')::boolean,false)=false RETURNING id)
        INSERT INTO commerce_audit(shop,actor,action,subject,detail) SELECT $1,$3,'replay',id::text,'{}' FROM replay`,
        [shop, id, userId],
      );
      return json({ requested: true });
    }
    if (action === 'order-refresh') {
      const id = textField(body, 'orderId');
      if (!/^gid:\/\/shopify\/Order\/\d+$/.test(id))
        throw new Error('Invalid order');
      await enqueue(db, shop, 'sync/order', id);
      return json({ queued: true }, 202);
    }
    if (action === 'payout') {
      const id = textField(body, 'batchId');
      const state = textField(body, 'action');
      const currency = textField(body, 'currency', 3);
      if (
        !/^[A-Z]{3}$/.test(currency) ||
        !['approve', 'paid', 'void'].includes(state)
      )
        throw new Error('Invalid payout');
      const result = await db.query(
        'SELECT commerce_payout($1,$2,$3,$4,$5,$6) AS state',
        [
          shop,
          id,
          currency,
          state,
          userId,
          state === 'paid' ? textField(body, 'reference') : null,
        ],
      );
      return json(result.rows[0]);
    }
    const id =
      typeof body.id === 'string' ? textField(body, 'id') : randomUUID();
    let statement: string;
    let values: unknown[];
    if (action === 'tier') {
      statement =
        'INSERT INTO commerce_tiers(shop,id,name) VALUES($1,$2,$3) RETURNING id';
      values = [shop, id, textField(body, 'name')];
    } else if (action === 'rule') {
      statement =
        'INSERT INTO commerce_rules(shop,id,name,basis_points,hold_days,starts_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id';
      values = [
        shop,
        id,
        textField(body, 'name'),
        integer(body, 'basisPoints', 0, 10000),
        integer(body, 'holdDays', 1, 365),
        dateField(body, 'startsAt'),
        userId,
      ];
    } else if (action === 'ambassador') {
      statement = `INSERT INTO commerce_ambassadors(shop,id,member_id,rule_id,tier_id)
        SELECT $1,$2,user_id,$4,$5 FROM members WHERE user_id=$3 AND status='active' RETURNING id`;
      values = [
        shop,
        id,
        textField(body, 'memberId'),
        textField(body, 'ruleId'),
        body.tierId ? textField(body, 'tierId') : null,
      ];
    } else if (action === 'ambassador-status') {
      const state = textField(body, 'status');
      if (!['active', 'suspended'].includes(state))
        throw new Error('Invalid status');
      statement =
        'UPDATE commerce_ambassadors SET status=$3 WHERE shop=$1 AND id=$2 RETURNING id';
      values = [shop, id, state];
    } else if (action === 'ambassador-customer') {
      statement = `UPDATE commerce_ambassadors SET shopify_customer_id=$3 WHERE shop=$1 AND id=$2
        AND EXISTS(SELECT 1 FROM commerce_resources WHERE shop=$1 AND kind='customers' AND id=$3 AND deleted_at IS NULL) RETURNING id`;
      values = [shop, id, textField(body, 'shopifyCustomerId')];
    } else if (action === 'ambassador-rule') {
      statement =
        'UPDATE commerce_ambassadors SET rule_id=$3,tier_id=$4 WHERE shop=$1 AND id=$2 RETURNING id';
      values = [
        shop,
        id,
        textField(body, 'ruleId'),
        body.tierId ? textField(body, 'tierId') : null,
      ];
    } else if (action === 'offer') {
      const purpose = textField(body, 'purpose');
      if (!['customer', 'barber_backbar'].includes(purpose))
        throw new Error('Invalid offer purpose');
      const discount = textField(body, 'shopifyDiscountId');
      // Only an actually synchronized Shopify discount can be mapped.
      statement = `INSERT INTO commerce_offers(shop,id,purpose,shopify_discount_id,description)
        SELECT $1,$2,$3,id,$5 FROM commerce_resources WHERE shop=$1 AND kind='discountNodes' AND id=$4 AND deleted_at IS NULL RETURNING id`;
      values = [shop, id, purpose, discount, textField(body, 'description')];
    } else if (action === 'code') {
      const code = textField(body, 'code', 64).toUpperCase();
      if (!/^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(code))
        throw new Error('Invalid code');
      statement = `INSERT INTO commerce_codes(shop,code,ambassador_id,offer_id,starts_at)
        SELECT $1,$2,$3,o.id,$5 FROM commerce_offers o JOIN commerce_resources r ON r.shop=o.shop AND r.id=o.shopify_discount_id AND r.kind='discountNodes'
        WHERE o.shop=$1 AND o.id=$4 AND r.deleted_at IS NULL AND r.document->'discount'->>'status'='ACTIVE'
          AND EXISTS(SELECT 1 FROM jsonb_array_elements(r.document->'discount'->'codes'->'nodes') c WHERE upper(c->>'code')=$2)
        RETURNING code AS id`;
      values = [
        shop,
        code,
        textField(body, 'ambassadorId'),
        textField(body, 'offerId'),
        dateField(body, 'startsAt'),
      ];
    } else if (action === 'code-retire') {
      statement =
        'UPDATE commerce_codes SET ends_at=now() WHERE shop=$1 AND code=$2 AND ends_at IS NULL AND starts_at<now() RETURNING code AS id';
      values = [shop, textField(body, 'code').toUpperCase()];
    } else return json({ error: 'Unknown action' }, 404);
    // Configuration mutation and audit are committed together, serialized against accounting/payouts.
    const offset = values.length;
    const result = await db.query(
      `WITH locked AS MATERIALIZED (SELECT shop FROM commerce_shops WHERE shop=$1 FOR UPDATE),
      changed AS (${statement})
      INSERT INTO commerce_audit(shop,actor,action,subject,detail)
      SELECT $1,$${offset + 1},$${offset + 2},id::text,$${offset + 3}::jsonb FROM changed CROSS JOIN locked RETURNING subject`,
      [...values, userId, action, JSON.stringify(body)],
    );
    if (!result.rows.length)
      return json(
        {
          error:
            'No eligible record found; synchronize Shopify and verify member/discount status.',
        },
        409,
      );
    return json({ id: result.rows[0].subject }, 201);
  } catch {
    return json(
      {
        error:
          'Commerce action could not be completed. Check configuration, eligibility, review holds, and sync status.',
      },
      409,
    );
  }
}
