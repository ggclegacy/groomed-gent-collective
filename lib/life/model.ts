import type { GentlemanMemory, PrivateRecord } from '../gentleman/model.ts';
import { textValue } from '../voyage/model.ts';

export type Ritual = {
  cadenceDays: number;
  timeOfDay: 'morning' | 'evening' | 'anytime';
  steps: { id: string; text: string }[];
  completions: string[];
};
export const garmentCategories = [
  'top',
  'bottom',
  'layer',
  'shoes',
  'accessory',
  'outfit',
] as const;
export const dressCodes = [
  'casual',
  'smart casual',
  'business',
  'formal',
] as const;
export type Wardrobe = {
  category: (typeof garmentCategories)[number];
  color: string;
  dressCode: (typeof dressCodes)[number];
  readiness: 'ready' | 'laundry' | 'repair';
};
export type PackingItem = {
  id: string;
  text: string;
  packed: boolean;
  sourceKey?: string;
};
function date(v: unknown): v is string {
  return (
    typeof v === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    Number.isFinite(Date.parse(v)) &&
    new Date(v).toISOString().slice(0, 10) === v
  );
}
function uniqueId(v: unknown, ids: Set<string>) {
  const s = textValue(v, 64, true);
  if (!/^[\w-]+$/.test(s) || ids.has(s))
    throw new Error('Duplicate or invalid checklist ID.');
  ids.add(s);
  return s;
}
export function parseRitual(raw: unknown): Ritual {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid ritual.');
  const r = raw as Ritual;
  if (
    !Number.isSafeInteger(r.cadenceDays) ||
    r.cadenceDays < 1 ||
    r.cadenceDays > 365 ||
    !['morning', 'evening', 'anytime'].includes(r.timeOfDay) ||
    !Array.isArray(r.steps) ||
    !r.steps.length ||
    r.steps.length > 20 ||
    !Array.isArray(r.completions) ||
    r.completions.length > 90 ||
    !r.completions.every(date) ||
    new Set(r.completions).size !== r.completions.length
  )
    throw new Error(
      'Use 1–20 steps, a 1–365 day rhythm and valid completion dates.',
    );
  const ids = new Set<string>();
  return {
    cadenceDays: r.cadenceDays,
    timeOfDay: r.timeOfDay,
    steps: r.steps.map((s) => ({
      id: uniqueId(s?.id, ids),
      text: textValue(s?.text, 240, true),
    })),
    completions: [...r.completions].sort(),
  };
}
export function parseWardrobe(raw: unknown): Wardrobe {
  if (!raw || typeof raw !== 'object')
    throw new Error('Invalid wardrobe item.');
  const w = raw as Wardrobe;
  if (
    !garmentCategories.includes(w.category) ||
    !dressCodes.includes(w.dressCode) ||
    !['ready', 'laundry', 'repair'].includes(w.readiness)
  )
    throw new Error('Check wardrobe category, dress code and readiness.');
  return {
    category: w.category,
    color: textValue(w.color, 80),
    dressCode: w.dressCode,
    readiness: w.readiness,
  };
}
export function parsePacking(raw: unknown): PackingItem[] {
  if (!Array.isArray(raw) || raw.length > 100)
    throw new Error('A trip can hold up to 100 packing items.');
  const ids = new Set<string>(),
    sources = new Set<string>();
  return raw.map((p) => {
    if (!p || typeof p.packed !== 'boolean')
      throw new Error('Invalid packing item.');
    const sourceKey =
      p.sourceKey === undefined ? undefined : textValue(p.sourceKey, 140, true);
    if (sourceKey && sources.has(sourceKey))
      throw new Error('Duplicate packing source.');
    if (sourceKey) sources.add(sourceKey);
    return {
      id: uniqueId(p.id, ids),
      text: textValue(p.text, 420, true),
      packed: p.packed,
      ...(sourceKey ? { sourceKey } : {}),
    };
  });
}
export function ritualDue(record: PrivateRecord): string {
  if (!record.ritual || record.completed) return '';
  const last = [...record.ritual.completions].sort().at(-1);
  if (!last) return record.date;
  const d = new Date(`${last}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + record.ritual.cadenceDays);
  return [d.toISOString().slice(0, 10), record.date].sort().at(-1)!;
}
export function completeRitual(
  record: PrivateRecord,
  day: string,
  today: string,
): PrivateRecord {
  if (
    !record.ritual ||
    record.completed ||
    !date(day) ||
    !date(today) ||
    day > today ||
    (record.date && day < record.date)
  )
    throw new Error(
      'Choose a completion date between the ritual start and today.',
    );
  return {
    ...record,
    ritual: {
      ...record.ritual,
      completions: [...new Set([...record.ritual.completions, day])]
        .sort()
        .slice(-90),
    },
  };
}
/** An explicit copy: later edits or removal of Life records do not rewrite a trip list. */
export function packingCandidates(
  memory: GentlemanMemory,
  selected: string[],
): Omit<PackingItem, 'id' | 'packed'>[] {
  const chosen = new Set(selected);
  return memory.records
    .filter((r) => chosen.has(r.id) && !r.completed)
    .flatMap((r) => {
      if (r.kind === 'wardrobe' && r.wardrobe?.readiness === 'ready')
        return [
          {
            text: `${r.title}${r.wardrobe.color ? ` · ${r.wardrobe.color}` : ''}`,
            sourceKey: `wardrobe:${r.id}`,
          },
        ];
      if (r.kind === 'ritual' && r.ritual)
        return r.ritual.steps.map((s) => ({
          text: `${r.title} · ${s.text}`,
          sourceKey: `ritual:${r.id}:${s.id}`,
        }));
      return [];
    });
}
export function addPacking(
  trip: PrivateRecord,
  candidates: Omit<PackingItem, 'id' | 'packed'>[],
): PrivateRecord {
  if (trip.kind !== 'trip' || trip.completed)
    throw new Error('Choose an open trip.');
  const existing = trip.packing ?? [];
  const sources = new Set(
    existing.flatMap((p) => (p.sourceKey ? [p.sourceKey] : [])),
  );
  const additions = candidates
    .filter((p) => {
      if (p.sourceKey && sources.has(p.sourceKey)) return false;
      if (p.sourceKey) sources.add(p.sourceKey);
      return true;
    })
    .map((p) => ({ ...p, id: crypto.randomUUID(), packed: false }));
  return { ...trip, packing: parsePacking([...existing, ...additions]) };
}
