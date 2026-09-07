import { createHash } from 'node:crypto';
export const API_VERSION = '2026-07';
export function shopDomain(value: string): string {
  const shop = value.toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop))
    throw new Error('Invalid Shopify shop domain');
  return shop;
}
export function minorUnits(amount: string, currency: string): number {
  const digits: Record<string, number> = {
    USD: 2,
    CAD: 2,
    GBP: 2,
    EUR: 2,
    AUD: 2,
    NZD: 2,
    JPY: 0,
    KWD: 3,
    BHD: 3,
  };
  const scale = digits[currency];
  if (scale === undefined || !/^\d+(\.\d+)?$/.test(amount))
    throw new Error('Unsupported money');
  const [whole, fraction = ''] = amount.split('.');
  if (fraction.slice(scale).replaceAll('0', '') !== '')
    throw new Error('Money precision would be lost');
  const value =
    BigInt(whole) * BigInt(10) ** BigInt(scale) +
    BigInt(fraction.slice(0, scale).padEnd(scale, '0') || '0');
  if (value > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error('Money exceeds safe integer range');
  return Number(value);
}
export function commission(base: number, basisPoints: number): number {
  if (
    !Number.isSafeInteger(base) ||
    base < 0 ||
    !Number.isInteger(basisPoints) ||
    basisPoints < 0 ||
    basisPoints > 10000
  )
    throw new Error('Invalid commission inputs');
  const value =
    (BigInt(base) * BigInt(basisPoints) + BigInt(5000)) / BigInt(10000);
  return Number(value);
}
export type MoneyBag = { shopMoney: { amount: string; currencyCode: string } };
export type ShopifyOrder = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  test: boolean;
  taxesIncluded: boolean;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  currencyCode: string;
  discountCodes: string[];
  customer: { id: string } | null;
  currentSubtotalPriceSet: MoneyBag;
  lineItems: {
    nodes: { id: string; isGiftCard: boolean }[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
  refunds: {
    id: string;
    refundLineItems: { nodes: { id: string }[] };
    orderAdjustments: { nodes: { id: string }[] };
  }[];
};
export function normalizeOrder(
  order: ShopifyOrder,
  fetchedAt = new Date().toISOString(),
) {
  if (
    !/^gid:\/\/shopify\/Order\/\d+$/.test(order.id) ||
    !Number.isFinite(Date.parse(order.updatedAt)) ||
    !Number.isFinite(Date.parse(order.createdAt))
  )
    throw new Error('Invalid order identity or dates');
  if (
    order.currentSubtotalPriceSet.shopMoney.currencyCode !== order.currencyCode
  )
    throw new Error('Currency mismatch');
  const base = minorUnits(
    order.currentSubtotalPriceSet.shopMoney.amount,
    order.currencyCode,
  );
  // Ambiguous financial cases are deliberately held, never approximated into payable money.
  const hold = order.test
    ? 'test_order'
    : order.taxesIncluded
      ? 'tax_inclusive_review'
      : order.lineItems.pageInfo.hasNextPage
        ? 'incomplete_lines'
        : order.lineItems.nodes.some((l) => l.isGiftCard)
          ? 'gift_card_review'
          : order.refunds.some(
                (r) =>
                  r.refundLineItems.nodes.length === 0 ||
                  r.orderAdjustments.nodes.length > 0,
              )
            ? 'non_line_refund_review'
            : !['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(
                  order.displayFinancialStatus,
                )
              ? 'payment_not_settled'
              : null;
  const snapshot = {
    id: order.id,
    name: order.name,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    fetchedAt,
    customerId: order.customer?.id ?? null,
    currency: order.currencyCode,
    codes: [...new Set(order.discountCodes.map((c) => c.toUpperCase()))].sort(),
    base:
      order.cancelledAt ||
      order.displayFinancialStatus === 'REFUNDED' ||
      order.test
        ? 0
        : base,
    hold,
    cancelled: !!order.cancelledAt,
    financialStatus: order.displayFinancialStatus,
    fulfillmentStatus: order.displayFulfillmentStatus,
    refundIds: order.refunds.map((r) => r.id),
  };
  const fingerprint = createHash('sha256')
    .update(JSON.stringify({ ...snapshot, fetchedAt: null }))
    .digest('hex');
  return { ...snapshot, fingerprint };
}
export type OrderSnapshot = ReturnType<typeof normalizeOrder>;
export interface Database {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    values?: unknown[],
  ): Promise<{ rows: T[] }>;
}
export function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
export async function boundedBody(
  request: Request,
  max = 1_000_000,
): Promise<Uint8Array> {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new Error('Body too large');
    }
    chunks.push(value);
  }
  const output = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}
