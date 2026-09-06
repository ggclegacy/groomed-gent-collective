'use client';
import { resolveProductHandoff } from '@/lib/product-mastery/handoff';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { CreativeStudio } from '@/components/creative-studio';
import { LoadingSurface } from '@/components/materials';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { accountRequest } from '@/lib/account-client';
import type { AccountLibrary } from '@/lib/account';
import { Choice } from '@/components/workspaces';
import { createDraft, storageKeys } from '@/lib/collective';
import {
  blankDraft,
  cassiusBrief,
  contexts,
  emptyReview,
  exportDraft,
  formats,
  libraryKey,
  parseWorking,
  readLibrary,
  reviewItems,
  reviewStatus,
  saveDraft,
  updateDraft,
  workingKey,
  type DraftLibrary,
  type StudioDraft,
  type ReviewKey,
} from '@/lib/studio';

function download(name: string, text: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function fresh() {
  return blankDraft(crypto.randomUUID(), new Date().toISOString());
}
type StudioAccount = AccountLibrary & { userId: string };
function sameDraft(
  a: StudioDraft | undefined | null,
  b: StudioDraft | undefined | null,
) {
  if (!a || !b) return a === b;
  return (
    a.id === b.id &&
    a.title === b.title &&
    a.body === b.body &&
    a.context === b.context &&
    a.format === b.format &&
    a.updatedAt === b.updatedAt &&
    a.review.personal === b.review.personal &&
    a.review.claims === b.review.claims &&
    a.review.relationship === b.review.relationship
  );
}
const subscribeHydration = () => () => {};
export function StudioWorkspace({
  active,
  account,
}: {
  active: boolean;
  account?: StudioAccount;
}) {
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  return hydrated ? (
    <>
      <CreativeStudio
        key={account?.userId ?? 'device'}
        scope={account?.userId ?? 'device'}
      />
      <details
        className="cs-legacy"
        open={Boolean(
          new URLSearchParams(window.location.search).get('productBrief'),
        )}
      >
        <summary>Text drafts &amp; publishing review</summary>
        <StudioEditor
          key={account?.userId ?? 'device'}
          active={active}
          account={account}
        />
      </details>
    </>
  ) : (
    <LoadingSurface label="Opening your Studio…" />
  );
}
function loadDevice() {
  let draft = fresh();
  let message = '';
  let blockedWorking = false;
  let libraryError = false;
  let raw: string | null = null;
  let library: DraftLibrary = { version: 1, drafts: [] };
  try {
    raw = localStorage.getItem(libraryKey);
    library = readLibrary(raw);
    const workingRaw = localStorage.getItem(workingKey);
    const working = parseWorking(workingRaw);
    if (workingRaw !== null && !working) {
      blockedWorking = true;
      message =
        'The working copy could not be read. Download a backup before repairing browser storage. Existing data is preserved.';
    } else if (working) draft = working;
    else {
      const legacy = localStorage.getItem(storageKeys.draft);
      if (legacy?.trim()) {
        draft = {
          ...draft,
          title: 'Recovered Studio draft',
          body: legacy.slice(0, 8000),
        };
        message =
          'Your previous draft is in the editor. Save it to the library when ready. The original remains preserved.';
      }
    }
  } catch {
    libraryError = true;
    blockedWorking = true;
    message =
      'Device library unavailable or damaged. Existing data is preserved. You can write and export a draft.';
  }
  return { draft, message, blockedWorking, libraryError, raw, library };
}
function StudioEditor({
  active,
  account,
}: {
  active: boolean;
  account?: StudioAccount;
}) {
  const [initial] = useState(() =>
    account
      ? {
          draft: fresh(),
          library: account.library,
          message: '',
          blockedWorking: false,
          libraryError: false,
          raw: null,
        }
      : loadDevice(),
  );
  const [productHandoff] = useState(() =>
    resolveProductHandoff(
      window.location.search,
      crypto.randomUUID(),
      new Date().toISOString(),
    ),
  );
  const revision = useRef(account?.revision ?? 0);
  const saving = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<StudioDraft>(initial.draft);
  const [library, setLibrary] = useState<DraftLibrary>(initial.library);
  const [message, setMessage] = useState(initial.message);
  const [workingSaved, setWorkingSaved] = useState(true);
  const [libraryError, setLibraryError] = useState(initial.libraryError);
  const [query, setQuery] = useState('');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [pending, setPending] = useState<StudioDraft | null>(null);
  const [removed, setRemoved] = useState<StudioDraft | null>(null);
  const snapshot = useRef<string | null>(initial.raw);
  const current = useRef<StudioDraft | null>(initial.draft);
  const blockedWorking = useRef(initial.blockedWorking);
  useEffect(() => {
    if (workingSaved) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [workingSaved]);
  const put = useCallback(
    (next: StudioDraft) => {
      current.current = next;
      setDraft(next);
      if (account) {
        setWorkingSaved(
          sameDraft(
            next,
            library.drafts.find((item) => item.id === next.id),
          ) ||
            (!next.title.trim() && !next.body.trim()),
        );
        setMessage(
          sameDraft(
            next,
            library.drafts.find((item) => item.id === next.id),
          )
            ? 'Opened your saved account draft.'
            : 'Working text is in memory. Save it to your account before leaving.',
        );
        return;
      }
      try {
        if (blockedWorking.current) throw new Error();
        localStorage.setItem(workingKey, JSON.stringify(next));
        setWorkingSaved(true);
        setMessage(
          'Working copy kept on this device. Save to add it to your library.',
        );
      } catch {
        setWorkingSaved(false);
        setMessage(
          'Working copy could not be stored. Export or copy your text before leaving this page.',
        );
      }
    },
    [account, library],
  );
  function change(patch: Parameters<typeof updateDraft>[1]) {
    if (current.current)
      put(updateDraft(current.current, patch, new Date().toISOString()));
  }
  function replace(next: StudioDraft) {
    const item = current.current;
    const saved = library.drafts.find((d) => d.id === item?.id);
    if (
      item &&
      (item.title.trim() || item.body.trim()) &&
      !sameDraft(item, saved)
    )
      setPending(next);
    else put(next);
  }
  async function commit(next: DraftLibrary) {
    if (account) {
      if (saving.current) throw new Error('A save is already in progress.');
      saving.current = true;
      setIsSaving(true);
      try {
        const result = await accountRequest<AccountLibrary>('/library', 'PUT', {
          revision: revision.current,
          library: next,
        });
        revision.current = result.revision;
        setLibrary(result.library);
        setLibraryError(false);
      } finally {
        saving.current = false;
        setIsSaving(false);
      }
      return;
    }
    // Optimistic conflict detection prevents a stale tab from replacing another tab's library.
    if (localStorage.getItem(libraryKey) !== snapshot.current)
      throw new Error(
        'Library changed in another tab. Reload the library, then save again. Your editor is preserved.',
      );
    const encoded = JSON.stringify(next);
    localStorage.setItem(libraryKey, encoded);
    snapshot.current = encoded;
    setLibrary(next);
    setLibraryError(false);
  }
  async function reloadLibrary() {
    if (account) {
      if (saving.current) return;
      try {
        const result = await accountRequest<AccountLibrary>('/library');
        revision.current = result.revision;
        setLibrary(result.library);
        setLibraryError(false);
        setMessage('Account library reloaded. Your working text is unchanged.');
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : 'Could not load account drafts.',
        );
      }
      return;
    }
    try {
      const raw = localStorage.getItem(libraryKey);
      const loaded = readLibrary(raw);
      snapshot.current = raw;
      setLibrary(loaded);
      setLibraryError(false);
      setMessage('Library reloaded. Your working copy is unchanged.');
    } catch {
      setLibraryError(true);
      setMessage(
        'Library could not be read. Download a backup to preserve it.',
      );
    }
  }
  useEffect(() => {
    if (!active) return;
    const registry = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: object,
            options: { signal: AbortSignal },
          ) => unknown;
        };
      }
    ).modelContext;
    if (!registry) return;
    const life = new AbortController();
    try {
      Promise.resolve(
        registry.registerTool(
          {
            name: 'prepare_collective_caption',
            description:
              'Prepare an editorial template in an empty Creator Studio editor. Does not call AI, save to the library or publish.',
            inputSchema: {
              type: 'object',
              properties: {
                context: { type: 'string', enum: contexts },
                format: { type: 'string', enum: formats },
              },
              required: ['context', 'format'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            execute(input: unknown) {
              if (!input || typeof input !== 'object')
                throw new Error('Context and format are required.');
              const value = input as Record<string, unknown>;
              if (
                Object.keys(value).some(
                  (key) => !['context', 'format'].includes(key),
                ) ||
                !contexts.includes(value.context as StudioDraft['context']) ||
                !formats.includes(value.format as StudioDraft['format'])
              )
                throw new Error('Choose a supported context and format.');
              if (
                !current.current ||
                current.current.body.trim() ||
                current.current.title.trim()
              )
                throw new Error(
                  'Open a new empty draft first to preserve your existing work.',
                );
              const next = {
                ...current.current,
                context: value.context as StudioDraft['context'],
                format: value.format as StudioDraft['format'],
                body: createDraft(String(value.context), String(value.format)),
                review: emptyReview(),
              };
              put(next);
              return { state: 'prepared', draft: next.body, published: false };
            },
          },
          { signal: life.signal },
        ),
      ).catch(() => {});
    } catch {
      /* The browser integration is optional. */
    }
    return () => life.abort();
  }, [active, put]);
  if (!draft) return <LoadingSurface label="Opening your Studio…" />;
  const saved = library.drafts.find((d) => d.id === draft.id);
  const dirty = !sameDraft(saved, draft);
  const visible = library.drafts.filter((d) =>
    `${d.title} ${d.context} ${d.body}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="creator-workspace">
      <p className="lede">Make something that sounds like you.</p>
      {productHandoff && (
        <div className="studio-note">
          <div>
            <strong>A product brief is ready.</strong>
            <p>
              Open the current Product Brain brief in your editor. Your existing
              draft is protected by the usual unsaved-work check.
            </p>
            <button
              className="outline-button"
              onClick={() => replace(productHandoff)}
            >
              Open product brief <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
      <div className="studio-note">
        <Sparkles size={19} />
        <p>
          Editorial templates, ready for your perspective. No posting quota. No
          AI generation or publishing.{' '}
          {account
            ? 'Saved drafts are kept in your account. Save working text before leaving.'
            : 'Drafts stay in this browser; export anything you want to keep.'}
        </p>
      </div>
      <div className="studio-desk">
        <aside className="draft-library" aria-label="Your draft library">
          <div className="studio-section-heading">
            <span className="eyebrow gold">
              YOUR DRAFTS / {library.drafts.length}
            </span>
            <button className="outline-button" onClick={() => replace(fresh())}>
              <Plus size={16} /> New
            </button>
          </div>
          <button
            className="studio-text-button library-toggle"
            aria-expanded={libraryOpen}
            aria-controls="studio-library-contents"
            onClick={() => setLibraryOpen((open) => !open)}
          >
            {libraryOpen ? 'Hide saved drafts' : 'Browse saved drafts'}
          </button>
          <div
            id="studio-library-contents"
            className={`library-contents${libraryOpen ? ' is-open' : ''}`}
          >
            <label className="field">
              Find a draft
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Title, moment or words"
              />
            </label>
            <div className="draft-list">
              {visible.map((item) => (
                <button
                  key={item.id}
                  className="draft-entry"
                  aria-pressed={item.id === draft.id}
                  onClick={() => replace(item)}
                >
                  <span>{item.title}</span>
                  <small>
                    {item.context} / {reviewStatus(item)}
                  </small>
                </button>
              ))}
              {!visible.length && (
                <p className="library-empty">
                  {libraryError
                    ? 'Your library cannot be read.'
                    : query
                      ? 'No drafts match this search.'
                      : 'Your library starts with the first piece you save.'}
                </p>
              )}
            </div>
            <button className="studio-text-button" onClick={reloadLibrary}>
              Reload library
            </button>
            <button
              className="studio-text-button"
              onClick={() => {
                try {
                  download(
                    'collective-studio-backup.json',
                    JSON.stringify(
                      {
                        library: localStorage.getItem(libraryKey),
                        workingCopy: localStorage.getItem(workingKey),
                        previousDraft: localStorage.getItem(storageKeys.draft),
                      },
                      null,
                      2,
                    ),
                    'application/json',
                  );
                  setMessage(
                    'Raw device backup downloaded. Keep it somewhere private.',
                  );
                } catch {
                  setMessage(
                    'Browser storage cannot be read. Export the visible draft instead.',
                  );
                }
              }}
            >
              <Download size={14} /> Download device backup
            </button>
            {account && (
              <button
                className="studio-text-button"
                disabled={isSaving}
                onClick={async () => {
                  try {
                    const local = readLibrary(localStorage.getItem(libraryKey));
                    const existing = new Set(library.drafts.map((d) => d.id));
                    const incoming = local.drafts.filter(
                      (d) => !existing.has(d.id),
                    );
                    if (!incoming.length) {
                      setMessage(
                        'No new device drafts to import. Existing account drafts were preserved.',
                      );
                      return;
                    }
                    await commit({
                      version: 1,
                      drafts: [...library.drafts, ...incoming],
                    });
                    setMessage(
                      `${incoming.length} device drafts copied to your account. Device originals are unchanged.`,
                    );
                  } catch (error) {
                    setMessage(
                      error instanceof Error
                        ? error.message
                        : 'Import failed; device originals are unchanged.',
                    );
                  }
                }}
              >
                Import device drafts into account
              </button>
            )}
            {removed && (
              <button
                className="studio-text-button"
                onClick={async () => {
                  try {
                    await commit(
                      saveDraft(
                        account
                          ? library
                          : readLibrary(localStorage.getItem(libraryKey)),
                        removed,
                      ),
                    );
                    setRemoved(null);
                    setMessage('Draft restored to the library.');
                  } catch (error) {
                    setMessage(
                      error instanceof Error
                        ? error.message
                        : 'Could not restore draft.',
                    );
                  }
                }}
              >
                Undo removal of “{removed.title}”
              </button>
            )}
          </div>
        </aside>
        <section className="studio-editor" aria-label="Draft editor">
          <div className="studio-section-heading">
            <span className="eyebrow gold">THE WORKING COPY</span>
            <span className="draft-status">
              {saved && !dirty
                ? account
                  ? 'Saved to account'
                  : 'Saved to library'
                : workingSaved
                  ? account
                    ? 'Working copy · not saved'
                    : 'Working copy · device only'
                  : 'Unsaved · export to keep'}
            </span>
          </div>
          <label className="field">
            Title
            <input
              maxLength={100}
              value={draft.title}
              onChange={(e) => change({ title: e.target.value })}
              placeholder="Give this piece a name"
            />
          </label>
          <div className="studio-choices">
            <Choice
              label="The moment"
              value={draft.context}
              options={[...contexts]}
              onChange={(context) =>
                change({ context: context as StudioDraft['context'] })
              }
            />
            <Choice
              label="Format"
              value={draft.format}
              options={[...formats]}
              onChange={(format) =>
                change({ format: format as StudioDraft['format'] })
              }
            />
          </div>
          <button
            className="studio-text-button"
            onClick={() => {
              const next = updateDraft(
                draft,
                { body: createDraft(draft.context, draft.format) },
                new Date().toISOString(),
              );
              if (draft.body.trim()) setPending(next);
              else put(next);
            }}
          >
            Start from an editorial template <ArrowRight size={15} />
          </button>
          <label className="field">
            Your words
            <textarea
              rows={10}
              maxLength={8000}
              value={draft.body}
              onChange={(e) => change({ body: e.target.value })}
              placeholder="Write from a moment in your life. What made the conversation worth having?"
            />
          </label>
          <div className="review-heading">
            <h2>Before it leaves your hands</h2>
            <span>{reviewStatus(draft)}</span>
          </div>
          <p className="studio-help">
            Personal checks, not brand approval. Editing the words or moment
            resets these checks.
          </p>
          <div className="review-checks">
            {Object.entries(reviewItems).map(([key, label]) => (
              <label key={key}>
                <Checkbox
                  checked={draft.review[key as ReviewKey]}
                  onCheckedChange={(checked) =>
                    change({
                      review: { ...draft.review, [key]: checked === true },
                    })
                  }
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <div className="button-row">
            <button
              className="gold-button"
              disabled={
                isSaving ||
                libraryError ||
                !draft.title.trim() ||
                !draft.body.trim()
              }
              onClick={async () => {
                try {
                  const clean = { ...draft, title: draft.title.trim() };
                  await commit(
                    saveDraft(
                      account
                        ? library
                        : readLibrary(localStorage.getItem(libraryKey)),
                      clean,
                    ),
                  );
                  if (current.current === draft) {
                    put(clean);
                    setWorkingSaved(true);
                  }
                  setMessage(
                    account
                      ? 'Draft saved to your account. Not brand-approved or published.'
                      : 'Draft saved to your device library. Not brand-approved or published.',
                  );
                } catch (error) {
                  setMessage(
                    error instanceof Error
                      ? error.message
                      : 'Could not save. Export your draft to keep it.',
                  );
                }
              }}
            >
              {isSaving
                ? 'Saving…'
                : account
                  ? 'Save to account'
                  : 'Save to library'}{' '}
              <Check size={16} />
            </button>
            <button
              className="outline-button"
              disabled={!draft.body.trim()}
              onClick={() => {
                download('collective-draft.txt', exportDraft(draft));
                setMessage('Editorial draft exported with its review status.');
              }}
            >
              Export draft <Download size={16} />
            </button>
            <button
              className="outline-button"
              disabled={!draft.body.trim()}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(draft.body);
                  setMessage(
                    'Text copied. Verify details and review placeholders before sharing.',
                  );
                } catch {
                  setMessage(
                    'Copy unavailable. Select the text and copy it manually.',
                  );
                }
              }}
            >
              Copy text <Copy size={16} />
            </button>
          </div>
          <div className="studio-footer-actions">
            <button
              className="studio-text-button"
              disabled={Boolean(account) || !draft.body.trim()}
              onClick={() => {
                try {
                  localStorage.setItem(storageKeys.brief, cassiusBrief(draft));
                  window.dispatchEvent(new Event('ggc-local-save'));
                  window.location.hash = 'intelligence';
                } catch {
                  setMessage(
                    'Could not prepare the CASSIUS brief. Export your draft to keep it.',
                  );
                }
              }}
            >
              Prepare a CASSIUS brief <ArrowRight size={16} />
            </button>
            {saved && (
              <button
                className="studio-text-button"
                onClick={async () => {
                  try {
                    const latest = account
                      ? library
                      : readLibrary(localStorage.getItem(libraryKey));
                    await commit({
                      ...latest,
                      drafts: latest.drafts.filter((d) => d.id !== draft.id),
                    });
                    setRemoved(saved);
                    setMessage(
                      'Removed from the library. The working copy is preserved; undo is available until another removal or page reload.',
                    );
                  } catch (error) {
                    setMessage(
                      error instanceof Error
                        ? error.message
                        : 'Could not remove draft.',
                    );
                  }
                }}
              >
                <Trash2 size={14} /> Remove saved draft
              </button>
            )}
          </div>
          <p className="studio-help">
            {account
              ? 'CASSIUS is offline. Brief handoff is available only in the device preview; account drafts stay out of shared browser storage.'
              : 'CASSIUS is offline. The brief opens locally for you to review; nothing is sent.'}
          </p>
        </section>
      </div>
      <output className="form-status studio-feedback" aria-live="polite">
        {message}
      </output>
      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Replace the working copy?</AlertDialogTitle>
          <AlertDialogDescription>
            Changes outside your saved library will be replaced. Cancel to save
            or export them first.
          </AlertDialogDescription>
          <div className="button-row">
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending) put(pending);
                setPending(null);
              }}
            >
              Replace working copy
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
