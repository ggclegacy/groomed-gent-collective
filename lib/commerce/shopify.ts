import { API_VERSION, shopDomain, type ShopifyOrder } from './model.ts';
export interface ShopifyConfig {
  shop: string;
  clientId: string;
  clientSecret: string;
}
export class ShopifyClient {
  private config: ShopifyConfig;
  private token: { value: string; expires: number } | null = null;
  private pending: Promise<string> | null = null;
  private fetcher: typeof fetch;
  constructor(config: ShopifyConfig, fetcher: typeof fetch = fetch) {
    this.config = { ...config, shop: shopDomain(config.shop) };
    this.fetcher = fetcher;
  }
  private async accessToken(): Promise<string> {
    if (this.token && this.token.expires > Date.now() + 60_000)
      return this.token.value;
    if (this.pending) return this.pending;
    this.pending = (async () => {
      const response = await this.fetcher(
        `https://${this.config.shop}/admin/oauth/access_token`,
        {
          method: 'POST',
          redirect: 'error',
          cache: 'no-store',
          signal: AbortSignal.timeout(10_000),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
          }),
        },
      );
      if (!response.ok)
        throw new Error(`Shopify token failed (${response.status})`);
      const data = (await response.json()) as {
        access_token?: string;
        expires_in?: number;
      };
      if (!data.access_token || !data.expires_in || data.expires_in < 120)
        throw new Error('Invalid Shopify token response');
      this.token = {
        value: data.access_token,
        expires: Date.now() + data.expires_in * 1000,
      };
      return data.access_token;
    })();
    try {
      return await this.pending;
    } finally {
      this.pending = null;
    }
  }
  async query<T>(
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<T> {
    // Fail transient requests into the durable queue, avoiding long webhook/request retry loops.
    const response = await this.fetcher(
      `https://${this.config.shop}/admin/api/${API_VERSION}/graphql.json`,
      {
        method: 'POST',
        redirect: 'error',
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': await this.accessToken(),
        },
        body: JSON.stringify({ query, variables }),
      },
    );
    if (response.status === 401) this.token = null;
    if (!response.ok)
      throw new Error(`Shopify request failed (${response.status})`);
    const version = response.headers.get('x-shopify-api-version');
    if (version && version !== API_VERSION)
      throw new Error('Shopify API version drift');
    const body = (await response.json()) as { data?: T; errors?: unknown[] };
    if (body.errors?.length || !body.data)
      throw new Error('Shopify GraphQL request failed');
    return body.data;
  }
  async order(id: string): Promise<ShopifyOrder> {
    const data = await this.query<{ order: ShopifyOrder | null }>(
      `query CollectiveOrder($id: ID!) {
      order(id: $id) { id name createdAt updatedAt cancelledAt test taxesIncluded currencyCode
        displayFinancialStatus displayFulfillmentStatus discountCodes customer { id }
        currentSubtotalPriceSet { shopMoney { amount currencyCode } }
        lineItems(first: 250) { nodes { id isGiftCard } pageInfo { hasNextPage endCursor } }
        refunds { id refundLineItems(first: 1) { nodes { id } } orderAdjustments(first: 1) { nodes { id } } }
      }
    }`,
      { id },
    );
    if (!data.order) throw new Error('Shopify order unavailable');
    return data.order;
  }
}
export const resourceQueries = {
  disputes: `query CollectiveDisputes($after: String) { disputes(first: 50, after: $after) { nodes { id status order { id } } pageInfo { hasNextPage endCursor } } }`,
  products: `query CollectiveProducts($after: String) { products(first: 50, after: $after) { nodes { id title handle status updatedAt onlineStoreUrl } pageInfo { hasNextPage endCursor } } }`,
  productVariants: `query CollectiveVariants($after: String) { productVariants(first: 50, after: $after) { nodes { id title sku price inventoryQuantity updatedAt product { id } inventoryItem { id tracked } } pageInfo { hasNextPage endCursor } } }`,
  customers: `query CollectiveCustomers($after: String) { customers(first: 50, after: $after) { nodes { id updatedAt } pageInfo { hasNextPage endCursor } } }`,
  orders: `query CollectiveOrders($after: String) { orders(first: 50, after: $after, sortKey: ID) { nodes { id updatedAt } pageInfo { hasNextPage endCursor } } }`,
  discountNodes: `query CollectiveDiscounts($after: String) { discountNodes(first: 50, after: $after) { nodes { id discount { __typename ... on DiscountCodeBasic { title status startsAt endsAt codes(first: 250) { nodes { code } pageInfo { hasNextPage endCursor } } } } } pageInfo { hasNextPage endCursor } } }`,
} as const;
