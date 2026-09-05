export const contexts = [
  'At the chair',
  'After training',
  'On the road',
] as const;
export const formats = ['Short caption', 'Conversation starter'] as const;
export const reviewItems = {
  personal: 'This reflects my own experience and voice.',
  claims: 'I checked product details against approved brand sources.',
  relationship: 'My relationship with Groomed Gent is clear where relevant.',
} as const;
export type ReviewKey = keyof typeof reviewItems;
export interface StudioDraft {
  id: string;
  title: string;
  context: (typeof contexts)[number];
  format: (typeof formats)[number];
  body: string;
  review: Record<ReviewKey, boolean>;
  updatedAt: string;
}
export interface DraftLibrary {
  version: 1;
  drafts: StudioDraft[];
}
export const libraryKey = 'ggc.preview.studio-library.v1';
export const workingKey = 'ggc.preview.studio-working.v1';
export const emptyReview = (): StudioDraft['review'] => ({
  personal: false,
  claims: false,
  relationship: false,
});
export function blankDraft(id: string, now: string): StudioDraft {
  return {
    id,
    title: '',
    context: 'At the chair',
    format: 'Short caption',
    body: '',
    review: emptyReview(),
    updatedAt: now,
  };
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function validDraft(value: unknown): value is StudioDraft {
  if (!record(value) || !record(value.review)) return false;
  return (
    typeof value.id === 'string' &&
    /^[a-zA-Z0-9-]{1,80}$/.test(value.id) &&
    typeof value.title === 'string' &&
    value.title.length <= 100 &&
    contexts.includes(value.context as StudioDraft['context']) &&
    formats.includes(value.format as StudioDraft['format']) &&
    typeof value.body === 'string' &&
    value.body.length <= 8000 &&
    Object.keys(reviewItems).every(
      (key) =>
        typeof (value.review as Record<string, unknown>)[key] === 'boolean',
    ) &&
    typeof value.updatedAt === 'string' &&
    Number.isFinite(Date.parse(value.updatedAt))
  );
}
export function parseWorking(raw: string | null): StudioDraft | null {
  try {
    const value: unknown = JSON.parse(raw ?? 'null');
    return validDraft(value) ? value : null;
  } catch {
    return null;
  }
}
/** A malformed library must never silently become an empty, writable library. */
export function readLibrary(raw: string | null): DraftLibrary {
  if (raw === null) return { version: 1, drafts: [] };
  const value: unknown = JSON.parse(raw);
  if (
    !record(value) ||
    value.version !== 1 ||
    !Array.isArray(value.drafts) ||
    value.drafts.length > 100 ||
    !value.drafts.every(validDraft) ||
    new Set(value.drafts.map((d) => d.id)).size !== value.drafts.length
  ) {
    throw new Error(
      'Saved library could not be read. Existing data has been preserved.',
    );
  }
  return { version: 1, drafts: value.drafts };
}
export function saveDraft(
  library: DraftLibrary,
  draft: StudioDraft,
): DraftLibrary {
  if (!validDraft(draft) || !draft.title.trim() || !draft.body.trim())
    throw new Error('Add a title and draft text before saving.');
  if (
    library.drafts.length >= 100 &&
    !library.drafts.some((d) => d.id === draft.id)
  )
    throw new Error(
      'This device library holds 100 drafts. Export and remove a draft to make room.',
    );
  return {
    version: 1,
    drafts: [
      { ...draft, title: draft.title.trim() },
      ...library.drafts.filter((d) => d.id !== draft.id),
    ],
  };
}
export function updateDraft(
  draft: StudioDraft,
  patch: Partial<
    Pick<StudioDraft, 'title' | 'body' | 'context' | 'format' | 'review'>
  >,
  now: string,
): StudioDraft {
  const changedCopy =
    (patch.body !== undefined && patch.body !== draft.body) ||
    (patch.context !== undefined && patch.context !== draft.context) ||
    (patch.format !== undefined && patch.format !== draft.format);
  return {
    ...draft,
    ...patch,
    review: changedCopy ? emptyReview() : (patch.review ?? draft.review),
    updatedAt: now,
  };
}
export function reviewStatus(draft: StudioDraft): string {
  if (!draft.body.trim()) return 'Not started';
  if (/\[[^\]]+\]/.test(draft.body)) return 'Placeholders remain';
  return Object.values(draft.review).every(Boolean)
    ? 'Self-review complete'
    : 'Needs your review';
}
export function exportDraft(draft: StudioDraft): string {
  return `THE GROOMED GENT COLLECTIVE\nCREATOR STUDIO / EDITORIAL DRAFT\n\n${draft.title || 'Untitled draft'}\n${draft.context} · ${draft.format}\n${reviewStatus(draft)} · Not brand-approved\n\n${draft.body}\n\nPersonal review\n${Object.entries(
    reviewItems,
  )
    .map(
      ([key, label]) =>
        `${draft.review[key as ReviewKey] ? '[x]' : '[ ]'} ${label}`,
    )
    .join(
      '\n',
    )}\n\nNothing has been published. Verify details and active referral terms before sharing.\n`;
}
export function cassiusBrief(draft: StudioDraft): string {
  // Leave room for the entire 8,000-character draft; never silently truncate a handoff.
  return `Help me refine this ${draft.format.toLowerCase()} for ${draft.context.toLowerCase()}. Keep my voice, avoid pressure or posting quotas, and flag anything requiring approved product sources. Do not invent benefits, offers or personal results.\n\n${draft.title}\n\n${draft.body}`;
}
