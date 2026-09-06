import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyMemory,
  parseMemory,
  cassiusContext,
  priorities,
  validDate,
  type PrivateRecord,
} from '../lib/gentleman/model.ts';
const record = (patch: Partial<PrivateRecord> = {}): PrivateRecord => ({
  id: 'test',
  kind: 'person',
  title: 'Alex',
  detail: 'Private context',
  date: '2026-09-05',
  endDate: '',
  mode: 'leisure',
  completed: false,
  shareWithCassius: false,
  createdAt: '2026-09-05T12:00:00Z',
  ...patch,
});
void test('private memory excludes unconsented profile and records from AI context', () => {
  const m = emptyMemory();
  m.profile.business = 'Confidential';
  m.records = [record()];
  assert.ok(!cassiusContext(m).includes('Confidential'));
  assert.ok(!cassiusContext(m).includes('Private context'));
  m.shareProfile = true;
  m.records[0].shareWithCassius = true;
  assert.ok(cassiusContext(m).includes('Confidential'));
  assert.ok(cassiusContext(m).includes('Private context'));
});
void test('context remains parseable and bounded for maximal valid input', () => {
  const m = emptyMemory();
  m.shareProfile = true;
  for (const k of Object.keys(m.profile) as (keyof typeof m.profile)[])
    m.profile[k] = 'x'.repeat(1000);
  m.records = Array.from({ length: 300 }, (_, i) =>
    record({
      id: `r-${i}`,
      title: 'x'.repeat(160),
      detail: 'x'.repeat(16000),
      shareWithCassius: true,
    }),
  );
  const context = cassiusContext(m);
  assert.doesNotThrow(() => JSON.parse(context));
  assert.ok(context.length < 10000);
  assert.ok(JSON.parse(context).omittedRecords >= 288);
});
void test('invalid dates, duplicate ids, oversized fields, missing consent and reversed trips are rejected', () => {
  assert.equal(validDate('2026-02-30'), false);
  for (const records of [
    [record(), record()],
    [record({ endDate: '2026-09-04' })],
    [record({ detail: 'x'.repeat(16001) })],
    [record({ shareWithCassius: undefined })],
  ])
    assert.throws(() => parseMemory({ ...emptyMemory(), records }));
  assert.deepEqual(parseMemory(emptyMemory()), emptyMemory());
});
void test('Command ignores completed, future and ended travel records', () => {
  const m = emptyMemory();
  m.records = [
    record(),
    record({ id: 'done', completed: true }),
    record({ id: 'future', date: '2026-09-07' }),
    record({ id: 'old', kind: 'trip', endDate: '2026-09-05' }),
  ];
  assert.deepEqual(
    priorities(m, '2026-09-06').map((r) => r.id),
    ['test'],
  );
});
