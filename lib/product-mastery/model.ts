import { productBrain, type ProductRelease } from '../product-brain/runtime.ts';
import type { Dossier, Field } from '../product-brain/schema.ts';

export const skills = [
  'Product essentials',
  'Formula & serving',
  'Use & cautions',
  'Evidence judgment',
  'Customer conversations',
] as const;
export type Skill = (typeof skills)[number];
export interface Card {
  id: string;
  productId: string;
  version: string;
  skill: Skill;
  title: string;
  lesson: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  fields: { path: string; field: Field }[];
}
export const label = (s: string) =>
  s.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
export function signature(value: unknown) {
  let hash = 2166136261;
  for (const c of JSON.stringify(value))
    hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16);
}
const available = (f: Field | undefined): f is Field =>
  Boolean(
    f?.value &&
    f.status !== 'unknown' &&
    f.status !== 'disputed' &&
    f.evidence.length,
  );
export function productName(d: Dossier) {
  return d.sections.identity.officialName.value ?? d.productId;
}
export function cardsFor(d: Dossier): Card[] {
  const cards: Card[] = [];
  const add = (
    key: string,
    skill: Skill,
    title: string,
    lesson: string,
    question: string,
    answer: string,
    options: string[],
    fields: Card['fields'],
  ) => {
    const sorted = [...new Set(options)].sort((a, b) =>
      signature(key + a).localeCompare(signature(key + b)),
    );
    cards.push({
      id: `${d.productId}/${key}`,
      productId: d.productId,
      version: signature({
        key,
        skill,
        lesson,
        question,
        answer,
        sorted,
        fields,
      }),
      skill,
      title,
      lesson,
      question,
      answer,
      options: sorted,
      explanation: lesson,
      fields,
    });
  };
  const name = productName(d);
  const identity = d.sections.identity.category;
  if (available(identity))
    add(
      'identity',
      skills[0],
      'Know the product',
      `The product record lists the category as: ${identity.value}. Status: ${identity.status}.`,
      `Which category is recorded for ${name}?`,
      identity.value!,
      [
        identity.value!,
        'No category is recorded',
        'A category can be inferred from its name',
      ],
      [{ path: 'identity.category', field: identity }],
    );
  const serving = d.supplement?.fields.servingSize ?? d.sections.use.amount;
  if (available(serving))
    add(
      'serving',
      skills[1],
      'Keep the serving attached',
      `The captured serving statement is: ${serving.value}. Ingredient amounts must keep this serving basis. This is ${serving.status === 'verified' ? 'a reviewed record' : 'a website observation, not manufacturer verification'}.`,
      'Recall the serving statement from the record.',
      serving.value!,
      [],
      [
        {
          path: d.supplement ? 'supplement.servingSize' : 'use.amount',
          field: serving,
        },
      ],
    );
  for (const row of d.supplement?.rows ?? []) {
    if (!available(row.name)) continue;
    if (available(row.amount) && available(serving)) {
      add(
        `amount-${row.id}`,
        skills[1],
        row.name.value!,
        `The captured label lists ${row.name.value}: ${row.amount.value} per ${serving.value}. Daily Value: ${row.dailyValue.value ?? 'not supplied'}. Website observations require review.`,
        `What amount does the captured label list for ${row.name.value}, per ${serving.value}? Include the unit shown.`,
        row.amount.value!,
        [],
        [
          { path: `supplement.rows.${row.id}.name`, field: row.name },
          { path: `supplement.rows.${row.id}.amount`, field: row.amount },
          { path: 'supplement.servingSize', field: serving },
        ],
      );
    } else if (!row.amount.value || row.amount.status === 'unknown') {
      add(
        `unknown-${row.id}`,
        skills[3],
        'Respect an undisclosed amount',
        `${row.name.value} is listed, but its individual amount is unknown. A blend total cannot be divided into assumed doses.`,
        `A customer asks for the individual amount of ${row.name.value}. What can you say?`,
        'Its individual amount is not disclosed in this record.',
        [
          'Its individual amount is not disclosed in this record.',
          'Divide the blend total equally among its members.',
          'Use the typical amount from a similar product.',
        ],
        [
          { path: `supplement.rows.${row.id}.name`, field: row.name },
          { path: `supplement.rows.${row.id}.amount`, field: row.amount },
        ],
      );
    }
  }
  const directions =
    d.supplement?.fields.directions ?? d.sections.use.application;
  if (available(directions))
    add(
      'directions',
      skills[2],
      'Use the actual instructions',
      `The source states: ${directions.value}`,
      'How should you explain this product’s use?',
      'Use the captured directions, identify their source, and resolve any label conflict before recommending use.',
      [
        'Use the captured directions, identify their source, and resolve any label conflict before recommending use.',
        'Adjust the dose based on the customer’s desired speed of results.',
        'Assume all products in this category have the same instructions.',
      ],
      [{ path: 'use.application', field: directions }],
    );
  const safety =
    d.supplement?.fields.warnings ?? d.sections.safety.sensitivities;
  add(
    'caution',
    skills[2],
    'Know when to pause',
    safety?.value
      ? `Recorded caution (${safety.status}): ${safety.value}. Do not infer that unlisted risks are absent.`
      : 'The caution field is unknown. Missing cautions do not establish safety.',
    'A customer asks whether this is safe with their medication. What is the right next step?',
    'Show the current label and ask them to check with a qualified clinician or pharmacist.',
    [
      'Show the current label and ask them to check with a qualified clinician or pharmacist.',
      'Say it is safe because the website does not mention that medication.',
      'Suggest a smaller dose to avoid an interaction.',
    ],
    safety ? [{ path: 'safety.sensitivities', field: safety }] : [],
  );
  const claims = d.sections.claims.approvedMarketing;
  add(
    'claims',
    skills[3],
    'Separate evidence from advertising',
    claims.status === 'verified' && claims.value
      ? `Reviewed marketing language: ${claims.value}. Approval applies to this language and revision.`
      : 'No approved marketing language is supplied for this record. A website claim or an ingredient study is not approval for a finished-product promise.',
    'What can turn a product statement into customer-ready promotional copy?',
    'Current reviewed marketing language with its required qualifications and relationship disclosure.',
    [
      'Current reviewed marketing language with its required qualifications and relationship disclosure.',
      'Any benefit written on the website.',
      'Any finding from a study on one ingredient.',
    ],
    [{ path: 'claims.approvedMarketing', field: claims }],
  );
  const conflicts = d.supplement?.fields.conflicts;
  if (conflicts?.value)
    add(
      'conflicts',
      skills[3],
      'Spot the unresolved detail',
      `The audit flags: ${conflicts.value}`,
      'Two source statements conflict. What should you teach?',
      'Explain the conflict and request a current verified label; keep the disputed fact unresolved.',
      [
        'Explain the conflict and request a current verified label; keep the disputed fact unresolved.',
        'Choose whichever statement makes the product sound stronger.',
        'Average the amounts to create one consistent answer.',
      ],
      [{ path: 'supplement.conflicts', field: conflicts }],
    );
  add(
    'discovery',
    skills[4],
    'Listen before recommending',
    'Ask about the customer’s goal, current routine, preferences and budget. Check the current record before discussing fit. Leave room for a no.',
    'A customer says “sell me your strongest product.” What should you do first?',
    'Ask what they want to achieve and what they currently use, then check product fit and cautions.',
    [
      'Ask what they want to achieve and what they currently use, then check product fit and cautions.',
      'Pick the most expensive item.',
      'Promise fast results to create urgency.',
    ],
    [],
  );
  return cards;
}
export const catalogCards = (db: ProductRelease = productBrain) =>
  db.products.flatMap((p) => cardsFor(p.dossier));
export interface Attempt {
  id: string;
  cardId: string;
  version: string;
  correct: boolean;
  confidence: number;
  at: string;
  assessed: boolean;
}
export interface RecordProgress {
  version: string;
  successes: number;
  delayed: number;
  lastAt: string;
  dueAt: string;
  correct: boolean;
  confidence: number;
}
export interface LearningState {
  version: 1;
  goal: number;
  records: Record<string, RecordProgress>;
  attempts: Attempt[];
}
export const emptyLearning = (): LearningState => ({
  version: 1,
  goal: 3,
  records: {},
  attempts: [],
});
export interface AnswerCommand {
  action: 'answer';
  id: string;
  cardId: string;
  version: string;
  answer: string;
  confidence: number;
  mode: 'recall' | 'guided';
}
export type LearningCommand = AnswerCommand | { action: 'goal'; goal: number };
export function parseCommand(raw: unknown): LearningCommand {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error('Invalid learning action.');
  const d = raw as Record<string, unknown>;
  if (
    d.action === 'goal' &&
    Number.isInteger(d.goal) &&
    [0, 2, 3, 5, 7].includes(Number(d.goal))
  )
    return { action: 'goal', goal: Number(d.goal) };
  if (
    d.action !== 'answer' ||
    typeof d.id !== 'string' ||
    !/^[\w-]{10,80}$/.test(d.id) ||
    typeof d.cardId !== 'string' ||
    d.cardId.length > 240 ||
    typeof d.version !== 'string' ||
    d.version.length > 100 ||
    typeof d.answer !== 'string' ||
    d.answer.length > 2000 ||
    ![1, 2, 3].includes(Number(d.confidence)) ||
    !['recall', 'guided'].includes(String(d.mode))
  )
    throw new Error('Invalid answer.');
  return {
    action: 'answer',
    id: d.id,
    cardId: d.cardId,
    version: d.version,
    answer: d.answer,
    confidence: Number(d.confidence),
    mode: d.mode as AnswerCommand['mode'],
  };
}
const normalize = (v: string) =>
  v
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(\d)\s+(mg|mcg|g|iu|%)/g, '$1$2');
export function applyLearning(
  state: LearningState,
  command: LearningCommand,
  now = new Date().toISOString(),
  cards = catalogCards(),
): LearningState {
  if (command.action === 'goal') return { ...state, goal: command.goal };
  if (state.attempts.some((a) => a.id === command.id)) return state;
  const card = cards.find((c) => c.id === command.cardId);
  if (!card || card.version !== command.version)
    throw new Error('This lesson changed. Reload it before answering.');
  const correct = normalize(command.answer) === normalize(card.answer);
  const old = state.records[card.id];
  const current = old?.version === card.version ? old : undefined;
  const elapsed = current
    ? Date.parse(now) - Date.parse(current.lastAt)
    : Infinity;
  // Revealed answers and rapid retries are practice, never a shortcut to mastery.
  const assessed =
    command.mode === 'recall' &&
    (!current || Date.parse(now) >= Date.parse(current.dueAt));
  const delayed =
    assessed && correct && Boolean(current?.correct) && elapsed >= 86400000;
  const successes = (current?.successes ?? 0) + (assessed && correct ? 1 : 0);
  const interval = !correct
    ? 600000
    : command.confidence === 1 || !assessed
      ? 3600000
      : [1, 3, 7, 14, 30][Math.min(Math.max(successes - 1, 0), 4)] * 86400000;
  const record: RecordProgress = {
    version: card.version,
    successes,
    delayed: (current?.delayed ?? 0) + (delayed ? 1 : 0),
    lastAt: now,
    dueAt: new Date(Date.parse(now) + interval).toISOString(),
    correct,
    confidence: command.confidence,
  };
  return {
    ...state,
    records: {
      ...state.records,
      [card.id]: !assessed && current ? current : record,
    },
    attempts: [
      ...state.attempts,
      {
        id: command.id,
        cardId: card.id,
        version: card.version,
        correct,
        confidence: command.confidence,
        at: now,
        assessed,
      },
    ].slice(-1000),
  };
}
export function reviewQueue(
  state: LearningState,
  cards = catalogCards(),
  now = Date.now(),
) {
  const priority = (c: Card) => {
    const r = state.records[c.id];
    return !r
      ? 3
      : r.version !== c.version
        ? 0
        : Date.parse(r.dueAt) > now
          ? 5
          : !r.correct && r.confidence === 3
            ? 1
            : 2;
  };
  return [...cards].sort(
    (a, b) =>
      priority(a) - priority(b) ||
      (state.records[a.id]?.dueAt ?? '').localeCompare(
        state.records[b.id]?.dueAt ?? '',
      ) ||
      a.id.localeCompare(b.id),
  );
}
export function mastery(state: LearningState, cards: Card[]) {
  return skills.map((skill) => {
    const relevant = cards.filter((c) => c.skill === skill);
    const learned = relevant.filter((c) => {
      const r = state.records[c.id];
      return r?.version === c.version && r.correct && r.delayed >= 1;
    }).length;
    return {
      skill,
      total: relevant.length,
      learned,
      percent: relevant.length
        ? Math.round((learned / relevant.length) * 100)
        : 0,
    };
  });
}
export function customerCard(d: Dossier, relationship: string) {
  const approved = d.sections.claims.approvedMarketing;
  if (
    approved.status !== 'verified' ||
    !approved.value ||
    approved.layer !== 'ggc' ||
    !approved.verifiedBy ||
    !approved.verifiedAt ||
    !approved.evidence.length
  )
    return null;
  return `${productName(d)}\n\n${approved.value}\n\n${d.sections.claims.disclaimers.status === 'verified' ? (d.sections.claims.disclaimers.value ?? '') : ''}\n\n${relationship}\nProduct record revision ${d.revision}`;
}
export function creatorBrief(d: Dossier, relationship: string) {
  const copy = customerCard(d, relationship);
  return `GGC PRODUCT BRIEF — review before publishing\nProduct: ${productName(d)}\nProduct ID: ${d.productId}\nRevision: ${d.revision}\n\n${copy ?? 'No reviewed marketing copy is available. Do not generate product benefit claims until approved language is supplied.'}\n\nRelationship: ${relationship}\nKeep first-party observations, ingredient education, and approved marketing separate. Unknown or disputed facts must remain unresolved. Verify the current record before publishing.`;
}
