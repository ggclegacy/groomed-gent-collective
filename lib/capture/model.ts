import {
  parseMemory,
  validDate,
  type GentlemanMemory,
  type PrivateRecord,
} from '../gentleman/model.ts';
export const captureDestinations = [
  'task',
  'decision',
  'person',
  'reference',
] as const;
export type CaptureDestination = (typeof captureDestinations)[number];
export type CaptureReview = {
  kind: CaptureDestination;
  title: string;
  detail: string;
  date: string;
  relatedPersonId: string;
};
export function quickCapture(
  memory: GentlemanMemory,
  text: string,
): GentlemanMemory {
  if (!text.trim() || text.length > 16000)
    throw new Error('Capture 1–16,000 characters.');
  const note: PrivateRecord = {
    id: crypto.randomUUID(),
    kind: 'note',
    title: text.trim().split('\n')[0].slice(0, 100),
    detail: text.trim(),
    date: '',
    endDate: '',
    mode: 'leisure',
    completed: false,
    shareWithCassius: false,
    createdAt: new Date().toISOString(),
  };
  return parseMemory({ ...memory, records: [...memory.records, note] });
}
/** Review is entirely local; it does not infer people, dates or permission to contact anyone. */
export function promoteCapture(
  memory: GentlemanMemory,
  sourceId: string,
  sourceBasis: string,
  review: CaptureReview,
): GentlemanMemory {
  const source = memory.records.find(
    (r) => r.id === sourceId && r.kind === 'note',
  );
  if (!source || source.completed)
    throw new Error('This capture has already been processed or removed.');
  if (JSON.stringify(source) !== sourceBasis)
    throw new Error(
      'The source changed. Close this review and reopen it before continuing.',
    );
  if (
    !captureDestinations.includes(review.kind) ||
    !validDate(review.date) ||
    (review.kind === 'person' && review.relatedPersonId)
  )
    throw new Error('Check the destination and date.');
  const created: PrivateRecord = {
    id: crypto.randomUUID(),
    kind: review.kind,
    title: review.title,
    detail: review.detail,
    date: review.date,
    endDate: '',
    mode: 'leisure',
    completed: false,
    shareWithCassius: false,
    createdAt: new Date().toISOString(),
    ...(review.relatedPersonId
      ? { relatedPersonId: review.relatedPersonId }
      : {}),
  };
  return parseMemory({
    ...memory,
    records: [
      ...memory.records.map((r) =>
        r.id === source.id ? { ...r, completed: true } : r,
      ),
      created,
    ],
  });
}
export function deskBuckets(memory: GentlemanMemory, today: string) {
  const open = memory.records.filter(
    (r) => ['task', 'decision'].includes(r.kind) && !r.completed,
  );
  return {
    overdue: open.filter((r) => r.date && r.date < today),
    today: open.filter((r) => r.date && r.date === today),
    upcoming: open
      .filter((r) => r.date > today)
      .sort((a, b) => a.date.localeCompare(b.date)),
    undated: open.filter((r) => !r.date),
  };
}
