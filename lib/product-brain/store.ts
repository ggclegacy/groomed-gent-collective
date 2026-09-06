/** Offline, founder-operated ingestion only. Raw formula sources never enter browser bundles. */
import { createHash } from 'node:crypto';
import { validateSubmission, type Submission, type Store } from './schema.ts';
export const digest = (x: unknown): string =>
  createHash('sha256').update(stable(x)).digest('hex');
function stable(x: unknown): string {
  if (Array.isArray(x)) return '[' + x.map(stable).join(',') + ']';
  if (x && typeof x === 'object')
    return (
      '{' +
      Object.entries(x)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => JSON.stringify(k) + ':' + stable(v))
        .join(',') +
      '}'
    );
  return JSON.stringify(x);
}
export function ingest(store: Store, input: unknown): Store {
  validateSubmission(input);
  const duplicate = store.submissions.find(
    (s) => s.idempotencyKey === input.idempotencyKey,
  );
  if (duplicate) {
    if (digest(duplicate) !== digest(input))
      throw new Error('Idempotency key was reused with different content');
    return store;
  }
  const latest = store.submissions
    .filter((s) => s.dossier.productId === input.dossier.productId)
    .at(-1);
  if ((latest?.dossier.revision ?? null) !== input.expectedRevision)
    throw new Error('Stale revision: inspect current dossier before applying');
  const allSources = store.submissions.flatMap((s) => s.sources);
  for (const s of input.sources)
    if (allSources.some((old) => old.id === s.id && digest(old) !== digest(s)))
      throw new Error('Source IDs are immutable; use a new source ID');
  if (input.dossier.change === 'reformulation') {
    const next = input.dossier.sections.formula.version;
    const prior = latest?.dossier.sections.formula.version;
    if (!next.value || next.value === prior?.value)
      throw new Error(
        'Reformulation requires a new explicitly supplied formula version',
      );
  }
  for (const entry of input.intelligence) {
    const prior = store.submissions
      .flatMap((s) => s.intelligence)
      .filter((e) => e.id === entry.id)
      .at(-1);
    if ((prior?.revision ?? null) !== entry.previousRevision)
      throw new Error('Stale intelligence revision');
    if (
      prior &&
      (prior.layer !== entry.layer || prior.subject !== entry.subject)
    )
      throw new Error('Intelligence identity/layer cannot change');
  }
  return {
    schemaVersion: 1,
    submissions: [...store.submissions, structuredClone(input)],
  };
}
export function validateStore(x: unknown): asserts x is Store {
  if (
    !x ||
    typeof x !== 'object' ||
    !('schemaVersion' in x) ||
    x.schemaVersion !== 1 ||
    !('submissions' in x) ||
    !Array.isArray(x.submissions) ||
    Object.keys(x).length !== 2
  )
    throw new Error('Invalid store');
  let replay: Store = { schemaVersion: 1, submissions: [] };
  for (const s of x.submissions) {
    const next = ingest(replay, s);
    if (next === replay) throw new Error('Duplicate event in store');
    replay = next;
  }
}
export function release(store: Store) {
  validateStore(store);
  const latest = new Map<string, Submission>();
  for (const s of store.submissions) latest.set(s.dossier.productId, s);
  const intelligence = new Map();
  for (const s of store.submissions)
    for (const entry of s.intelligence)
      intelligence.set(entry.id, {
        ...entry,
        sources: s.sources.map(({ raw, ...source }) => ({
          ...source,
          sha256: createHash('sha256').update(raw).digest('hex'),
        })),
      });
  return {
    schemaVersion: 1,
    intelligence: [...intelligence.values()],
    version: digest(store),
    products: [...latest.values()].map((s) => ({
      dossier: s.dossier,
      sources: s.sources.map(({ raw, ...source }) => ({
        ...source,
        sha256: createHash('sha256').update(raw).digest('hex'),
      })),
    })),
  };
}
