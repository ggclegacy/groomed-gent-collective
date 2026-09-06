import { askCassius } from './cassius/client.ts';
export const sections = [
  'home',
  'collective', 'voyage', 'circle', 'life', 'desk', 'vault', 'logbook', 'profile',
  'identity',
  'performance',
  'intelligence',
  'knowledge',
  'studio',
  'status',
] as const;
export type Section = (typeof sections)[number];
export type PartnerKind =
  | 'Barber'
  | 'Bartender'
  | 'Fitness & wellness'
  | 'Business owner'
  | 'Creator'
  | 'Trusted partner';
export interface Ambassador {
  id: string;
  name: string;
  kind: PartnerKind;
  code: string;
  referralUrl: string;
  mode: 'demo' | 'live';
}
export interface Money {
  minorUnits: number;
  currency: string;
}
export type IntegrationResult<T> =
  | { state: 'ready'; data: T; source: string; updatedAt: string }
  | { state: 'disconnected' | 'pending' | 'error'; message: string };
export interface Performance {
  clicks: number;
  orders: number;
  revenue: Money;
  pendingCommission: Money;
  approvedCommission: Money;
  paidCommission: Money;
  period: { from: string; to: string };
}
export interface AttributionEvent {
  id: string;
  ambassadorId: string;
  occurredAt: string;
  referralCode: string;
  orderId?: string;
  consentRecorded: boolean;
}
export interface CommissionEntry {
  id: string;
  orderId: string;
  ambassadorId: string;
  amount: Money;
  state: 'pending' | 'approved' | 'paid' | 'reversed';
  policyVersion: string;
}
export interface ProductKnowledge {
  id: string;
  title: string;
  approvedClaims: string[];
  sourceUrl: string;
  approvedAt: string;
}
export interface ConversationTurn { role: 'user' | 'assistant'; content: string }
export interface IntelligenceAnswer {
  text: string;
  citations: { title: string; url: string }[];
}
export interface CollectiveGateway {
  getAmbassador(): Promise<IntegrationResult<Ambassador>>;
  getPerformance(ambassadorId: string): Promise<IntegrationResult<Performance>>;
  getProducts(): Promise<IntegrationResult<ProductKnowledge[]>>;
  askIntelligence(
    question: string,
    history?: ConversationTurn[],
  ): Promise<IntegrationResult<IntelligenceAnswer>>;
}
export const demoAmbassador: Ambassador = {
  id: 'demo-member',
  name: 'Your name',
  kind: 'Trusted partner',
  code: 'GENT-DEMO',
  referralUrl: 'https://example.com/collective?ref=GENT-DEMO',
  mode: 'demo',
};
export const disconnectedPerformance: IntegrationResult<Performance> = {
  state: 'disconnected',
  message: 'Shopify, attribution and commission reporting are not connected.',
};
export const demoGateway: CollectiveGateway = {
  async getAmbassador() {
    return {
      state: 'ready',
      data: demoAmbassador,
      source: 'Explicit demo fixture',
      updatedAt: '2026-09-05T00:00:00Z',
    };
  },
  async getPerformance() {
    return disconnectedPerformance;
  },
  async getProducts() {
    return {
      state: 'disconnected',
      message: 'The approved Groomed Gent product catalog has not been added.',
    };
  },
  async askIntelligence() {
    return {
      state: 'disconnected',
      message:
        'CASSIUS is not connected. No question has been sent.',
    };
  },
};
export function metricLabel(
  result: IntegrationResult<Performance>,
  key: 'clicks' | 'orders',
) {
  return result.state === 'ready' ? String(result.data[key]) : '—';
}
export function createDraft(context: string, format: string) {
  const openings: Record<string, string> = {
    'At the chair':
      'A good conversation starts in the chair. Make your daily grooming ritual part of it.',
    'After training':
      'The work continues after the last rep. Make time for your grooming ritual.',
    'On the road':
      'New city. Same attention to detail. Take your grooming ritual with you.',
  };
  const opening = openings[context] ?? openings['At the chair'];
  return `${format === 'Short caption' ? opening : `${opening}\n\nAsk me about Groomed Gent Co. and the details that matter to your routine.`}\n\n[Add an approved product detail and your activated ambassador link.]\n\n[If applicable, clearly disclose your relationship with Groomed Gent Co.]`;
}
export const partnerKinds: PartnerKind[] = [
  'Barber',
  'Bartender',
  'Fitness & wellness',
  'Business owner',
  'Creator',
  'Trusted partner',
];
export interface LocalProfile {
  name: string;
  kind: PartnerKind;
}
export function parseProfile(value: string | null): LocalProfile | null {
  if (!value) return null;
  try {
    const data: unknown = JSON.parse(value);
    if (typeof data !== 'object' || !data) return null;
    const p = data as Record<string, unknown>;
    return typeof p.name === 'string' &&
      p.name.trim().length > 0 &&
      p.name.length <= 80 &&
      partnerKinds.includes(p.kind as PartnerKind)
      ? { name: p.name.trim(), kind: p.kind as PartnerKind }
      : null;
  } catch {
    return null;
  }
}
export const storageKeys = {
  profile: 'ggc.preview.profile.v1',
  draft: 'ggc.preview.draft.v1',
  question: 'ggc.preview.question.v1',
  brief: 'ggc.preview.cassius-brief.v1',
};
export const playbooks = [
  {
    title: 'Lead with the person',
    category: 'Relationships',
    intro: 'A useful recommendation begins with a better question.',
    points: [
      'Ask what their current routine looks like and what they want to improve.',
      'Listen for their preferences before introducing a product.',
      'Use approved product information. If a detail is unconfirmed, offer to check it.',
    ],
  },
  {
    title: 'Make the moment natural',
    category: 'At the chair',
    intro: 'Use the conversation you already have.',
    points: [
      'Ask permission before turning a service conversation into a recommendation.',
      'Connect the discussion to the routine they described.',
      'Leave space for a no. Trust matters more than a single transaction.',
    ],
  },
  {
    title: 'A ritual that travels',
    category: 'On the road',
    intro: 'Help someone plan a routine away from home.',
    points: [
      'Ask where they are going and what they normally use.',
      'Confirm the actual container sizes and destination rules before discussing travel suitability.',
      'Do not promise leak resistance, carry-on eligibility or availability without verified information.',
    ],
  },
  {
    title: 'Represent with clarity',
    category: 'Brand practice',
    intro: 'Confidence comes from knowing what you can stand behind.',
    points: [
      'Keep your experience personal and specific.',
      'Verify ingredients, directions, benefits and current offers against approved brand materials.',
      'Make any relevant brand relationship clear in your content. Never invent a result or a customer story.',
    ],
  },
];

/** Only approved policies may activate customer-facing benefits or earnings. */
export interface ReferralOffer {
  id: string;
  version: string;
  state: 'draft' | 'approved' | 'retired';
  customerBenefit: string;
  commissionPolicyId: string;
  startsAt: string;
  endsAt: string | null;
}
export interface MembershipStatus {
  ambassadorId: string;
  state: 'invited' | 'pending' | 'active' | 'suspended';
  tierId: string | null;
  approvedAt: string | null;
}
export interface Incentive {
  id: string;
  title: string;
  state: 'draft' | 'active' | 'ended';
  eligibilityPolicyVersion: string;
  rewardDescription: string;
}
export interface ContentAsset {
  id: string;
  title: string;
  url: string;
  kind: 'image' | 'video' | 'guide' | 'template';
  approval: 'draft' | 'approved' | 'retired';
  version: string;
  usageRights: string;
}

/** Cassius uses the server endpoint; commerce remains independently configured. */
export const cassiusGateway: Pick<CollectiveGateway, 'askIntelligence'> = {
  askIntelligence: (question, history) => askCassius(question, fetch, history),
};
