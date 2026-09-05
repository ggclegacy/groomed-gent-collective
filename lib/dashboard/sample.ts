import type { Dashboard, Period } from './model.ts';
const money = (minorUnits: number) => ({ minorUnits, currency: 'USD' });
/** Explicit opt-in display fixture. Never supplied to Cassius as real performance. */
export function sampleDashboard(base: Dashboard, period: Period): Dashboard {
  const factor = { Today: 1, '7D': 7, '30D': 30, Month: 12 }[period];
  const earnings = 3570 * factor;
  return {
    ...base,
    mode: 'sample',
    period,
    updatedAt: null,
    goal: money(60000),
    performance: {
      state: 'ready',
      source: 'Illustrative sample — not account activity',
      updatedAt: '2026-09-05T00:00:00Z',
      data: {
        clicks: 42 * factor,
        orders: 3 * factor,
        revenue: money(23800 * factor),
        earnedCommission: money(earnings),
        previousEarnings: money(Math.round(earnings / 1.24)),
        pendingCommission: money(11620),
        approvedCommission: money(31240),
        availableCommission: money(31240),
        paidCommission: money(0),
        nextPayout: null,
        conversionRate: 3 / 42,
        period: { from: '2026-09-01', to: '2026-09-05' },
        trend: Array.from({ length: 8 }, (_, i) => ({
          date: `Point ${i + 1}`,
          earnings: money(
            Math.round(
              earnings * [0.07, 0.09, 0.08, 0.13, 0.1, 0.16, 0.12, 0.25][i],
            ),
          ),
        })),
        products: [
          {
            productId: 'ggc-barbers-blend-grooming-oil',
            name: 'Barber’s Blend Grooming Oil',
            orders: 2 * factor,
            revenue: money(14000 * factor),
          },
        ],
        channels: [
          {
            id: 'sample:personal-link',
            name: 'Personal link',
            orders: 2 * factor,
            clicks: 25 * factor,
          },
          {
            id: 'sample:social',
            name: 'Social',
            orders: factor,
            clicks: 17 * factor,
          },
        ],
      },
    },
  };
}
