import {
  parseRitual,
  parseWardrobe,
  parsePacking,
  ritualDue,
  type Ritual,
  type Wardrobe,
  type PackingItem,
} from '../life/model.ts';
import { parsePlan, type TripPlan } from '../voyage/model.ts';
/** Versioned private memory. Membership/financial authority remains in existing services. */
export const recordKinds = [
  'person',
  'trip',
  'ritual',
  'wardrobe',
  'place',
  'task',
  'decision',
  'reference',
  'note',
] as const;
export type RecordKind = (typeof recordKinds)[number];
export const profileFields = [
  'name',
  'taste',
  'style',
  'business',
  'travel',
  'grooming',
  'goals',
  'assistant',
] as const;
export type GentlemanProfile = Record<(typeof profileFields)[number], string>;
export interface PrivateRecord {
  id: string;
  kind: RecordKind;
  title: string;
  detail: string;
  date: string;
  endDate: string;
  mode: 'business' | 'hybrid' | 'leisure';
  completed: boolean;
  shareWithCassius: boolean;
  createdAt: string;
  tripPlan?: TripPlan;
  ritual?: Ritual;
  wardrobe?: Wardrobe;
  packing?: PackingItem[];
  relationship?: {
    organization: string;
    role: string;
    lastContact: string;
    intent: string;
    cadenceDays: number;
  };
  relatedPersonId?: string;
  origin?: 'circle-followup';
}
export interface GentlemanMemory {
  version: 3;
  profile: GentlemanProfile;
  shareProfile: boolean;
  records: PrivateRecord[];
}
export function emptyMemory(): GentlemanMemory {
  return {
    version: 3,
    profile: Object.fromEntries(
      profileFields.map((k) => [k, '']),
    ) as GentlemanProfile,
    shareProfile: false,
    records: [],
  };
}
function string(value: unknown, max: number): string {
  if (typeof value !== 'string' || value.length > max)
    throw new Error('Invalid text length.');
  return value.trim();
}
export function validDate(value: string): boolean {
  return (
    value === '' ||
    (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value)
  );
}
export function parseMemory(raw: unknown): GentlemanMemory {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid memory.');
  const m = raw as GentlemanMemory;
  if (
    ![1, 2, 3].includes(m.version) ||
    !m.profile ||
    typeof m.shareProfile !== 'boolean' ||
    !Array.isArray(m.records) ||
    m.records.length > 300
  )
    throw new Error('Invalid memory.');
  const profile = Object.fromEntries(
    profileFields.map((k) => [k, string(m.profile[k], 1000)]),
  ) as GentlemanProfile;
  const ids = new Set<string>();
  const records = m.records.map((r) => {
    if (
      !r ||
      !recordKinds.includes(r.kind) ||
      typeof r.id !== 'string' ||
      !/^[\w-]{1,64}$/.test(r.id) ||
      ids.has(r.id) ||
      typeof r.completed !== 'boolean' ||
      typeof r.shareWithCassius !== 'boolean' ||
      !['business', 'hybrid', 'leisure'].includes(r.mode)
    )
      throw new Error('Invalid record.');
    ids.add(r.id);
    const title = string(r.title, 160),
      detail = string(r.detail, 16000);
    const date = string(r.date, 10),
      endDate = string(r.endDate, 10),
      createdAt = string(r.createdAt, 30);
    if (
      !title ||
      !validDate(date) ||
      !validDate(endDate) ||
      (endDate && (!date || endDate < date)) ||
      !Number.isFinite(Date.parse(createdAt))
    )
      throw new Error('Invalid record dates or title.');
    let relationship: PrivateRecord['relationship'];
    if (r.relationship !== undefined) {
      const p = r.relationship;
      if (
        r.kind !== 'person' ||
        !p ||
        !Number.isSafeInteger(p.cadenceDays) ||
        p.cadenceDays < 0 ||
        p.cadenceDays > 365 ||
        !validDate(p.lastContact)
      )
        throw new Error('Invalid relationship.');
      relationship = {
        organization: string(p.organization, 160),
        role: string(p.role, 160),
        lastContact: string(p.lastContact, 10),
        intent: string(p.intent, 1000),
        cadenceDays: p.cadenceDays,
      };
    }
    const tripPlan =
      r.tripPlan === undefined
        ? undefined
        : r.kind === 'trip'
          ? parsePlan(r.tripPlan, date, endDate || date)
          : (() => {
              throw new Error('Only trips have itineraries.');
            })();
    const relatedPersonId =
      r.relatedPersonId === undefined
        ? undefined
        : string(r.relatedPersonId, 64);
    if (
      r.origin !== undefined &&
      (r.origin !== 'circle-followup' || r.kind !== 'task' || !relatedPersonId)
    )
      throw new Error('Invalid relationship task origin.');
    if (
      (r.ritual !== undefined && r.kind !== 'ritual') ||
      (r.wardrobe !== undefined && r.kind !== 'wardrobe') ||
      (r.packing !== undefined && r.kind !== 'trip')
    )
      throw new Error('Life details belong to the matching record type.');
    const ritual = r.ritual === undefined ? undefined : parseRitual(r.ritual);
    if (ritual && (!date || ritual.completions.some((d) => d < date)))
      throw new Error('A ritual needs a start date before its completions.');
    return {
      ...(ritual ? { ritual } : {}),
      ...(r.wardrobe === undefined
        ? {}
        : { wardrobe: parseWardrobe(r.wardrobe) }),
      ...(r.packing === undefined ? {} : { packing: parsePacking(r.packing) }),
      ...(r.origin ? { origin: r.origin } : {}),
      ...(tripPlan ? { tripPlan } : {}),
      ...(relationship ? { relationship } : {}),
      ...(relatedPersonId ? { relatedPersonId } : {}),
      id: r.id,
      kind: r.kind,
      title,
      detail,
      date,
      endDate,
      mode: r.mode,
      completed: r.completed,
      shareWithCassius: r.shareWithCassius,
      createdAt,
    };
  });
  const people = new Set(
    records.filter((r) => r.kind === 'person').map((r) => r.id),
  );
  for (const r of records)
    if (
      (r.relatedPersonId && !people.has(r.relatedPersonId)) ||
      r.tripPlan?.events.some((e) => e.contactId && !people.has(e.contactId))
    )
      throw new Error('Related person is missing.');
  return { version: 3, profile, shareProfile: m.shareProfile, records };
}
/** Explicit consent, bounded context, no inference of authorization from stored prose. */
export function cassiusContext(memory: GentlemanMemory): string {
  const permitted = memory.records.filter((r) => r.shareWithCassius);
  const context = {
    profile: memory.shareProfile
      ? Object.fromEntries(
          profileFields.map((k) => [k, memory.profile[k].slice(0, 250)]),
        )
      : undefined,
    records: permitted
      .slice(-12)
      .map(
        ({
          kind,
          title,
          detail,
          date,
          endDate,
          mode,
          completed,
          tripPlan,
          relationship,
          ritual,
          wardrobe,
          packing,
        }) => ({
          kind,
          title,
          detail: detail.slice(0, 350),
          date,
          endDate,
          mode,
          completed,
          ritual: ritual
            ? {
                cadenceDays: ritual.cadenceDays,
                timeOfDay: ritual.timeOfDay,
                steps: ritual.steps.slice(0, 6).map((s) => s.text),
                lastCompleted: ritual.completions.at(-1),
              }
            : undefined,
          wardrobe,
          packing: packing
            ?.slice(0, 8)
            .map((p) => ({ text: p.text, packed: p.packed })),
          relationship: relationship
            ? { ...relationship, intent: relationship.intent.slice(0, 180) }
            : undefined,
          itinerary: tripPlan
            ? {
                timeZone: tripPlan.timeZone,
                events: tripPlan.events
                  .filter((e) => !e.completed)
                  .slice()
                  .sort((a, b) => a.startAt.localeCompare(b.startAt))
                  .slice(0, 3)
                  .map((e) => ({
                    title: e.title,
                    startAt: e.startAt,
                    endAt: e.endAt,
                    status: e.status,
                  })),
              }
            : undefined,
        }),
      ),
    omittedRecords: Math.max(0, permitted.length - 12),
    availability: {
      calendar: 'not connected',
      bookings: 'not connected',
      collectiveMetrics: 'not supplied',
    },
  };
  while (JSON.stringify(context).length > 7000 && context.records.length) {
    context.records.shift();
    context.omittedRecords++;
  }
  if (context.profile && JSON.stringify(context).length > 7000)
    for (const key of Object.keys(context.profile))
      context.profile[key] = context.profile[key].slice(0, 80);
  return JSON.stringify(context);
}
export function priorities(
  memory: GentlemanMemory,
  today: string,
): PrivateRecord[] {
  return memory.records
    .map((r) => (r.ritual ? { ...r, date: ritualDue(r) } : r))
    .filter(
      (r) =>
        !r.completed &&
        r.date &&
        r.date <= today &&
        ['person', 'task', 'ritual', 'trip'].includes(r.kind) &&
        !(r.kind === 'trip' && r.endDate && r.endDate < today),
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);
}
