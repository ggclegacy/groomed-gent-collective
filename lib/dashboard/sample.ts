import type { Dashboard, Period } from './model.ts';
const money = (minorUnits: number) => ({ minorUnits, currency: 'USD' });
/** A dated, opt-in visual scenario. It is never sent to Cassius as account activity. */
export function sampleDashboard(base: Dashboard, period: Period): Dashboard {
  const totals = {
    Today: { earnings: 3570, sales: 23800, orders: 3, days: 1 },
    '7D': { earnings: 52860, sales: 348600, orders: 38, days: 7 },
    '30D': { earnings: 142860, sales: 948600, orders: 104, days: 30 },
    Month: { earnings: 42860, sales: 284600, orders: 31, days: 5 },
  }[period];
  const previousEarnings = Math.round(totals.earnings / 1.242);
  const previousSales = Math.round(totals.sales / 1.18);
  const clicks = Math.round(totals.orders / 0.078);
  const end = Date.parse('2026-09-05T23:59:00Z');
  const start = end - (totals.days * 24 - 1) * 3600000;
  const weights = [5, 8, 6, 9, 7, 11, 8, 13, 10, 14, 12, 17];
  function allocate(total: number, parts: number[]) {
    const sum = parts.reduce((a, b) => a + b, 0);
    let used = 0;
    return parts.map((weight, i) => {
      const value =
        i === parts.length - 1
          ? total - used
          : Math.round((total * weight) / sum);
      used += value;
      return value;
    });
  }
  const earnings = allocate(totals.earnings, weights);
  const sales = allocate(totals.sales, weights);
  const oldEarnings = allocate(
    previousEarnings,
    [7, 5, 8, 7, 6, 10, 7, 10, 11, 9, 12, 13],
  );
  const oldSales = allocate(
    previousSales,
    [7, 5, 8, 7, 6, 10, 7, 10, 11, 9, 12, 13],
  );
  const revenues = allocate(totals.sales, [44, 32, 24]);
  const orders = allocate(totals.orders, [44, 32, 24]);
  const channelOrders = allocate(totals.orders, [55, 29, 16]);
  const channelClicks = allocate(clicks, [40, 35, 25]);
  return {
    ...base,
    mode: 'sample',
    period,
    updatedAt: null,
    goal: money(75000),
    membership: {
      label: 'Ambassador · sample',
      tierId: 'sample:ambassador',
      next: {
        label: 'Partner · sample',
        threshold: money(400000),
        benefit: 'Illustrative benefit: early access to creator assets.',
      },
    },
    pulse: [
      {
        id: 'sample:ritual-campaign',
        kind: 'campaign',
        title: 'The daily ritual edit',
        detail: 'A product story, ready for your voice',
        priority: 40,
        action: {
          label: 'Build a story',
          destination: 'studio',
          brief:
            'Sample campaign brief: introduce one personal grooming ritual. Verify product facts and disclose your brand relationship. This is not a live campaign.',
        },
      },
      {
        id: 'sample:product-drop',
        kind: 'launch',
        title: 'Inside the collection',
        detail: 'Preview the product intelligence rooms',
        priority: 30,
        action: { label: 'Explore products', destination: 'knowledge' },
      },
      {
        id: 'sample:creator-asset',
        kind: 'asset',
        title: 'A better opening line',
        detail: 'Your next conversation starts here',
        priority: 20,
        action: { label: 'Open Creator Studio', destination: 'studio' },
      },
    ],
    feedConnected: false,
    performance: {
      state: 'ready',
      source: 'Illustrative sample — not account activity',
      updatedAt: '2026-09-05T23:59:00Z',
      data: {
        clicks,
        orders: totals.orders,
        revenue: money(totals.sales),
        earnedCommission: money(totals.earnings),
        previousEarnings: money(previousEarnings),
        pendingCommission: money(11620),
        approvedCommission: money(31240),
        availableCommission: money(31240),
        paidCommission: money(0),
        nextPayout: '2026-09-15T00:00:00Z',
        conversionRate: totals.orders / clicks,
        previous: {
          revenue: money(previousSales),
          orders: Math.max(0, totals.orders - 7),
          conversionRate: 0.064,
          averageOrder: money(Math.round(totals.sales / totals.orders / 1.06)),
        },
        period: {
          from: new Date(start).toISOString(),
          to: new Date(end).toISOString(),
        },
        trend: weights.map((_, i) => ({
          date: new Date(
            start + ((end - start) * i) / (weights.length - 1),
          ).toISOString(),
          earnings: money(earnings[i]),
          sales: money(sales[i]),
          previousEarnings: money(oldEarnings[i]),
          previousSales: money(oldSales[i]),
        })),
        products: [
          {
            productId: 'ggc-barbers-blend-grooming-oil',
            name: 'Barber’s Blend',
            orders: orders[0],
            revenue: money(revenues[0]),
          },
          {
            productId: 'ggc-hydration-powder-peach-mango',
            name: 'Hydros · Peach Mango',
            orders: orders[1],
            revenue: money(revenues[1]),
          },
          {
            productId: 'ggc-charcoal-facial-cleanser',
            name: 'Charcoal Facial Cleanser',
            orders: orders[2],
            revenue: money(revenues[2]),
          },
        ],
        channels: ['Instagram', 'Direct', 'QR code'].map((name, i) => ({
          id: `sample:channel:${i}`,
          name,
          orders: channelOrders[i],
          clicks: channelClicks[i],
        })),
      },
    },
  };
}
