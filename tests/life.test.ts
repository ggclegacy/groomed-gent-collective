import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyMemory,
  parseMemory,
  priorities,
  cassiusContext,
  type PrivateRecord,
} from '../lib/gentleman/model.ts';
import {
  addPacking,
  completeRitual,
  packingCandidates,
  parsePacking,
  parseRitual,
  parseWardrobe,
  ritualDue,
} from '../lib/life/model.ts';
function record(
  kind: PrivateRecord['kind'],
  id = kind as string,
): PrivateRecord {
  return {
    id,
    kind,
    title: 'My ' + kind,
    detail: '',
    date: '2026-09-05',
    endDate: '',
    mode: 'business',
    completed: false,
    shareWithCassius: false,
    createdAt: '2026-09-05T12:00:00.000Z',
  };
}
const ritual: PrivateRecord = {
  ...record('ritual'),
  ritual: {
    cadenceDays: 2,
    timeOfDay: 'morning',
    steps: [{ id: 's1', text: 'My recorded product step' }],
    completions: [],
  },
};
const garment: PrivateRecord = {
  ...record('wardrobe'),
  wardrobe: {
    category: 'top',
    color: 'Deep green',
    dressCode: 'business',
    readiness: 'ready',
  },
};
void test('ritual completion advances Command priority without completing or mutating the ritual', () => {
  const memory = { ...emptyMemory(), records: [ritual] };
  assert.equal(priorities(memory, '2026-09-05')[0]?.id, ritual.id);
  const done = completeRitual(ritual, '2026-09-05', '2026-09-05');
  assert.equal(done.completed, false);
  assert.equal(ritualDue(done), '2026-09-07');
  assert.equal(ritual.ritual!.completions.length, 0);
  assert.equal(
    completeRitual(done, '2026-09-05', '2026-09-05').ritual!.completions.length,
    1,
  );
  assert.equal(
    priorities({ ...memory, records: [done] }, '2026-09-06').length,
    0,
  );
  assert.equal(
    priorities({ ...memory, records: [done] }, '2026-09-07').length,
    1,
  );
  assert.equal(ritualDue({ ...done, completed: true }), '');
  assert.throws(() => completeRitual(ritual, '2026-09-06', '2026-09-05'));
  assert.throws(() => completeRitual(ritual, '2026-09-04', '2026-09-05'));
});
void test('ritual cadence crosses leap days and keeps the most recent 90 distinct days', () => {
  const r = {
    ...ritual,
    date: '2024-01-01',
    ritual: { ...ritual.ritual!, cadenceDays: 1, completions: ['2024-02-28'] },
  };
  assert.equal(ritualDue(r), '2024-02-29');
  let current = r;
  for (let i = 0; i < 100; i++) {
    const day = new Date(Date.UTC(2024, 2, 1 + i)).toISOString().slice(0, 10);
    current = completeRitual(current, day, '2025-01-01') as typeof r;
  }
  assert.equal(current.ritual.completions.length, 90);
  assert.equal(current.ritual.completions.at(-1), '2024-06-08');
});
void test('Life schemas reject malformed, oversized and misplaced private data', () => {
  assert.throws(() => parseRitual({ ...ritual.ritual, cadenceDays: 0 }));
  assert.throws(() =>
    parseRitual({ ...ritual.ritual, completions: ['2026-02-30'] }),
  );
  assert.throws(() =>
    parseRitual({
      ...ritual.ritual,
      steps: [...ritual.ritual!.steps, ...ritual.ritual!.steps],
    }),
  );
  assert.throws(() =>
    parseWardrobe({ ...garment.wardrobe, readiness: 'invented' }),
  );
  assert.throws(() =>
    parseMemory({ ...emptyMemory(), records: [{ ...ritual, kind: 'note' }] }),
  );
  assert.throws(() =>
    parseMemory({ ...emptyMemory(), records: [{ ...ritual, date: '' }] }),
  );
  assert.throws(() => parsePacking([{ id: 'p', text: '', packed: false }]));
  assert.throws(() =>
    parsePacking(
      Array.from({ length: 101 }, (_, i) => ({
        id: String(i),
        text: 'item',
        packed: false,
      })),
    ),
  );
});
void test('packing handoff requires deliberate selection and skips unavailable garments', () => {
  const laundry = {
    ...garment,
    id: 'laundry',
    wardrobe: { ...garment.wardrobe!, readiness: 'laundry' as const },
  };
  const memory = { ...emptyMemory(), records: [ritual, garment, laundry] };
  assert.deepEqual(packingCandidates(memory, []), []);
  const choices = packingCandidates(memory, ['ritual', 'wardrobe', 'laundry']);
  assert.equal(choices.length, 2);
  const trip = addPacking(record('trip'), choices);
  assert.equal(trip.packing?.length, 2);
  const packed = {
    ...trip,
    packing: trip.packing!.map((p) => ({ ...p, packed: true })),
  };
  assert.deepEqual(addPacking(packed, choices).packing, packed.packing);
  assert.throws(() => addPacking({ ...trip, completed: true }, choices));
  const changed = packingCandidates(
    { ...memory, records: [{ ...garment, title: 'Renamed' }] },
    ['wardrobe'],
  );
  assert.deepEqual(addPacking(packed, changed).packing, packed.packing);
  assert.equal(record('trip').packing, undefined);
});
void test('memory v3 preserves new data and reads v1/v2; context requires record consent', () => {
  const trip = addPacking(
    record('trip'),
    packingCandidates({ ...emptyMemory(), records: [garment] }, ['wardrobe']),
  );
  const memory = parseMemory({
    ...emptyMemory(),
    records: [ritual, garment, trip],
  });
  assert.equal(memory.version, 3);
  assert.deepEqual(parseMemory(JSON.parse(JSON.stringify(memory))), memory);
  for (const version of [1, 2])
    assert.equal(parseMemory({ ...emptyMemory(), version }).version, 3);
  assert.ok(!cassiusContext(memory).includes('My recorded product step'));
  assert.ok(!cassiusContext(memory).includes('Deep green'));
  const permitted = {
    ...memory,
    records: memory.records.map((r) => ({ ...r, shareWithCassius: true })),
  };
  assert.ok(cassiusContext(permitted).includes('My recorded product step'));
  assert.ok(cassiusContext(permitted).includes('Deep green'));
  assert.ok(cassiusContext(permitted).length <= 7000);
});
