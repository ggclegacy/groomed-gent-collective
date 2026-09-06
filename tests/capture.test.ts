import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyMemory, cassiusContext } from '../lib/gentleman/model.ts';
import {
  quickCapture,
  promoteCapture,
  deskBuckets,
  type CaptureReview,
} from '../lib/capture/model.ts';
const review: CaptureReview = {
  kind: 'task',
  title: 'Follow up',
  detail: 'My reviewed commitment',
  date: '2026-09-06',
  relatedPersonId: '',
};
void test('quick capture retains prose privately and rejects empty or excessive input', () => {
  const m = quickCapture(emptyMemory(), 'My private observation\nSecond line');
  assert.equal(m.records[0].title, 'My private observation');
  assert.equal(m.records[0].detail, 'My private observation\nSecond line');
  assert.equal(m.records[0].shareWithCassius, false);
  assert.ok(!cassiusContext(m).includes('private observation'));
  assert.throws(() => quickCapture(m, ' '));
  assert.throws(() => quickCapture(m, 'x'.repeat(16001)));
});
void test('review promotion is atomic, private and rejects repeated or stale review', () => {
  const m = quickCapture(emptyMemory(), 'Discuss the proposal');
  const source = m.records[0];
  const basis = JSON.stringify(source);
  const next = promoteCapture(m, source.id, basis, review);
  assert.equal(next.records.length, 2);
  assert.equal(next.records[0].completed, true);
  assert.equal(next.records[1].shareWithCassius, false);
  assert.equal(m.records[0].completed, false);
  assert.throws(() => promoteCapture(next, source.id, basis, review));
  assert.throws(() =>
    promoteCapture(
      { ...m, records: [{ ...source, detail: 'Changed' }] },
      source.id,
      basis,
      review,
    ),
  );
  assert.throws(() =>
    promoteCapture(m, source.id, basis, { ...review, date: '2026-02-30' }),
  );
  assert.throws(() =>
    promoteCapture(m, source.id, basis, {
      ...review,
      relatedPersonId: 'missing',
    }),
  );
});
void test('destinations preserve reviewed text without inheriting source consent; capacity failure leaves source unprocessed', () => {
  const m = quickCapture(emptyMemory(), 'Original');
  m.records[0].shareWithCassius = true;
  const n = m.records[0];
  for (const kind of ['task', 'decision', 'person', 'reference'] as const) {
    const next = promoteCapture(m, n.id, JSON.stringify(n), {
      ...review,
      kind,
    });
    assert.equal(next.records[1].kind, kind);
    assert.equal(next.records[1].detail, review.detail);
    assert.equal(next.records[1].shareWithCassius, false);
  }
  const full = {
    ...m,
    records: Array.from({ length: 300 }, (_, i) => ({ ...n, id: String(i) })),
  };
  assert.throws(() =>
    promoteCapture(full, '0', JSON.stringify(full.records[0]), review),
  );
  assert.equal(full.records[0].completed, false);
});
void test('Desk separates open tasks and decisions by recorded date, ignoring unrelated records', () => {
  const m = quickCapture(emptyMemory(), 'Note');
  const n = m.records[0];
  const memory = {
    ...m,
    records: [
      n,
      ...['2026-09-04', '2026-09-05', '2026-09-06', ''].map((date, i) => ({
        ...n,
        id: String(i),
        kind: 'task' as const,
        date,
      })),
      {
        ...n,
        id: 'done',
        kind: 'decision' as const,
        date: '2026-09-01',
        completed: true,
      },
    ],
  };
  assert.equal(deskBuckets(memory, '').today.length, 0);
  const b = deskBuckets(memory, '2026-09-05');
  assert.deepEqual(
    Object.values(b).map((a) => a.length),
    [1, 1, 1, 1],
  );
});
