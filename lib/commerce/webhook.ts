import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  boundedBody,
  json,
  shopDomain,
  API_VERSION,
  type Database,
} from './model.ts';
export const topics = [
  'orders/create',
  'orders/paid',
  'orders/updated',
  'orders/cancelled',
  'orders/edited',
  'orders/delete',
  'refunds/create',
  'fulfillments/create',
  'fulfillments/update',
  'products/create',
  'products/update',
  'products/delete',
  'inventory_levels/update',
  'inventory_items/update',
  'customers/create',
  'customers/update',
  'customers/delete',
  'discounts/create',
  'discounts/update',
  'discounts/delete',
  'disputes/create',
  'disputes/update',
  'app/uninstalled',
  'app/scopes_update',
  'customers/data_request',
  'customers/redact',
  'shop/redact',
] as const;
export function verifyHmac(
  raw: Uint8Array,
  supplied: string | null,
  secret: string,
): boolean {
  if (!supplied || !/^[A-Za-z0-9+/]{43}=$/.test(supplied)) return false;
  const expected = createHmac('sha256', secret).update(raw).digest();
  const received = Buffer.from(supplied, 'base64');
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}
function numericId(value: unknown): string | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0)
    return String(value);
  if (typeof value === 'string' && /^\d+$/.test(value)) return value;
  return null;
}
export async function receiveWebhook(
  request: Request,
  db: Database,
  config: { shop: string; secret: string },
) {
  let raw: Uint8Array;
  try {
    raw = await boundedBody(request);
  } catch {
    return json({ error: 'Payload too large' }, 413);
  }
  if (
    !verifyHmac(
      raw,
      request.headers.get('x-shopify-hmac-sha256'),
      config.secret,
    )
  )
    return json({ error: 'Invalid signature' }, 401);
  const shop = request.headers.get('x-shopify-shop-domain');
  if (shop !== shopDomain(config.shop))
    return json({ error: 'Unknown shop' }, 403);
  const topic = request.headers.get('x-shopify-topic') ?? '';
  const delivery = request.headers.get('x-shopify-webhook-id') ?? '';
  if (
    !topics.includes(topic as (typeof topics)[number]) ||
    !/^[\w-]{8,100}$/.test(delivery)
  )
    return json({ error: 'Invalid delivery metadata' }, 400);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(new TextDecoder().decode(raw));
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new Error();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  const id = numericId(body.id);
  let resource = id;
  if (
    topic.startsWith('refunds/') ||
    topic.startsWith('fulfillments/') ||
    topic === 'orders/edited'
  ) {
    const edit = body.order_edit as Record<string, unknown> | undefined;
    resource = numericId(body.order_id ?? edit?.order_id);
  }
  if (
    topic.startsWith('orders/') ||
    topic.startsWith('refunds/') ||
    topic.startsWith('fulfillments/')
  ) {
    if (
      topic !== 'orders/edited' &&
      typeof body.admin_graphql_api_id === 'string' &&
      topic.startsWith('orders/') &&
      /^gid:\/\/shopify\/Order\/\d+$/.test(body.admin_graphql_api_id)
    )
      resource = body.admin_graphql_api_id;
    else if (resource) resource = `gid://shopify/Order/${resource}`;
    if (!resource) return json({ error: 'Missing order identity' }, 422);
  }
  const version = request.headers.get('x-shopify-api-version');
  // Store only routing metadata, never the full webhook's customer/address/payment data.
  const payload: Record<string, unknown> = {
    apiVersion: version,
    versionMismatch: version !== API_VERSION,
  };
  if (topic.startsWith('customers/')) {
    const customer = body.customer as Record<string, unknown> | undefined;
    payload.customerId = numericId(customer?.id ?? body.id);
  }
  if (topic.startsWith('disputes/') && !id)
    return json({ error: 'Missing dispute identity' }, 422);
  try {
    await db.query('SELECT commerce_enqueue($1,$2,$3,$4,$5::jsonb,$6)', [
      shop,
      delivery,
      topic,
      resource,
      JSON.stringify(payload),
      request.headers.get('x-shopify-event-id'),
    ]);
    return json({ accepted: true });
  } catch {
    return json({ error: 'Could not durably accept delivery' }, 503);
  }
}
