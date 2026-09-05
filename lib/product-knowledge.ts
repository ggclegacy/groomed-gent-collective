/** Canonical Product Studio contracts. No seed record is approved product knowledge. */
export const categories = [
  'Hair',
  'Beard',
  'Skin',
  'Hydration',
  'Performance',
  'Focus',
  'Recovery',
  'Sleep',
  'Daily Essentials',
] as const;
export type Category = (typeof categories)[number];
export const roles = [
  'Barber',
  'Bartender',
  'Trainer',
  'Gym Owner',
  'Creator',
  'Wellness Professional',
  'Business Owner',
  'Everyday Ambassador',
] as const;
export type Role = (typeof roles)[number];
export type Approval = 'draft' | 'approved' | 'retired';
export interface Revision {
  version: string;
  status: Approval;
  lastVerifiedAt: string | null;
  verifiedBy: string | null;
  sourceIds: string[];
}
export interface Source extends Revision {
  id: string;
  title: string;
  kind: 'founder' | 'manufacturer' | 'research' | 'policy' | 'brief';
  locator: string;
}
export interface Fact extends Revision {
  id: string;
  text: string;
}
export interface Claim extends Fact {
  tier: 'GREEN' | 'GOLD' | 'RED';
  qualification: string | null;
  channels: string[];
}
export interface Ingredient extends Revision {
  id: string;
  name: string;
  whatItIs: Fact | null;
  purpose: Fact | null;
  evidence: Fact[];
  synergies: Fact[];
  takeaways: Fact[];
  simpleExplanation: Fact | null;
  deepDive: Fact | null;
}
export const roomSections = [
  'What It Is',
  'Why It Exists',
  "What's Inside",
  'How It Works',
  'How To Use It',
  "Who It's For",
  'How To Talk About It',
  'Objection Handling',
  'Compare',
  'Science & Sources',
  'Content Studio',
  'Ask Atlas',
] as const;
export type RoomSection = (typeof roomSections)[number];
export interface Product extends Revision {
  id: string;
  name: string;
  descriptor: string;
  categories: Category[];
  concept: boolean;
  facts: Partial<Record<RoomSection, Fact[]>>;
  formula: {
    version: string;
    ingredients: { ingredientId: string; amount: Fact | null }[];
  } | null;
  claims: Claim[];
  pricing: (Revision & { minorUnits: number; currency: string }) | null;
  faq: { question: string; answer: Fact }[];
  objections: { concern: string; response: Fact }[];
  competitorNotes: Fact[];
  talkingPoints: Fact[];
}
export interface KnowledgeBase {
  version: string;
  products: Product[];
  ingredients: Ingredient[];
  sources: Source[];
  bundles: (Revision & { id: string; productIds: string[]; rationale: Fact })[];
  disclosurePolicies: (Fact & { relationship: string; channel: string })[];
  trainingModules: {
    id: string;
    version: string;
    productId: string | null;
    title: string;
    requiredFactIds: string[];
    status: Approval;
  }[];
  aiBehavior: {
    version: string;
    mode: 'controlled-retrieval';
    requireCitations: true;
    unsupported: 'abstain';
    policyVersion: string;
  };
}
const draft: Revision = {
  version: '0.1-concept',
  status: 'draft',
  lastVerifiedAt: null,
  verifiedBy: null,
  sourceIds: ['product-studio-brief'],
};
export const knowledge: KnowledgeBase = {
  version: '2026-09-05.1-draft',
  products: [
    [
      'legacy-reserve',
      'LEGACY RESERVE',
      'Hair + beard oil concept',
      ['Hair', 'Beard'],
    ],
    ['hydros', 'HYDROS', 'Electrolyte formula concept', ['Hydration']],
    [
      'ascend',
      'ASCEND',
      'Focus / performance concept',
      ['Focus', 'Performance'],
    ],
    ['nocturne', 'NOCTURNE', 'Nighttime formula concept', ['Sleep']],
  ].map(([id, name, descriptor, groups]) => ({
    ...draft,
    id: id as string,
    name: name as string,
    descriptor: descriptor as string,
    categories: groups as Category[],
    concept: true,
    facts: {},
    formula: null,
    claims: [],
    pricing: null,
    faq: [],
    objections: [],
    competitorNotes: [],
    talkingPoints: [],
  })),
  ingredients: [],
  sources: [
    {
      ...draft,
      sourceIds: [],
      id: 'product-studio-brief',
      title: 'Product Studio Research · planning brief',
      kind: 'brief',
      locator:
        'ChatGPT conversation 6a9c7798-7144-83ea-bfb5-aa69a087b7eb. Names and category concepts only; not product specifications.',
    },
  ],
  bundles: [],
  disclosurePolicies: [],
  trainingModules: [
    {
      id: 'evidence-first',
      version: '1',
      productId: null,
      title: 'Know what you can stand behind',
      requiredFactIds: [],
      status: 'draft',
    },
  ],
  aiBehavior: {
    version: '1',
    mode: 'controlled-retrieval',
    requireCitations: true,
    unsupported: 'abstain',
    policyVersion: 'unpublished',
  },
};
export function isVerified(record: Revision, db: KnowledgeBase): boolean {
  return (
    record.status === 'approved' &&
    Boolean(
      record.version &&
      record.verifiedBy &&
      record.lastVerifiedAt &&
      Number.isFinite(Date.parse(record.lastVerifiedAt)),
    ) &&
    record.sourceIds.length > 0 &&
    record.sourceIds.every((id) => {
      const source = db.sources.find((s) => s.id === id);
      return (
        source?.status === 'approved' &&
        source.kind !== 'brief' &&
        Boolean(
          source.locator &&
          source.version &&
          source.verifiedBy &&
          source.lastVerifiedAt &&
          Number.isFinite(Date.parse(source.lastVerifiedAt)),
        )
      );
    })
  );
}
export function approvedFacts(product: Product, db: KnowledgeBase): Fact[] {
  if (product.concept || !isVerified(product, db)) return [];
  return Object.values(product.facts)
    .flat()
    .filter((f) => isVerified(f, db));
}
export function allowedClaims(
  product: Product,
  db: KnowledgeBase,
  channel: string,
): Claim[] {
  if (product.concept || !isVerified(product, db)) return [];
  return product.claims.filter(
    (c) =>
      isVerified(c, db) &&
      c.tier !== 'RED' &&
      c.channels.includes(channel) &&
      (c.tier === 'GREEN' || Boolean(c.qualification?.trim())),
  );
}
export interface AtlasRequest {
  knowledgeVersion: string;
  policyVersion: string;
  productId: string;
  role: Role;
  intent:
    | 'question'
    | 'ingredient'
    | 'content'
    | 'recommendation'
    | 'simulation';
  question: string;
  channel: string;
}
export interface AtlasResult {
  state: 'needs-knowledge' | 'provider-offline';
  message: string;
  factIds: string[];
  sourceIds: string[];
  knowledgeVersion: string;
}
/** Fail closed; provider integration must re-run this gate on the server, never trust client context. */
export function prepareAtlas(
  request: AtlasRequest,
  db = knowledge,
): AtlasResult {
  const product = db.products.find((p) => p.id === request.productId);
  const facts = product ? approvedFacts(product, db) : [];
  const valid =
    request.knowledgeVersion === db.version &&
    request.policyVersion === db.aiBehavior.policyVersion;
  const ready = valid && facts.length > 0;
  return {
    state: ready ? 'provider-offline' : 'needs-knowledge',
    message: ready
      ? 'Verified context is available. Atlas is not connected; no AI answer has been generated.'
      : 'Atlas needs verified product knowledge for this request. No formula, benefit, price or recommendation can be inferred from a concept record.',
    factIds: valid ? facts.map((f) => f.id) : [],
    sourceIds: valid ? [...new Set(facts.flatMap((f) => f.sourceIds))] : [],
    knowledgeVersion: db.version,
  };
}
export function recommend(
  db: KnowledgeBase,
  category: Category,
  budget: number | null,
  currency: string,
) {
  return db.products.filter(
    (p) =>
      p.categories.includes(category) &&
      approvedFacts(p, db).length > 0 &&
      (budget === null ||
        (p.pricing &&
          isVerified(p.pricing, db) &&
          p.pricing.currency === currency &&
          p.pricing.minorUnits <= budget * 100)),
  );
}
export const scenarios: Record<Role, string> = {
  Barber:
    'A client asks about changing their beard routine at the end of an appointment.',
  Bartender:
    'A regular notices the brand and asks about your connection to it during a quiet moment.',
  Trainer:
    'A client asks whether a product belongs in their everyday routine after a session.',
  'Gym Owner':
    'A member asks which products your front desk might carry and why.',
  Creator:
    'A follower asks whether your recommendation is based on personal experience or a partnership.',
  'Wellness Professional':
    'A client asks for product guidance that goes beyond the information currently available.',
  'Business Owner':
    'A customer asks whether the brand would make a thoughtful gift for their team.',
  'Everyday Ambassador':
    'A friend asks what you like about the brand and whether it might suit them.',
};
export const reportDimensions = [
  'Product Knowledge',
  'Natural Delivery',
  'Needs Discovery',
  'Accuracy',
  'Brand Voice',
] as const;
/** Transparent practice prompts, never represented as AI scoring or certification. */
export function practiceReport(responses: string[]) {
  const text = responses.join(' ');
  return reportDimensions.map((name) => ({
    name,
    finding:
      name === 'Needs Discovery'
        ? text.includes('?')
          ? 'A question is present. Did it help you understand their routine?'
          : 'Try asking about their routine, priorities or budget before suggesting a product.'
        : name === 'Accuracy' || name === 'Product Knowledge'
          ? 'Not scored: verified product facts and a qualified evaluator are required.'
          : name === 'Natural Delivery'
            ? 'Read your response aloud. Does it sound like something you would actually say?'
            : 'Check for a calm tone, permission to continue and space for the customer to decline.',
  }));
}
export const dailyLesson = {
  id: 'evidence-first',
  version: '1',
  title: 'Confidence starts with a source.',
  lesson:
    'A product name is not a formula. A research paper about an ingredient is not proof of a finished product’s performance. Before sharing a detail, check the current product record, its source and its approved wording. If the detail is missing, say you will check.',
  questions: [
    {
      question:
        'A customer asks about an ingredient that is not documented. What comes next?',
      options: [
        'Infer it from the product category',
        'Check the current product specification',
        'Use a similar brand’s formula',
      ],
      answer: 1,
    },
    {
      question:
        'An ingredient study automatically proves the finished product works the same way.',
      options: ['True', 'False'],
      answer: 1,
    },
    {
      question: 'When a price has no verified source, you should…',
      options: [
        'Estimate a premium price',
        'Reuse an old promotion',
        'Confirm the current price before quoting it',
      ],
      answer: 2,
    },
  ],
};
export interface LearningProgress {
  version: 1;
  knowledgeVersion: string;
  completions: { id: string; lessonVersion: string; date: string }[];
}
export function readProgress(raw: string | null): LearningProgress {
  const empty: LearningProgress = {
    version: 1,
    knowledgeVersion: knowledge.version,
    completions: [],
  };
  if (!raw) return empty;
  const p = JSON.parse(raw) as LearningProgress;
  if (
    p.version !== 1 ||
    !Array.isArray(p.completions) ||
    p.completions.length > 1000 ||
    p.completions.some(
      (c) =>
        !c ||
        typeof c.id !== 'string' ||
        typeof c.lessonVersion !== 'string' ||
        typeof c.date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(c.date),
    )
  )
    throw new Error(
      'Saved learning progress could not be read. It has not been overwritten.',
    );
  return p.knowledgeVersion === knowledge.version ? p : empty;
}
export function contentBrief(
  product: Product,
  format: string,
  role: Role,
  relationship: string,
): string {
  const claims = allowedClaims(product, knowledge, format);
  return `EDITORIAL BRIEF — NOT APPROVED FOR PUBLICATION\n${format} · ${product.name} · ${role}\nKnowledge: ${knowledge.version}\nProduct record: ${product.version} (${product.status})\n\nPurpose: start a useful conversation in your own voice.\nProduct facts: ${
    approvedFacts(product, knowledge)
      .map((f) => f.text)
      .join('\n') || '[Awaiting verified product knowledge]'
  }\nApproved wording: ${claims.map((c) => c.text + (c.qualification ? ` ${c.qualification}` : '')).join('\n') || '[No approved claims available]'}\nRelationship: ${relationship}\nDisclosure: [Founder-reviewed guidance for this relationship, channel and jurisdiction required]\nDo not invent personal experience, prices, ingredients, benefits or competitor comparisons.\nReview product sources, current claims policy and disclosure before publication.`;
}

/** Server-owned contracts for the next provider/account phase. Never award mastery from browser state. */
export interface SimulationSession {
  id: string;
  ambassadorId: string;
  productId: string;
  knowledgeVersion: string;
  policyVersion: string;
  role: Role;
  customer: string;
  difficulty: string;
  turns: {
    speaker: 'customer' | 'ambassador';
    text: string;
    sourceIds: string[];
  }[];
  report:
    | {
        dimension: (typeof reportDimensions)[number];
        score: number | null;
        coaching: string;
        supportingTurnIndices: number[];
      }[]
    | null;
  evaluatorVersion: string | null;
}
export interface MasteryRecord {
  ambassadorId: string;
  productId: string;
  knowledgeVersion: string;
  curriculumVersion: string;
  level:
    | 'Foundation'
    | 'Product Certified'
    | 'Product Specialist'
    | 'Groomed Gent Authority';
  assessmentIds: string[];
  awardedBy: string;
  awardedAt: string;
  expiresAt: string | null;
}
export interface KnowledgeRelease {
  version: string;
  previousVersion: string | null;
  status: Approval;
  changedRecordIds: string[];
  reviewedBy: string | null;
  publishedAt: string | null;
  changeReason: string;
}
