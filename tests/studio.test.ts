import test from 'node:test';
import assert from 'node:assert/strict';
import {
  blankDraft,
  cassiusBrief,
  exportDraft,
  parseWorking,
  readLibrary,
  reviewStatus,
  saveDraft,
  updateDraft,
} from '../lib/studio.ts';
const now = '2026-09-05T12:00:00Z';
const draft = {
  ...blankDraft('draft-1', now),
  title: 'At the chair',
  body: 'My actual experience.',
  review: { personal: true, claims: true, relationship: true },
};
void test('library rejects corrupt, oversized, duplicate and unversioned records without resetting data', () => {
  for (const raw of [
    'broken',
    'null',
    '{}',
    JSON.stringify({ version: 2, drafts: [] }),
    JSON.stringify({ version: 1, drafts: [draft, draft] }),
    JSON.stringify({
      version: 1,
      drafts: [{ ...draft, body: 'a'.repeat(8001) }],
    }),
    JSON.stringify({
      version: 1,
      drafts: [{ ...draft, review: { personal: 'true' } }],
    }),
  ])
    assert.throws(() => readLibrary(raw));
  assert.deepEqual(readLibrary(null), { version: 1, drafts: [] });
});
void test('saving updates one draft while preserving other work and survives a serialized round trip', () => {
  let library = saveDraft(readLibrary(null), draft);
  library = saveDraft(library, { ...draft, id: 'draft-2', title: 'Travel' });
  library = saveDraft(library, { ...draft, title: 'Edited' });
  const restored = readLibrary(JSON.stringify(library));
  assert.equal(restored.drafts.length, 2);
  assert.equal(restored.drafts[0].title, 'Edited');
  assert.equal(restored.drafts[1].title, 'Travel');
  assert.equal(draft.title, 'At the chair');
});
void test('content or context edits invalidate self-review, title changes do not', () => {
  for (const patch of [
    { body: 'Changed claim' },
    { context: 'On the road' as const },
    { format: 'Conversation starter' as const },
  ]) {
    assert.equal(
      reviewStatus(updateDraft(draft, patch, now)),
      'Needs your review',
    );
  }
  assert.equal(
    reviewStatus(updateDraft(draft, { title: 'New title' }, now)),
    'Self-review complete',
  );
  assert.equal(
    reviewStatus({ ...draft, body: '[Add approved details]' }),
    'Placeholders remain',
  );
  assert.equal(reviewStatus({ ...draft, body: '' }), 'Not started');
});
void test('working drafts recover without a title; malformed content is not accepted', () => {
  assert.deepEqual(
    parseWorking(JSON.stringify(blankDraft('new', now))),
    blankDraft('new', now),
  );
  assert.equal(parseWorking('{"body":12}'), null);
  assert.equal(
    parseWorking(JSON.stringify({ ...draft, updatedAt: 'invalid' })),
    null,
  );
});
void test('saving requires usable content, and the capacity limit still allows editing', () => {
  assert.throws(() => saveDraft(readLibrary(null), { ...draft, title: ' ' }));
  const library = {
    version: 1 as const,
    drafts: Array.from({ length: 100 }, (_, index) => ({
      ...draft,
      id: `draft-${index}`,
    })),
  };
  assert.throws(() => saveDraft(library, { ...draft, id: 'new' }));
  assert.equal(saveDraft(library, draft).drafts.length, 100);
});
void test('exports never imply brand approval or publication and handoffs retain the entire draft', () => {
  const exported = exportDraft(draft);
  assert.match(exported, /Not brand-approved/);
  assert.match(exported, /Nothing has been published/);
  const full = { ...draft, body: 'x'.repeat(8000), title: 't'.repeat(100) };
  const brief = cassiusBrief(full);
  assert.ok(brief.includes(full.body));
  assert.ok(brief.length <= 10000);
  assert.match(brief, /Do not invent/);
});
