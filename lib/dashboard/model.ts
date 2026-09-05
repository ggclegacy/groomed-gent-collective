import type {
  Ambassador,
  IntegrationResult,
  Money,
  Performance,
  Section,
} from '../collective.ts';
export const periods = ['Today', '7D', '30D', 'Month'] as const;
export type Period = (typeof periods)[number];
export interface Action {
  label: string;
  destination: Section;
  brief?: string;
  productId?: string;
}
export interface PulseItem {
  id: string;
  kind:
    | 'launch'
    | 'campaign'
    | 'training'
    | 'asset'
    | 'announcement'
    | 'opportunity';
  title: string;
  detail: string;
  priority: number;
  action: Action;
  startsAt?: string;
  endsAt?: string;
  tierIds?: string[];
  segments?: string[];
  productIds?: string[];
}
export interface DashboardPerformance extends Performance {
  earnedCommission: Money | null;
  previousEarnings: Money | null;
  availableCommission: Money | null;
  nextPayout: string | null;
  conversionRate: number | null;
  trend: { date: string; earnings: Money }[];
  products: {
    productId: string;
    name: string;
    orders: number;
    revenue: Money;
  }[];
  channels: { id: string; name: string; orders: number; clicks: number }[];
}
export interface Dashboard {
  version: 1;
  mode: 'preview' | 'live' | 'sample';
  period: Period;
  ambassador: Ambassador | null;
  performance: IntegrationResult<DashboardPerformance>;
  pulse: PulseItem[];
  feedConnected: boolean;
  membership: {
    label: string;
    tierId: string | null;
    next: { label: string; threshold: Money; benefit: string } | null;
  };
  goal: Money | null;
  updatedAt: string | null;
}
export interface Move {
  id: string;
  title: string;
  rationale: string;
  evidence: string;
  action: Action;
}
export function currency(value: Money | null | undefined): string {
  if (!value) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: value.currency,
  }).format(value.minorUnits / 100);
}
export function change(current: Money | null, previous: Money | null): string {
  if (!current || !previous || current.currency !== previous.currency)
    return 'Prior period unavailable';
  if (previous.minorUnits === 0)
    return current.minorUnits === 0
      ? 'No change from prior period'
      : 'First earnings this period';
  const delta =
    ((current.minorUnits - previous.minorUnits) /
      Math.abs(previous.minorUnits)) *
    100;
  return `${delta > 0 ? '+' : ''}${delta.toFixed(1)}% vs prior period`;
}
export function visiblePulse(
  items: PulseItem[],
  tierId: string | null,
  segment: string | null,
  now: Date,
): PulseItem[] {
  return items
    .filter(
      (item) =>
        (!item.startsAt || Date.parse(item.startsAt) <= +now) &&
        (!item.endsAt || Date.parse(item.endsAt) > +now) &&
        (!item.tierIds?.length ||
          (!!tierId && item.tierIds.includes(tierId))) &&
        (!item.segments?.length ||
          (!!segment && item.segments.includes(segment))),
    )
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 4);
}
export function bestMove(dashboard: Dashboard): Move {
  const p = dashboard.performance;
  if (p.state === 'ready') {
    const top = [...p.data.products].sort((a, b) => b.orders - a.orders)[0];
    if (top && top.orders > 0)
      return {
        id: `product:${top.productId}`,
        title: `Build on ${top.name}.`,
        rationale: `${top.name} leads your recorded product orders in this period. Turn that interest into one thoughtful piece of content.`,
        evidence: `${top.orders} attributed orders · ${dashboard.mode === 'sample' ? 'illustrative sample' : 'current period'}`,
        action: {
          label: 'Create a product story',
          destination: 'studio',
          productId: top.productId,
          brief: `Prepare an editorial story about ${top.name} (${top.productId}). Start with a real routine, verify product details and disclose the ambassador relationship. Do not invent results or offers.`,
        },
      };
  }
  const campaign = visiblePulse(
    dashboard.pulse,
    dashboard.membership.tierId,
    dashboard.ambassador?.kind ?? null,
    new Date(),
  ).find((item) => item.kind === 'campaign' || item.kind === 'opportunity');
  if (campaign)
    return {
      id: campaign.id,
      title: campaign.title,
      rationale: campaign.detail,
      evidence: 'Eligible Collective opportunity',
      action: campaign.action,
    };
  return {
    id: 'foundation',
    title: 'Make your next conversation count.',
    rationale:
      p.state === 'ready' && p.data.orders === 0
        ? 'Your first order starts with a useful recommendation. Learn the product, ask about their routine, then prepare one personal story.'
        : 'While performance is awaiting connection, strengthen what you can control: product confidence and a story in your own voice.',
    evidence: 'Foundation move · no earnings prediction',
    action: {
      label: 'Prepare my first story',
      destination: 'studio',
      brief:
        'Prepare a personal Groomed Gent introduction. Ask about the reader’s grooming routine, leave space for a verified product detail, and clearly disclose the ambassador relationship. No invented offers or results.',
    },
  };
}
