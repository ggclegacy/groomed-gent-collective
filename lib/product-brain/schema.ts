/** Shared dossier contract. Every field is explicit; null never means absent from a formula. */
export const sections = {
  identity: [
    'officialName',
    'sku',
    'category',
    'collection',
    'status',
    'sizes',
    'price',
    'positioning',
    'targetCustomer',
  ],
  formula: [
    'version',
    'completeDeclaration',
    'fragrance',
    'rationale',
    'intendedOutcomes',
    'sensoryExperience',
    'categoryContext',
  ],
  use: [
    'amount',
    'frequency',
    'application',
    'sequencing',
    'amPm',
    'profileVariations',
  ],
  safety: [
    'sensitivities',
    'allergens',
    'patchTesting',
    'contraindications',
    'interactions',
    'referralBoundaries',
  ],
  education: [
    'shortPitch',
    'deepExplanation',
    'barberExplanation',
    'customerExplanation',
    'objections',
    'faq',
    'comparisons',
    'routines',
    'bundles',
    'training',
    'quiz',
  ],
  claims: [
    'approvedMarketing',
    'educationalExplanation',
    'prohibitedOrUnsubstantiated',
    'disclaimers',
    'evidence',
  ],
} as const;
export const ingredientFields = [
  'name',
  'inci',
  'commonName',
  'concentration',
  'supplier',
  'role',
  'fragranceInformation',
] as const;
export const intelligenceFields = [
  'purpose',
  'mechanism',
  'benefits',
  'limitations',
  'relevance',
  'evidenceQuality',
  'compatibility',
  'misconceptions',
] as const;
export type Status = 'unknown' | 'unverified' | 'disputed' | 'verified';
export type Layer =
  | 'ggc'
  | 'ingredient-evidence'
  | 'model-reasoning'
  | 'competitor';
export interface Evidence {
  sourceId: string;
  quote: string;
  locator: string;
}
export interface Field {
  value: string | null;
  status: Status;
  layer: Layer;
  evidence: Evidence[];
  verifiedBy: string | null;
  verifiedAt: string | null;
  note: string | null;
}
export interface Source {
  id: string;
  kind: 'founder' | 'manufacturer' | 'website' | 'research' | 'competitor';
  locator: string;
  capturedAt: string;
  raw: string;
}
export const supplementFields = [
  'facts',
  'servingSize',
  'servingsPerContainer',
  'otherIngredients',
  'footnotes',
  'blendDeclaration',
  'directions',
  'warnings',
  'storage',
  'variants',
  'websiteDescription',
  'websiteClaims',
  'conflicts',
] as const;
export interface Supplement {
  fields: Record<(typeof supplementFields)[number], Field>;
  rows: { id: string; name: Field; amount: Field; dailyValue: Field }[];
}
export interface Dossier {
  supplement?: Supplement;
  productId: string;
  revision: number;
  previousRevision: number | null;
  change: 'initial' | 'correction' | 'reformulation';
  reason: string;
  sections: Record<keyof typeof sections, Record<string, Field>>;
  ingredients: {
    id: string;
    fields: Record<(typeof ingredientFields)[number], Field>;
  }[];
}
export interface Intelligence {
  id: string;
  subject: string;
  revision: number;
  previousRevision: number | null;
  layer: 'ingredient-evidence' | 'competitor';
  fields: Record<(typeof intelligenceFields)[number], Field>;
}
export interface Submission {
  intelligence: Intelligence[];
  idempotencyKey: string;
  expectedRevision: number | null;
  sources: Source[];
  dossier: Dossier;
}
export interface Store {
  schemaVersion: 1;
  submissions: Submission[];
}
export const unknown = (): Field => ({
  value: null,
  status: 'unknown',
  layer: 'ggc',
  evidence: [],
  verifiedBy: null,
  verifiedAt: null,
  note: null,
});
export function emptyDossier(productId: string): Dossier {
  return {
    productId,
    revision: 1,
    previousRevision: null,
    change: 'initial',
    reason: 'First source intake',
    sections: Object.fromEntries(
      Object.entries(sections).map(([k, v]) => [
        k,
        Object.fromEntries(v.map((f) => [f, unknown()])),
      ]),
    ) as Dossier['sections'],
    ingredients: [],
  };
}
function check(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
const object = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === 'object' && !Array.isArray(x);
const text = (x: unknown): x is string => typeof x === 'string' && !!x.trim();
const date = (x: unknown) =>
  typeof x === 'string' &&
  /^\d{4}-\d{2}-\d{2}T/.test(x) &&
  Number.isFinite(Date.parse(x));
const id = (x: unknown) =>
  typeof x === 'string' && /^[a-z0-9][a-z0-9-]{0,100}$/.test(x);
function keys(
  x: Record<string, unknown>,
  expected: readonly string[],
  label: string,
) {
  check(
    Object.keys(x).sort().join('|') === [...expected].sort().join('|'),
    `${label}: missing or unexpected fields`,
  );
}
export function validateSubmission(
  input: unknown,
): asserts input is Submission {
  check(object(input), 'Submission must be an object');
  keys(
    input,
    [
      'idempotencyKey',
      'expectedRevision',
      'sources',
      'dossier',
      'intelligence',
    ],
    'submission',
  );
  check(id(input.idempotencyKey), 'Invalid idempotency key');
  check(
    input.expectedRevision === null ||
      (Number.isInteger(input.expectedRevision) &&
        Number(input.expectedRevision) > 0),
    'Invalid expected revision',
  );
  check(
    Array.isArray(input.sources) &&
      input.sources.length > 0 &&
      input.sources.length <= 50,
    'Sources required',
  );
  const sources = new Map<string, Source>();
  for (const s of input.sources) {
    check(object(s), 'Invalid source');
    keys(s, ['id', 'kind', 'locator', 'capturedAt', 'raw'], 'source');
    check(
      id(s.id) && !sources.has(s.id as string),
      'Duplicate/invalid source ID',
    );
    check(
      ['founder', 'manufacturer', 'website', 'research', 'competitor'].includes(
        String(s.kind),
      ) &&
        text(s.locator) &&
        date(s.capturedAt) &&
        text(s.raw) &&
        s.raw.length <= 2000000,
      'Invalid source provenance',
    );
    sources.set(s.id as string, s as unknown as Source);
  }
  const d = input.dossier;
  check(object(d), 'Dossier required');
  keys(
    d,
    [
      'productId',
      'revision',
      'previousRevision',
      'change',
      'reason',
      'sections',
      'ingredients',
      ...(d.supplement === undefined ? [] : ['supplement']),
    ],
    'dossier',
  );
  check(
    id(d.productId) &&
      Number.isInteger(d.revision) &&
      Number(d.revision) > 0 &&
      text(d.reason),
    'Invalid dossier identity/reason',
  );
  check(
    d.previousRevision === input.expectedRevision &&
      d.revision === (Number(input.expectedRevision) || 0) + 1,
    'Revision chain mismatch',
  );
  check(
    input.expectedRevision === null
      ? d.change === 'initial'
      : ['correction', 'reformulation'].includes(String(d.change)),
    'Invalid change type',
  );
  function field(f: unknown, path: string) {
    check(object(f), `${path}: explicit field required`);
    keys(
      f,
      [
        'value',
        'status',
        'layer',
        'evidence',
        'verifiedBy',
        'verifiedAt',
        'note',
      ],
      path,
    );
    check(
      ['unknown', 'unverified', 'disputed', 'verified'].includes(
        String(f.status),
      ),
      `${path}: invalid status`,
    );
    check(
      ['ggc', 'ingredient-evidence', 'model-reasoning', 'competitor'].includes(
        String(f.layer),
      ),
      `${path}: invalid layer`,
    );
    check(f.note === null || text(f.note), `${path}: invalid note`);
    check(Array.isArray(f.evidence), `${path}: evidence array required`);
    check(
      f.verifiedBy === null || text(f.verifiedBy),
      `${path}: invalid reviewer`,
    );
    check(
      f.verifiedAt === null || date(f.verifiedAt),
      `${path}: invalid verification date`,
    );
    if (f.status === 'unknown')
      check(
        f.value === null &&
          f.evidence.length === 0 &&
          f.verifiedBy === null &&
          f.verifiedAt === null,
        `${path}: unknown must be null without evidence/review`,
      );
    else {
      check(
        text(f.value) && f.evidence.length > 0,
        `${path}: value and evidence required`,
      );
      for (const e of f.evidence) {
        check(object(e), `${path}: invalid evidence`);
        keys(e, ['sourceId', 'quote', 'locator'], 'evidence');
        const s = sources.get(String(e.sourceId));
        check(
          s && text(e.quote) && text(e.locator) && s.raw.includes(e.quote),
          `${path}: quote must occur in preserved source`,
        );
        if (f.layer === 'ggc')
          check(
            ['website', 'founder', 'manufacturer'].includes(s.kind),
            `${path}: research cannot establish a GGC fact`,
          );
        if (f.status === 'verified' && f.layer === 'ggc')
          check(
            ['founder', 'manufacturer'].includes(s.kind),
            `${path}: website observations require first-party verification`,
          );
        if (f.layer === 'ingredient-evidence')
          check(s.kind === 'research', `${path}: research evidence required`);
        if (f.layer === 'competitor')
          check(s.kind === 'competitor', `${path}: competitor source required`);
      }
      if (f.status === 'verified')
        check(
          text(f.verifiedBy) &&
            date(f.verifiedAt) &&
            f.layer !== 'model-reasoning',
          `${path}: verified fields require reviewer/date; reasoning is not evidence`,
        );
      else
        check(
          f.verifiedBy === null && f.verifiedAt === null,
          `${path}: unverified/disputed must not carry verification`,
        );
    }
    // Dossier facts are company-controlled. Broader education is explicitly separated.
    if (
      !path.startsWith('intelligence.') &&
      !path.startsWith('claims.educationalExplanation')
    )
      check(f.layer === 'ggc', `${path}: product fields require GGC layer`);
    if (path === 'claims.approvedMarketing' && f.status !== 'unknown')
      check(
        f.status === 'verified',
        'Marketing claims require explicit approval',
      );
  }
  if (d.supplement !== undefined) {
    check(object(d.supplement), 'Invalid supplement extension');
    keys(d.supplement, ['fields', 'rows'], 'supplement');
    check(object(d.supplement.fields), 'Supplement fields required');
    keys(d.supplement.fields, supplementFields, 'supplement fields');
    for (const k of supplementFields)
      field(d.supplement.fields[k], `supplement.${k}`);
    check(
      Array.isArray(d.supplement.rows) && d.supplement.rows.length <= 300,
      'Invalid supplement rows',
    );
    const rowIds = new Set();
    for (const row of d.supplement.rows) {
      check(object(row), 'Invalid supplement row');
      keys(row, ['id', 'name', 'amount', 'dailyValue'], 'supplement row');
      check(id(row.id) && !rowIds.has(row.id), 'Duplicate supplement row');
      rowIds.add(row.id);
      for (const k of ['name', 'amount', 'dailyValue'])
        field(row[k], `supplement.rows.${String(row.id)}.${k}`);
      const name = row.name as Field,
        amount = row.amount as Field,
        dv = row.dailyValue as Field;
      check(name.value, 'Supplement row name required');
      // One exact source row must bind name, amount and DV together. An unrelated real quote
      // cannot legitimize an invented number or a number copied from a different ingredient.
      check(
        name.evidence.some(
          (e) =>
            e.quote.includes(name.value!) &&
            [amount, dv].every(
              (f) =>
                f.status === 'unknown' ||
                (e.quote.includes(f.value!) &&
                  f.evidence.some(
                    (a) => a.sourceId === e.sourceId && a.quote === e.quote,
                  )),
            ),
        ),
        'Supplement name/amount/DV must match the same source row',
      );
    }
    for (const k of ['servingSize', 'servingsPerContainer'] as const) {
      const f = d.supplement.fields[k] as Field;
      check(
        f.status === 'unknown' ||
          f.evidence.some((e) => e.quote.includes(f.value!)),
        'Serving facts must be exact source values',
      );
    }
  }
  check(Array.isArray(input.intelligence), 'Intelligence array required');
  const intelligenceIds = new Set();
  for (const entry of input.intelligence) {
    check(object(entry), 'Invalid intelligence');
    keys(
      entry,
      ['id', 'subject', 'revision', 'previousRevision', 'layer', 'fields'],
      'intelligence',
    );
    check(
      id(entry.id) && !intelligenceIds.has(entry.id) && text(entry.subject),
      'Invalid intelligence identity',
    );
    intelligenceIds.add(entry.id);
    check(
      ['ingredient-evidence', 'competitor'].includes(String(entry.layer)),
      'Invalid intelligence layer',
    );
    check(
      Number.isInteger(entry.revision) &&
        Number(entry.revision) > 0 &&
        (entry.previousRevision === null ||
          (Number.isInteger(entry.previousRevision) &&
            Number(entry.previousRevision) > 0)) &&
        entry.revision === (Number(entry.previousRevision) || 0) + 1,
      'Invalid intelligence revision',
    );
    check(object(entry.fields), 'Intelligence fields required');
    keys(entry.fields, intelligenceFields, 'intelligence fields');
    for (const name of intelligenceFields) {
      field(entry.fields[name], `intelligence.${String(entry.id)}.${name}`);
      check(
        (entry.fields[name] as Field).layer === entry.layer,
        'Intelligence field layer mismatch',
      );
    }
  }
  check(object(d.sections), 'Sections required');
  keys(d.sections, Object.keys(sections), 'sections');
  for (const [section, fields] of Object.entries(sections)) {
    const values = d.sections[section];
    check(object(values), `Invalid ${section}`);
    keys(values, fields, section);
    for (const name of fields) field(values[name], `${section}.${name}`);
  }
  check(
    Array.isArray(d.ingredients) && d.ingredients.length <= 300,
    'Invalid ingredients',
  );
  const ids = new Set();
  for (const row of d.ingredients) {
    check(object(row), 'Invalid ingredient');
    keys(row, ['id', 'fields'], 'ingredient');
    check(id(row.id) && !ids.has(row.id), 'Duplicate/invalid ingredient ID');
    ids.add(row.id);
    check(object(row.fields), 'Ingredient fields required');
    keys(row.fields, ingredientFields, 'ingredient fields');
    for (const name of ingredientFields)
      field(row.fields[name], `ingredients.${String(row.id)}.${name}`);
    check(
      row.fields.name && (row.fields.name as Field).value,
      'Ingredient name required',
    );
  }
  if (d.supplement !== undefined) {
    const supplement = d.supplement as unknown as Supplement;
    for (const ingredient of d.ingredients) {
      const fields = (ingredient as { fields: Record<string, Field> }).fields;
      check(
        fields.name.evidence.some((e) => e.quote.includes(fields.name.value!)),
        'Ingredient name must occur in source evidence',
      );
      if (fields.concentration.status !== 'unknown')
        check(
          supplement.rows.some(
            (r) =>
              r.name.value === fields.name.value &&
              r.amount.value === fields.concentration.value,
          ),
          'Ingredient amount must match its Supplement Facts row',
        );
      if (String((ingredient as { id: string }).id).startsWith('blend-member-'))
        check(
          fields.concentration.status === 'unknown',
          'Undisclosed blend member amount must remain unknown',
        );
    }
  }
  check(
    (d.sections.identity as Record<string, Field>).officialName.value,
    'Official name/source observation is required for intake',
  );
}
export function flatten(d: Dossier): [string, Field][] {
  return [
    ...supplementEntries(d),
    ...Object.entries(d.sections).flatMap(([s, fs]) =>
      Object.entries(fs).map(([k, f]) => [`${s}.${k}`, f] as [string, Field]),
    ),
    ...d.ingredients.flatMap((r) =>
      Object.entries(r.fields).map(
        ([k, f]) => [`ingredients.${r.id}.${k}`, f] as [string, Field],
      ),
    ),
  ];
}
export function coverage(d: Dossier) {
  return {
    unknown: flatten(d)
      .filter(([, f]) => f.status === 'unknown')
      .map(([k]) => k),
    unverified: flatten(d)
      .filter(([, f]) => f.status === 'unverified')
      .map(([k]) => k),
    disputed: flatten(d)
      .filter(([, f]) => f.status === 'disputed')
      .map(([k]) => k),
    verified: flatten(d)
      .filter(([, f]) => f.status === 'verified')
      .map(([k]) => k),
  };
}

export function supplementEntries(d: Dossier): [string, Field][] {
  if (!d.supplement) return [];
  return [
    ...Object.entries(d.supplement.fields).map(
      ([k, f]) => [`supplement.${k}`, f] as [string, Field],
    ),
    ...d.supplement.rows.flatMap((r) =>
      (['name', 'amount', 'dailyValue'] as const).map(
        (k) => [`supplement.rows.${r.id}.${k}`, r[k]] as [string, Field],
      ),
    ),
  ];
}
