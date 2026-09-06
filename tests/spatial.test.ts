import test from 'node:test';
import assert from 'node:assert/strict';
import { surfacePose, commandContext } from '../lib/spatial/model.ts';
import { emptyMemory, type PrivateRecord } from '../lib/gentleman/model.ts';
void test('spatial response stays flat for invalid geometry and bounded at every pointer edge', () => {
  assert.deepEqual(surfacePose(100, 50, 200, 100), {
    x: 0,
    y: 0,
    lightX: 50,
    lightY: 50,
  });
  for (const [x, y] of [
    [-500, -500],
    [0, 0],
    [200, 100],
    [500, 500],
  ]) {
    const p = surfacePose(x, y, 200, 100);
    assert.ok(Math.abs(p.x) <= 2 && Math.abs(p.y) <= 2);
    assert.ok(p.lightX >= 0 && p.lightX <= 100);
  }
  assert.deepEqual(surfacePose(NaN, 0, 10, 10), {
    x: 0,
    y: 0,
    lightX: 50,
    lightY: 50,
  });
  assert.equal(surfacePose(5, 5, 0, 0).x, 0);
});
void test('Command displays actual private context and distinguishes recorded rituals from due priorities', () => {
  const m = emptyMemory();
  const r: PrivateRecord = {
    id: 'ritual',
    kind: 'ritual',
    title: 'Morning',
    detail: '',
    date: '2026-09-06',
    endDate: '',
    createdAt: '2026-09-06T10:00:00.000Z',
    mode: 'leisure',
    completed: false,
    shareWithCassius: false,
    ritual: {
      cadenceDays: 1,
      timeOfDay: 'morning',
      steps: [{ id: 'step', text: 'My step' }],
      completions: ['2026-09-06'],
    },
  };
  m.records = [
    r,
    { ...r, id: 'paused', completed: true },
    { ...r, id: 'person', kind: 'person', ritual: undefined },
    {
      ...r,
      id: 'old-trip',
      kind: 'trip',
      ritual: undefined,
      date: '2026-09-01',
      endDate: '2026-09-02',
    },
    {
      ...r,
      id: 'new-trip',
      kind: 'trip',
      ritual: undefined,
      date: '2026-09-10',
      endDate: '2026-09-12',
    },
  ];
  const c = commandContext(m, '2026-09-06');
  assert.equal(c.rituals, 1);
  assert.equal(c.ritualsRecorded, 1);
  assert.equal(c.people, 1);
  assert.equal(c.trip?.id, 'new-trip');
  assert.ok(!c.priorities.some((p) => p.id === 'ritual'));
  const empty = commandContext(emptyMemory(), '2026-09-06');
  assert.equal(empty.rituals, 0);
  assert.equal(empty.trip, undefined);
  assert.equal(commandContext(m, '').priorities.length, 0);
});
