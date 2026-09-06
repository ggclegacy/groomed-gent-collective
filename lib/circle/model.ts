import {
  validDate,
  type GentlemanMemory,
  type PrivateRecord,
} from '../gentleman/model.ts';
export function nextFollowUp(date: string, cadence: number): string {
  if (
    !date ||
    !validDate(date) ||
    !Number.isSafeInteger(cadence) ||
    cadence < 0 ||
    cadence > 365
  )
    throw new Error('Choose a valid contact date and follow-up rhythm.');
  if (!cadence) return '';
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + cadence);
  return d.toISOString().slice(0, 10);
}
export function meetingBrief(person: PrivateRecord, memory: GentlemanMemory) {
  return {
    name: person.title,
    context: person.detail,
    organization: person.relationship?.organization ?? '',
    role: person.relationship?.role ?? '',
    intent: person.relationship?.intent ?? '',
    lastContact: person.relationship?.lastContact ?? '',
    followUp: person.date,
    commitments: memory.records.filter(
      (r) =>
        r.kind === 'task' && r.relatedPersonId === person.id && !r.completed,
    ),
    meetings: memory.records
      .filter((r) => r.kind === 'trip')
      .flatMap((t) =>
        (t.tripPlan?.events ?? [])
          .filter((e) => e.contactId === person.id && !e.completed)
          .map((e) => ({
            trip: t.title,
            title: e.title,
            startAt: e.startAt,
            timeZone: t.tripPlan!.timeZone,
          })),
      ),
  };
}
export function followUpTask(
  person: PrivateRecord,
  now: string,
): PrivateRecord {
  if (!person.date || !validDate(person.date))
    throw new Error('Set a follow-up date first.');
  return {
    id: crypto.randomUUID(),
    origin: 'circle-followup',
    kind: 'task',
    title: `Follow up with ${person.title}`.slice(0, 160),
    detail: person.relationship?.intent || 'Prepare a thoughtful follow-up.',
    date: person.date,
    endDate: '',
    mode: 'business',
    completed: false,
    shareWithCassius: false,
    createdAt: now,
    relatedPersonId: person.id,
  };
}
