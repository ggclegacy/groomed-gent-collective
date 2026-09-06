export const eventKinds = [
  'meeting',
  'work',
  'transfer',
  'meal',
  'experience',
  'grooming',
  'rest',
] as const;
export type ItineraryEvent = {
  id: string;
  title: string;
  kind: (typeof eventKinds)[number];
  startAt: string;
  endAt: string;
  location: string;
  notes: string;
  anchored: boolean;
  completed: boolean;
  status: 'suggested' | 'member-confirmed';
  contactId: string;
};
export type TripPlan = {
  timeZone: string;
  events: ItineraryEvent[];
  cityNotes: string;
  grooming: { id: string; text: string; done: boolean }[];
};
export function textValue(v: unknown, max: number, required = false): string {
  if (typeof v !== 'string' || v.length > max || (required && !v.trim()))
    throw new Error('Check the required text and length.');
  return v.trim();
}
export function validZone(zone: unknown): zone is string {
  if (typeof zone !== 'string' || zone.length > 80) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone }).format();
    return true;
  } catch {
    return false;
  }
}
export function localTime(instant: string, zone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(instant));
  const p = Object.fromEntries(parts.map((v) => [v.type, v.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
/** Reject ambiguous and nonexistent wall times instead of silently shifting meetings across DST. */
export function toInstant(wall: string, zone: string): string {
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(wall) ||
    !validZone(zone) ||
    !Number.isFinite(Date.parse(wall + ':00Z'))
  )
    throw new Error('Use a valid date, time and IANA time zone.');
  const utc = Date.parse(wall + ':00Z');
  const offsets = new Set<number>();
  for (const hours of [-36, 0, 36]) {
    const t = utc + hours * 3600000;
    offsets.add(
      Date.parse(localTime(new Date(t).toISOString(), zone) + ':00Z') - t,
    );
  }
  const matches = [...offsets]
    .map((offset) => new Date(utc - offset).toISOString())
    .filter((t) => localTime(t, zone) === wall);
  if (matches.length !== 1)
    throw new Error(
      'This local time is missing or repeated during a clock change. Choose an unambiguous time.',
    );
  return matches[0];
}
export function emptyPlan(timeZone = 'UTC'): TripPlan {
  return { timeZone, events: [], cityNotes: '', grooming: [] };
}
export function parsePlan(raw: unknown, from: string, to: string): TripPlan {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid itinerary.');
  const p = raw as TripPlan;
  if (
    !validZone(p.timeZone) ||
    !Array.isArray(p.events) ||
    p.events.length > 120 ||
    !Array.isArray(p.grooming) ||
    p.grooming.length > 30
  )
    throw new Error('Invalid itinerary size or time zone.');
  const ids = new Set<string>();
  const id = (v: unknown) => {
    const s = textValue(v, 64, true);
    if (!/^[\w-]+$/.test(s) || ids.has(s))
      throw new Error('Duplicate or invalid itinerary ID.');
    ids.add(s);
    return s;
  };
  const events = p.events.map((e) => {
    if (
      !e ||
      !eventKinds.includes(e.kind) ||
      typeof e.anchored !== 'boolean' ||
      typeof e.completed !== 'boolean' ||
      !['suggested', 'member-confirmed'].includes(e.status)
    )
      throw new Error('Invalid event.');
    const startAt = textValue(e.startAt, 30),
      endAt = textValue(e.endAt, 30);
    if (
      ![startAt, endAt].every(
        (t) =>
          /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.000Z$/.test(t) &&
          Number.isFinite(Date.parse(t)) &&
          new Date(t).toISOString() === t,
      ) ||
      endAt <= startAt
    )
      throw new Error('Event must end after it starts.');
    if (
      !from ||
      !to ||
      localTime(startAt, p.timeZone).slice(0, 10) < from ||
      localTime(endAt, p.timeZone).slice(0, 10) > to
    )
      throw new Error('Event falls outside the trip dates.');
    return {
      id: id(e.id),
      title: textValue(e.title, 160, true),
      kind: e.kind,
      startAt,
      endAt,
      location: textValue(e.location, 300),
      notes: textValue(e.notes, 2000),
      anchored: e.anchored,
      completed: e.completed,
      status: e.status,
      contactId: textValue(e.contactId, 64),
    };
  });
  const grooming = p.grooming.map((g) => {
    if (!g || typeof g.done !== 'boolean')
      throw new Error('Invalid grooming checklist.');
    return { id: id(g.id), text: textValue(g.text, 400, true), done: g.done };
  });
  return {
    timeZone: p.timeZone,
    events,
    cityNotes: textValue(p.cityNotes, 6000),
    grooming,
  };
}
export function conflicts(
  events: ItineraryEvent[],
): { a: string; b: string }[] {
  const sorted = events
    .filter((e) => !e.completed)
    .slice()
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const result: { a: string; b: string }[] = [];
  for (let i = 0; i < sorted.length; i++)
    for (
      let j = i + 1;
      j < sorted.length && sorted[j].startAt < sorted[i].endAt;
      j++
    )
      result.push({ a: sorted[i].id, b: sorted[j].id });
  return result;
}
export function mergeSuggestion(
  current: TripPlan,
  suggested: TripPlan,
): TripPlan {
  // Model output can never move, delete, or relabel member anchors.
  if (
    current.events.some((e) => e.anchored) &&
    current.timeZone !== suggested.timeZone
  )
    throw new Error('Keep the trip time zone while anchored events exist.');
  const anchors = current.events.filter((e) => e.anchored || e.completed);
  return {
    ...suggested,
    events: [
      ...anchors,
      ...suggested.events
        .filter((e) => !anchors.some((a) => a.id === e.id))
        .map((e) => ({
          ...e,
          anchored: false,
          completed: false,
          status: 'suggested' as const,
          contactId: '',
        })),
    ],
    grooming: suggested.grooming.map((g) => ({ ...g, done: false })),
  };
}
export function nextEvent(plan: TripPlan, now: string) {
  return (
    plan.events
      .filter((e) => !e.completed && e.endAt > now)
      .sort((a, b) => a.startAt.localeCompare(b.startAt))[0] ?? null
  );
}
function escapeCalendar(v: string) {
  return v
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}
export function calendarExport(
  plan: TripPlan,
  tripId: string,
  now: string,
): string {
  const compact = (s: string) => s.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Groomed Gent//Voyage//EN',
    'CALSCALE:GREGORIAN',
    ...plan.events.flatMap((e) => [
      'BEGIN:VEVENT',
      `UID:${tripId}-${e.id}@voyage.groomedgent`,
      `DTSTAMP:${compact(now)}`,
      `DTSTART:${compact(e.startAt)}`,
      `DTEND:${compact(e.endAt)}`,
      `SUMMARY:${escapeCalendar(e.title)}`,
      `LOCATION:${escapeCalendar(e.location)}`,
      `DESCRIPTION:${escapeCalendar(`${e.status === 'suggested' ? 'Unverified suggestion. ' : 'Member-confirmed. '}${e.notes}`)}`,
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
  ];
  return (
    lines
      .map((line) => {
        let result = '',
          bytes = 0;
        for (const char of line) {
          const n = new TextEncoder().encode(char).length;
          if (bytes + n > 73) {
            result += '\r\n ';
            bytes = 1;
          }
          result += char;
          bytes += n;
        }
        return result;
      })
      .join('\r\n') + '\r\n'
  );
}
