// Server adapter boundary. Future providers must derive identity from an authorized session,
// validate incoming records, preserve missing values, and reconcile refunds in minor units.
import { demoAmbassador, disconnectedPerformance } from '../collective.ts';
import type { Dashboard, Period } from './model.ts';
export interface DashboardProvider {
  load(period: Period): Promise<Dashboard>;
}
export const dashboardProvider: DashboardProvider = {
  async load(period) {
    return {
      version: 1,
      mode: 'preview',
      period,
      ambassador: demoAmbassador,
      performance: {
        state: 'disconnected',
        message:
          disconnectedPerformance.state !== 'ready'
            ? disconnectedPerformance.message
            : 'Reporting unavailable.',
      },
      feedConnected: false,
      updatedAt: null,
      goal: null,
      membership: { label: 'Membership preview', tierId: null, next: null },
      pulse: [
        {
          id: 'resource:product-studio',
          kind: 'training',
          title: 'Know the details before the recommendation.',
          detail: 'Explore Product Studio and its evidence boundaries.',
          priority: 30,
          action: { label: 'Learn a product', destination: 'knowledge' },
        },
        {
          id: 'resource:creator-studio',
          kind: 'asset',
          title: 'Your voice. A considered starting point.',
          detail: 'Prepare, review and save your next story in Creator Studio.',
          priority: 20,
          action: { label: 'Open Creator Studio', destination: 'studio' },
        },
        {
          id: 'resource:cassius',
          kind: 'training',
          title: 'Bring Cassius a better question.',
          detail:
            'Explore sourced Groomed Gent knowledge before shaping your next recommendation.',
          priority: 10,
          action: {
            label: 'Ask Cassius',
            destination: 'intelligence',
            brief:
              'Help me prepare one thoughtful grooming consultation question and explain which product details I should verify.',
          },
        },
      ],
    };
  },
};
export async function loadDashboard(
  period: Period,
  provider: DashboardProvider = dashboardProvider,
) {
  return provider.load(period);
}
