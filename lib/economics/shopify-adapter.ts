import type { OrderSnapshot } from '../commerce/model.ts';
import { qualified } from './engine.ts';
import { execute, type Context } from './service.ts';
import { hash, type Line, type Rules, type Touch } from './model.ts';
/** Server-only handoff contract. Evidence must come from verified/paginated Shopify
 * reads and persisted Collective touchpoints; never from checkout/browser claims.
 * This intentionally does not bind the prepared worker or call Shopify. */
export type VerifiedOrderDetails = {
  lines: Line[];
  complete: boolean;
  taxExclusive: boolean;
  firstSettledAt: string;
  isNewCustomer: boolean;
  purchaseNumber: number;
  subscription: boolean;
  touches: Touch[];
};
export async function processPreparedOrder(
  context: Context,
  snapshot: OrderSnapshot,
  details: VerifiedOrderDetails,
  rules: Rules,
) {
  if (!context.workerAuthenticated)
    throw new Error('Authenticated worker required');
  if (!details.complete || !details.taxExclusive || snapshot.hold)
    throw new Error(
      'Enriched settled order required; retain receipt for review',
    );
  const order = {
    id: snapshot.id,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
    settledAt: details.firstSettledAt,
    currency: snapshot.currency,
    customer: snapshot.customerId,
    newCustomer: details.isNewCustomer,
    purchaseNumber: details.purchaseNumber,
    subscription: details.subscription,
    lines: details.lines,
    touches: details.touches,
    cancelled: snapshot.cancelled || snapshot.financialStatus === 'REFUNDED',
    chargeback: false,
    review: null,
  };
  // Check source reconciliation before applying policy exclusions. Never infer per-line money.
  const grossRules = {
    ...rules,
    excludeGiftCards: false,
    excludedProducts: [],
  };
  if (qualified(order, grossRules) !== snapshot.base)
    throw new Error('Line totals do not reconcile with Shopify');
  return execute(
    context,
    {
      kind: 'order',
      id: `shopify-order:${snapshot.id}:${hash(order)}`,
      reason: 'Verified prepared Shopify order handoff',
      order,
    },
    rules,
  );
}
