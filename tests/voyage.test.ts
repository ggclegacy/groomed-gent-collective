import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyPlan,
  toInstant,
  localTime,
  parsePlan,
  conflicts,
  mergeSuggestion,
  calendarExport,
  nextEvent,
  type ItineraryEvent,
} from '../lib/voyage/model.ts';
import {
  emptyMemory,
  parseMemory,
  cassiusContext,
} from '../lib/gentleman/model.ts';
import {
  followUpTask,
  meetingBrief,
  nextFollowUp,
} from '../lib/circle/model.ts';
const event = (patch: Partial<ItineraryEvent> = {}): ItineraryEvent => ({
  id: 'e1',
  title: 'Meeting',
  kind: 'meeting',
  startAt: '2026-09-05T09:00:00.000Z',
  endAt: '2026-09-05T10:00:00.000Z',
  location: 'Office',
  notes: '',
  anchored: true,
  completed: false,
  status: 'member-confirmed',
  contactId: '',
  ...patch,
});
void test('local times convert across date lines and DST without guessing ambiguous times', () => {
  assert.equal(
    toInstant('2026-09-05T09:00', 'America/Chicago'),
    '2026-09-05T14:00:00.000Z',
  );
  assert.equal(
    localTime('2026-09-05T23:00:00.000Z', 'Asia/Tokyo'),
    '2026-09-06T08:00',
  );
  assert.throws(() => toInstant('2026-03-08T02:30', 'America/Chicago'));
  assert.throws(() => toInstant('2026-11-01T01:30', 'America/Chicago'));
  assert.throws(() => toInstant('2026-02-30T09:00', 'UTC'));
});
void test('itinerary validation rejects duplicate IDs, reversed times and out-of-trip events', () => {
  const p = { ...emptyPlan(), events: [event()] };
  assert.equal(parsePlan(p, '2026-09-05', '2026-09-06').events.length, 1);
  assert.throws(() =>
    parsePlan({ ...p, events: [event(), event()] }, '2026-09-05', '2026-09-06'),
  );
  assert.throws(() =>
    parsePlan(
      { ...p, events: [event({ endAt: '2026-09-05T08:00:00.000Z' })] },
      '2026-09-05',
      '2026-09-06',
    ),
  );
  assert.throws(() => parsePlan(p, '2026-09-06', '2026-09-07'));
});
void test('replanning cannot replace fixed events or promote AI suggestions to confirmed', () => {
  const current = { ...emptyPlan(), events: [event()] };
  const suggested = {
    ...emptyPlan(),
    events: [
      event({ title: 'Overwrite me' }),
      event({
        id: 'new',
        anchored: true,
        status: 'member-confirmed',
        contactId: 'secret',
      }),
    ],
  };
  const result = mergeSuggestion(current, suggested);
  assert.equal(result.events[0].title, 'Meeting');
  assert.equal(result.events[1].anchored, false);
  assert.equal(result.events[1].status, 'suggested');
  assert.equal(result.events[1].contactId, '');
  assert.throws(() =>
    mergeSuggestion(current, { ...suggested, timeZone: 'Asia/Tokyo' }),
  );
});
void test('conflict and next-event logic use instants, handle nesting, and skip completion', () => {
  const events = [
    event(),
    event({
      id: 'nested',
      startAt: '2026-09-05T09:15:00.000Z',
      endAt: '2026-09-05T09:30:00.000Z',
    }),
    event({
      id: 'adjacent',
      startAt: '2026-09-05T10:00:00.000Z',
      endAt: '2026-09-05T11:00:00.000Z',
    }),
  ];
  assert.deepEqual(conflicts(events), [{ a: 'e1', b: 'nested' }]);
  assert.equal(
    nextEvent({ ...emptyPlan(), events }, '2026-09-05T09:45:00.000Z')?.id,
    'e1',
  );
  assert.equal(
    nextEvent({ ...emptyPlan(), events }, '2026-09-05T12:00:00.000Z'),
    null,
  );
});
void test('calendar exports escape content and use UTC instants', () => {
  const result = calendarExport(
    {
      ...emptyPlan(),
      events: [event({ title: 'Meet; Alex, CEO\nBEGIN:VEVENT' })],
    },
    'trip',
    '2026-09-05T00:00:00.456Z',
  );
  assert.ok(result.includes('DTSTART:20260905T090000Z'));
  assert.ok(result.includes('DTSTAMP:20260905T000000Z'));
  assert.ok(result.includes('Meet\\; Alex\\, CEO\\nBEGIN:VEVENT'));
  assert.equal(result.split('\r\nBEGIN:VEVENT\r\n').length, 2);
});
void test('memory v1 upgrades losslessly, v2 preserves trip/relationship fields and disallows dangling links', () => {
  const m = emptyMemory();
  m.records = [
    {
      id: 'p',
      kind: 'person',
      title: 'Alex',
      detail: 'Original note',
      date: '2026-09-05',
      endDate: '',
      mode: 'business',
      completed: false,
      shareWithCassius: false,
      createdAt: '2026-09-01T12:00:00Z',
    },
  ];
  const upgraded = parseMemory({ ...m, version: 1 });
  assert.equal(upgraded.version, 3);
  assert.equal(upgraded.records[0].detail, 'Original note');
  const task = followUpTask(upgraded.records[0], '2026-09-05T00:00:00Z');
  upgraded.records.push(task);
  assert.equal(
    meetingBrief(upgraded.records[0], upgraded).commitments.length,
    1,
  );
  assert.equal(parseMemory(upgraded).records[1].relatedPersonId, 'p');
  assert.throws(() => parseMemory({ ...upgraded, records: [task] }));
});
void test('relationship cadence advances correctly across month and year boundaries', () => {
  assert.equal(nextFollowUp('2026-12-30', 7), '2027-01-06');
  assert.equal(nextFollowUp('2026-09-05', 0), '');
  assert.throws(() => nextFollowUp('2026-02-30', 7));
});
void test('escaped profile values cannot overflow selected context limit', () => {
  const m = emptyMemory();
  m.shareProfile = true;
  for (const k of Object.keys(m.profile) as (keyof typeof m.profile)[])
    m.profile[k] = '\u0000'.repeat(1000);
  assert.ok(cassiusContext(m).length <= 7000);
  assert.doesNotThrow(() => JSON.parse(cassiusContext(m)));
});
