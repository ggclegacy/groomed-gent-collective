import { randomUUID } from 'node:crypto';
import { normalizeOrder, type Database } from './model.ts';
import { ShopifyClient, resourceQueries } from './shopify.ts';
type Receipt = {
  id: string;
  topic: string;
  resource_id: string | null;
  payload: Record<string, unknown>;
  attempts: number;
  lease_token: string;
} & Record<string, unknown>;
type Connection = {
  nodes: Record<string, unknown>[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};
export async function enqueue(
  db: Database,
  shop: string,
  topic: string,
  resource: string | null,
  payload: Record<string, unknown> = {},
  key: string = randomUUID(),
) {
  await db.query('SELECT commerce_enqueue($1,$2,$3,$4,$5::jsonb)', [
    shop,
    key,
    topic,
    resource,
    JSON.stringify(payload),
  ]);
}
export async function startSync(db: Database, shop: string) {
  const run = randomUUID();
  // A single statement makes the run and initial work durable together.
  await db.query(
    `WITH locked AS (SELECT shop FROM commerce_shops WHERE shop=$1 AND status='active' FOR UPDATE),
    run AS (INSERT INTO commerce_sync_runs(shop,id) SELECT shop,$2 FROM locked RETURNING shop,id)
    INSERT INTO commerce_receipts(shop,delivery_id,topic,payload)
    SELECT shop,$2 || ':' || kind,'sync/page',jsonb_build_object('kind',kind,'runId',$2::text)
    FROM run CROSS JOIN unnest($3::text[]) kind`,
    [shop, run, Object.keys(resourceQueries)],
  );
  return run;
}
async function saveResource(
  db: Database,
  shop: string,
  kind: string,
  node: Record<string, unknown>,
  fetchedAt: string,
) {
  if (typeof node.id !== 'string') throw new Error('Missing resource ID');
  await db.query(
    `INSERT INTO commerce_resources(shop,kind,id,document,synced_at) VALUES($1,$2,$3,$4::jsonb,$5)
    ON CONFLICT(shop,kind,id) DO UPDATE SET document=excluded.document,synced_at=excluded.synced_at,deleted_at=NULL
    WHERE commerce_resources.synced_at <= excluded.synced_at`,
    [shop, kind, node.id, JSON.stringify(node), fetchedAt],
  );
}
async function processReceipt(
  db: Database,
  client: ShopifyClient,
  shop: string,
  job: Receipt,
) {
  if (job.payload.versionMismatch) throw new Error('api_version_mismatch');
  const runId = job.payload.runId;
  if (job.topic === 'sync/page') {
    const kind = job.payload.kind as keyof typeof resourceQueries;
    if (!(kind in resourceQueries)) throw new Error('unsupported_resource');
    const fetched = new Date().toISOString();
    const result = await client.query<Record<string, Connection>>(
      resourceQueries[kind],
      { after: job.payload.after ?? null },
    );
    const connection = result[kind];
    if (!connection?.nodes || !connection.pageInfo)
      throw new Error('incomplete_page');
    for (const node of connection.nodes) {
      if (kind === 'disputes') {
        const d = node as {
          id: string;
          status: string;
          order: { id: string } | null;
        };
        if (!d.order) throw new Error('dispute_order_unavailable');
        await db.query(
          `INSERT INTO commerce_disputes(shop,id,order_id,status,updated_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT(shop,id) DO UPDATE SET status=excluded.status,updated_at=excluded.updated_at WHERE commerce_disputes.updated_at<=excluded.updated_at`,
          [shop, d.id, d.order.id, d.status, fetched],
        );
        await enqueue(
          db,
          shop,
          'sync/order',
          d.order.id,
          { runId },
          `${job.id}:${d.id}:order`,
        );
      } else if (kind === 'orders')
        await enqueue(
          db,
          shop,
          'sync/order',
          String(node.id),
          { runId },
          `${job.id}:${String(node.id)}`,
        );
      else await saveResource(db, shop, kind, node, fetched);
    }
    if (connection.pageInfo.hasNextPage) {
      if (
        !connection.pageInfo.endCursor ||
        connection.pageInfo.endCursor === job.payload.after
      )
        throw new Error('invalid_cursor');
      await enqueue(
        db,
        shop,
        'sync/page',
        null,
        { kind, after: connection.pageInfo.endCursor, runId },
        `${job.id}:next`,
      );
    }
    return;
  }
  if (
    job.topic === 'sync/order' ||
    (job.topic.startsWith('orders/') && job.topic !== 'orders/delete') ||
    job.topic.startsWith('refunds/') ||
    job.topic.startsWith('fulfillments/')
  ) {
    if (!job.resource_id) throw new Error('missing_order');
    const fetched = new Date().toISOString();
    const order = await client.order(job.resource_id);
    await db.query('SELECT commerce_apply_order($1,$2::jsonb)', [
      shop,
      JSON.stringify(normalizeOrder(order, fetched)),
    ]);
    return;
  }
  if (job.topic.startsWith('disputes/')) {
    const fetched = new Date().toISOString();
    const result = await client.query<{
      dispute: {
        id: string;
        status: string;
        order: { id: string } | null;
      } | null;
    }>(
      `query CollectiveDispute($id: ID!) { dispute(id: $id) { id status order { id } } }`,
      { id: `gid://shopify/ShopifyPaymentsDispute/${job.resource_id}` },
    );
    const d = result.dispute;
    if (!d?.order) throw new Error('dispute_order_unavailable');
    await db.query(
      `INSERT INTO commerce_disputes(shop,id,order_id,status,updated_at) VALUES($1,$2,$3,$4,$5)
      ON CONFLICT(shop,id) DO UPDATE SET status=excluded.status,updated_at=excluded.updated_at WHERE commerce_disputes.updated_at<=excluded.updated_at`,
      [shop, d.id, d.order.id, d.status, fetched],
    );
    await enqueue(db, shop, 'sync/order', d.order.id, {}, `${job.id}:order`);
    return;
  }
  if (job.topic === 'app/uninstalled') return;
  if (job.topic === 'app/scopes_update')
    throw new Error('scope_change_requires_review');
  if (
    ['customers/data_request', 'customers/redact', 'shop/redact'].includes(
      job.topic,
    )
  ) {
    // Retention decisions involving financial records require an operator; a durable dead letter is visible.
    throw new Error('privacy_request_requires_operator');
  }
  if (job.topic === 'orders/delete') {
    await db.query(
      `UPDATE commerce_orders SET hold_reason='order_deleted_review' WHERE shop=$1 AND id=$2`,
      [shop, job.resource_id],
    );
    throw new Error('deleted_order_requires_review');
  }
  const kind = job.topic.startsWith('products/')
    ? 'products'
    : job.topic.startsWith('customers/')
      ? 'customers'
      : job.topic.startsWith('discounts/')
        ? 'discountNodes'
        : 'productVariants';
  if (job.topic.endsWith('/delete') && job.resource_id) {
    const type =
      kind === 'products'
        ? 'Product'
        : kind === 'customers'
          ? 'Customer'
          : 'DiscountCodeNode';
    await db.query(
      `INSERT INTO commerce_resources(shop,kind,id,document,deleted_at,synced_at) VALUES($1,$2,$3,'{}',now(),now()) ON CONFLICT(shop,kind,id) DO UPDATE SET document='{}',deleted_at=now(),synced_at=now()`,
      [shop, kind, `gid://shopify/${type}/${job.resource_id}`],
    );
  } else
    await enqueue(db, shop, 'sync/page', null, { kind }, `${job.id}:refresh`);
}
export async function drain(
  db: Database,
  client: ShopifyClient,
  shop: string,
  limit = 5,
) {
  let completed = 0;
  let failed = 0;
  for (let i = 0; i < Math.min(Math.max(limit, 1), 10); i++) {
    const token = randomUUID();
    const { rows } = await db.query<Receipt>(
      `UPDATE commerce_receipts SET state='processing',lease_token=$2,lease_until=now()+interval '3 minutes',attempts=attempts+1
      WHERE id=(SELECT id FROM commerce_receipts WHERE shop=$1 AND
      ((state='pending' AND available_at<=now()) OR (state='processing' AND lease_until<now()))
      AND EXISTS(SELECT 1 FROM commerce_shops s WHERE s.shop=$1 AND (s.status='active' OR topic IN ('app/uninstalled','customers/data_request','customers/redact','shop/redact'))) ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`,
      [shop, token],
    );
    const job = rows[0];
    if (!job) break;
    try {
      await processReceipt(db, client, shop, job);
      await db.query(
        `UPDATE commerce_receipts SET state='done',completed_at=now(),lease_token=NULL,lease_until=NULL,error_code=NULL WHERE id=$1 AND lease_token=$2`,
        [job.id, token],
      );
      completed++;
    } catch {
      const terminal =
        job.attempts >= 8 ||
        job.payload.versionMismatch ||
        /^(customers\/(data_request|redact)|shop\/redact|app\/scopes_update|orders\/delete)$/.test(
          job.topic,
        );
      await db.query(
        `UPDATE commerce_receipts SET state=$3,error_code=$4,available_at=now()+make_interval(secs => $5),lease_until=NULL,lease_token=NULL WHERE id=$1 AND lease_token=$2`,
        [
          job.id,
          token,
          terminal ? 'dead' : 'pending',
          terminal ? 'operator_review' : 'sync_failed',
          Math.min(3600, 2 ** job.attempts * 10),
        ],
      );
      failed++;
    }
  }
  await db.query(
    `WITH finished AS (UPDATE commerce_sync_runs r SET state='done',completed_at=now()
    WHERE shop=$1 AND state='running' AND NOT EXISTS(SELECT 1 FROM commerce_receipts q WHERE q.shop=r.shop AND q.payload->>'runId'=r.id AND q.state<>'done') RETURNING shop,started_at),
    tombstones AS (UPDATE commerce_resources r SET document='{}',deleted_at=now(),synced_at=now() FROM finished f WHERE r.shop=f.shop AND r.synced_at<f.started_at AND r.kind IN ('products','productVariants','customers','discountNodes') RETURNING r.id)
    UPDATE commerce_shops s SET reconciled_at=now(),reconcile_started_at=(SELECT max(f.started_at) FROM finished f WHERE f.shop=s.shop) WHERE shop IN (SELECT shop FROM finished)`,
    [shop],
  );
  return { completed, failed };
}
