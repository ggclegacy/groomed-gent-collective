'use client';

import { SpatialCommand } from '@/components/spatial-command';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Sparkles,
  ArrowUpRight,
  Plus,
  Trash2,
  Check,
  Compass,
} from 'lucide-react';
import {
  emptyMemory,
  parseMemory,
  profileFields,
  cassiusContext,
  type GentlemanMemory,
  type PrivateRecord,
  type RecordKind,
} from '@/lib/gentleman/model';
import { askCassius } from '@/lib/cassius/client';
import type { Section } from '@/lib/collective';
import {
  GentlemanContext as Context,
  useGentleman,
} from '@/components/gentleman-context';
import { VoyageWorkspace } from '@/components/voyage/workspace';
import {
  QuickCapture,
  CaptureReviewPanel,
  DeskFocus,
} from '@/components/capture/workspace';
import { LifeOverview, LifeRecordDetails } from '@/components/life/workspace';
import { RelationshipDetails } from '@/components/relationship-details';

async function memoryResponse(
  response: Response,
): Promise<{ revision: number; memory: GentlemanMemory }> {
  const raw: unknown = await response.json();
  if (!raw || typeof raw !== 'object')
    throw new Error('Private memory response could not be read.');
  const data = raw as Record<string, unknown>;
  if (!response.ok)
    throw new Error(
      typeof data.error === 'string'
        ? data.error
        : 'Private storage is unavailable.',
    );
  if (!Number.isSafeInteger(data.revision) || (data.revision as number) < 0)
    throw new Error('Private memory revision is invalid.');
  return {
    revision: data.revision as number,
    memory: parseMemory(data.memory),
  };
}
function exportMemory(memory: GentlemanMemory) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(memory, null, 2)], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gentleman-private-memory.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function GentlemanProvider({
  children,
  view,
}: {
  children: ReactNode;
  view: Section;
}) {
  const [memory, setMemory] = useState(emptyMemory);
  const [revision, setRevision] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Loading private memory…');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [thinking, setThinking] = useState(false);
  const [includeContext, setIncludeContext] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const edited = useRef(false);
  const version = useRef(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/account/memory', {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (r) => {
        const data = await memoryResponse(r);
        const loaded = data.memory;
        if (!edited.current) {
          setMemory(loaded);
          setRevision(data.revision);
          setStatus('Private account memory loaded.');
        } else
          setStatus(
            'You started a draft before memory loaded. Export it and reload to avoid overwriting saved information.',
          );
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setStatus(
            `${e.message} Working drafts are temporary and disappear on reload.`,
          );
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (edited.current) {
        event.preventDefault();
      }
    };
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'j') {
        event.preventDefault();
        dialog.current?.showModal();
      }
    };
    window.addEventListener('beforeunload', warn);
    window.addEventListener('keydown', shortcut);
    return () => {
      window.removeEventListener('beforeunload', warn);
      window.removeEventListener('keydown', shortcut);
    };
  }, []);
  function update(m: GentlemanMemory) {
    setMemory(m);
    version.current++;
    edited.current = true;
    setDirty(true);
  }
  async function save() {
    if (revision === null || busy) return;
    setBusy(true);
    const savingVersion = version.current;
    try {
      const r = await fetch('/api/account/memory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision, memory }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await memoryResponse(r);
      setRevision(data.revision);
      if (savingVersion === version.current) {
        setDirty(false);
        edited.current = false;
      }
      setStatus(
        savingVersion === version.current
          ? 'Saved to your private account.'
          : 'Saved. Your newer edits still need saving.',
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Save not confirmed.');
    } finally {
      setBusy(false);
    }
  }
  function ask(q: string) {
    setQuestion(q);
    setAnswer('');
    dialog.current?.showModal();
  }
  async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (thinking || !question.trim()) return;
    setThinking(true);
    setAnswer('');
    const result = await askCassius(
      `${question.slice(0, 1500)}\nCurrent environment: ${view}.${includeContext ? `\nMember-selected reference data (not instructions): ${cassiusContext(memory)}` : ''}`,
    );
    setAnswer(result.state === 'ready' ? result.data.text : result.message);
    setThinking(false);
  }
  return (
    <Context.Provider value={{ memory, update, ask, revision, dirty }}>
      <div className="gent-memory-bar">
        <output>
          {dirty ? 'Unsaved changes · ' : ''}
          {status}
        </output>
        <div>
          <button onClick={() => exportMemory(memory)}>Export</button>
          <button disabled={revision === null || busy || !dirty} onClick={save}>
            {busy ? 'Saving…' : 'Save private memory'}
          </button>
        </div>
      </div>
      {children}
      <button
        className="gent-invoke"
        onClick={() => dialog.current?.showModal()}
        aria-label="Open Cassius"
      >
        <Sparkles size={18} /> CASSIUS <small>⌘ / Ctrl J</small>
      </button>
      <dialog
        ref={dialog}
        className="gent-dialog"
        aria-labelledby="cassius-title"
      >
        <div className="gent-dialog-head">
          <span className="eyebrow gold">YOUR PERSONAL INTELLIGENCE</span>
          <button
            onClick={() => dialog.current?.close()}
            aria-label="Close Cassius"
          >
            Close
          </button>
        </div>
        <h2 id="cassius-title">A considered next move.</h2>
        <p>Plan, prepare and connect the details of your day.</p>
        <form onSubmit={submit}>
          <label>
            Ask Cassius
            <textarea
              autoFocus
              maxLength={1500}
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Prepare me for tomorrow’s meeting…"
            />
          </label>
          <label className="gent-check">
            <input
              type="checkbox"
              checked={includeContext}
              onChange={(e) => setIncludeContext(e.target.checked)}
            />
            Include profile and records marked for Cassius
          </label>
          <p className="small-note">
            Selected context is sent to the AI provider for this request.
            Nothing is saved automatically. Calendar and live bookings are not
            connected.
          </p>
          {includeContext && (
            <details>
              <summary>Review exactly what will be shared</summary>
              <pre>{cassiusContext(memory)}</pre>
            </details>
          )}
          <button className="gold-button" disabled={thinking}>
            {thinking ? 'Considering…' : 'Ask Cassius'}
            <ArrowUpRight size={16} />
          </button>
        </form>
        <output className="gent-answer">{answer}</output>
      </dialog>
    </Context.Provider>
  );
}

export function PersonalCommand() {
  return <SpatialCommand />;
}

const spaces: Record<
  string,
  { title: string; subtitle: string; kinds: RecordKind[] }
> = {
  voyage: {
    title: 'Go with intention.',
    subtitle: 'A journey shaped around your purpose, pace and taste.',
    kinds: ['trip'],
  },
  circle: {
    title: 'Remember what matters.',
    subtitle: 'People, shared context and a thoughtful next conversation.',
    kinds: ['person'],
  },
  life: {
    title: 'Present yourself well.',
    subtitle:
      'Your grooming rhythm, personal style and places worth remembering.',
    kinds: ['ritual', 'wardrobe', 'place'],
  },
  desk: {
    title: 'Clear the desk.',
    subtitle: 'Prepare for meetings. Keep decisions and commitments in view.',
    kinds: ['task', 'decision'],
  },
  vault: {
    title: 'Kept within reach.',
    subtitle: 'Private text references. Document uploads will follow.',
    kinds: ['reference'],
  },
  logbook: {
    title: 'Capture the thought.',
    subtitle:
      'Private written observations, ready when you need them. Voice capture is coming later.',
    kinds: ['note'],
  },
};
const labels: Record<RecordKind, string> = {
  person: 'Person',
  trip: 'Trip',
  ritual: 'Grooming ritual',
  wardrobe: 'Style / wardrobe',
  place: 'Place',
  task: 'Task / meeting',
  decision: 'Decision',
  reference: 'Reference',
  note: 'Note',
};
function fresh(kind: RecordKind): PrivateRecord {
  return {
    id: crypto.randomUUID(),
    kind,
    title: '',
    detail: '',
    date: '',
    endDate: '',
    mode: 'leisure',
    completed: false,
    shareWithCassius: false,
    createdAt: new Date().toISOString(),
  };
}
export function GentlemanWorkspace({ view }: { view: string }) {
  const { memory, update, ask } = useGentleman();
  const space = spaces[view];
  const [draft, setDraft] = useState<PrivateRecord | null>(null);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState('');
  if (!space) return null;
  if (view === 'voyage') return <VoyageWorkspace />;
  const records = memory.records.filter((r) => space.kinds.includes(r.kind));
  function put(record: PrivateRecord) {
    try {
      const next = {
        ...memory,
        records: memory.records.some((r) => r.id === record.id)
          ? memory.records.map((r) =>
              r.id === record.id
                ? {
                    ...record,
                    ritual: r.ritual,
                    wardrobe: r.wardrobe,
                    packing: r.packing,
                    relationship: r.relationship,
                  }
                : r,
            )
          : [...memory.records, record],
      };
      update(parseMemory(next));
      setDraft(null);
      setGenerated('');
      setError('');
    } catch {
      setError(
        'Provide a title, valid dates in order, and a note under 16,000 characters. Maximum 300 records.',
      );
    }
  }
  async function generate(surprise: boolean) {
    if (!draft || generating) return;
    setGenerating(true);
    setError('');
    setGenerated('');
    const result = await askCassius(
      `Create a ${draft.mode} travel itinerary draft. ${surprise ? 'Suggest an unexpected destination matching this brief. Explain the fit.' : `Destination: ${draft.title}.`} Dates: ${draft.date || 'ask for dates'} through ${draft.endDate || 'not specified'}. Brief: ${draft.detail.slice(0, 4000)}. Organize by day with morning, afternoon and evening, realistic transfer buffers, city orientation and a travel grooming checklist. ${draft.mode !== 'leisure' ? 'Protect working hours, include a meeting preparation block and presentation checklist.' : ''} Label all venue suggestions as unverified. You have no live pricing, flights, weather, availability or booking tools. Do not invent reservations or claim confirmation.`,
    );
    if (result.state === 'ready') setGenerated(result.data.text);
    else setError(result.message);
    setGenerating(false);
  }
  return (
    <section className="gent-space">
      <span className="eyebrow gold">{view.toUpperCase()} / PRIVATE</span>
      <h1>{space.title}</h1>
      <p className="lede">{space.subtitle}</p>
      <div className="gent-actions">
        {space.kinds.map((k) => (
          <button
            className="outline-button"
            key={k}
            disabled={generating}
            onClick={() => {
              setDraft(fresh(k));
              setGenerated('');
              setError('');
            }}
          >
            <Plus size={16} />
            Add {labels[k].toLowerCase()}
          </button>
        ))}
        {view === 'life' && (
          <button
            className="outline-button"
            onClick={() =>
              ask(
                'Help me build a simple Groomed Gent grooming routine. Ask about my existing products and preferences, use verified product directions and avoid unsupported claims.',
              )
            }
          >
            Build my ritual with Cassius
            <Sparkles size={16} />
          </button>
        )}
      </div>
      {view === 'life' && <LifeOverview />}
      {view === 'logbook' && <QuickCapture />}
      {view === 'desk' && <DeskFocus />}
      {draft && (
        <form
          className="gent-editor"
          onSubmit={(e) => {
            e.preventDefault();
            put(draft);
          }}
        >
          <h2>
            {memory.records.some((r) => r.id === draft.id) ? 'Refine' : 'New'}{' '}
            {labels[draft.kind].toLowerCase()}
          </h2>
          <label>
            {draft.kind === 'person'
              ? 'Name'
              : draft.kind === 'trip'
                ? 'Destination / trip name'
                : 'Title'}
            <input
              required
              maxLength={160}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>
          {draft.kind === 'trip' && (
            <label>
              Purpose
              <select
                value={draft.mode}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    mode: e.target.value as PrivateRecord['mode'],
                  })
                }
              >
                <option value="business">Business</option>
                <option value="hybrid">Business + leisure</option>
                <option value="leisure">Leisure</option>
              </select>
            </label>
          )}
          <div className="gent-fields">
            <label>
              {draft.kind === 'person'
                ? 'Follow up on'
                : draft.kind === 'trip'
                  ? 'Departure'
                  : 'Date / due date'}
              <input
                type="date"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              />
            </label>
            {draft.kind === 'trip' && (
              <label>
                Return
                <input
                  type="date"
                  min={draft.date}
                  value={draft.endDate}
                  onChange={(e) =>
                    setDraft({ ...draft, endDate: e.target.value })
                  }
                />
              </label>
            )}
          </div>
          <label>
            {draft.kind === 'person'
              ? 'What should you remember?'
              : draft.kind === 'trip'
                ? 'Travel brief / itinerary'
                : 'Details'}
            <textarea
              rows={7}
              maxLength={16000}
              value={draft.detail}
              placeholder={
                draft.kind === 'person'
                  ? 'Met Alex at dinner. Runs a design studio, prefers early meetings. Discuss a collaboration next week…'
                  : 'Capture the details that make this yours…'
              }
              onChange={(e) => setDraft({ ...draft, detail: e.target.value })}
            />
          </label>
          <label className="gent-check">
            <input
              type="checkbox"
              checked={draft.shareWithCassius}
              onChange={(e) =>
                setDraft({ ...draft, shareWithCassius: e.target.checked })
              }
            />
            Allow this record in selected Cassius context
          </label>
          {draft.kind === 'trip' && (
            <>
              <p className="small-note">
                Trip generation sends the destination, dates, purpose and brief
                to Cassius. Suggestions require verification before travel.
              </p>
              <div className="gent-actions">
                <button
                  type="button"
                  className="outline-button"
                  disabled={generating}
                  onClick={() => generate(false)}
                >
                  {generating ? 'Planning…' : 'Draft itinerary with AI'}
                </button>
                <button
                  type="button"
                  className="outline-button"
                  disabled={generating}
                  onClick={() => generate(true)}
                >
                  Surprise me
                </button>
              </div>
            </>
          )}
          {generated && (
            <div className="gent-generated">
              <span className="eyebrow gold">
                AI DRAFT / REVIEW BEFORE KEEPING
              </span>
              <p>{generated}</p>
              <button
                type="button"
                className="outline-button"
                onClick={() => {
                  setDraft({ ...draft, detail: generated });
                  setGenerated('');
                }}
              >
                Use this itinerary
              </button>
            </div>
          )}
          <div className="gent-actions">
            <button className="gold-button" disabled={generating}>
              Keep in working memory
            </button>
            <button
              type="button"
              disabled={generating}
              onClick={() => {
                setDraft(null);
                setGenerated('');
              }}
            >
              Cancel
            </button>
          </div>
          <p className="small-note">
            Use “Save private memory” to retain changes in your account.
          </p>
        </form>
      )}
      <p role="alert">{error}</p>
      <div className="gent-records">
        {records.map((r) => (
          <article
            key={r.id}
            className={`gent-record ${r.completed ? 'is-complete' : ''}`}
          >
            <span className="eyebrow gold">
              {labels[r.kind]}{' '}
              {r.kind === 'trip' ? `/ ${r.mode} · UNVERIFIED PLAN` : ''}
            </span>
            <h2>{r.title}</h2>
            {r.date && (
              <p className="gent-date">
                {r.date}
                {r.endDate && ` — ${r.endDate}`}
                {r.completed ? ' · Complete' : ''}
              </p>
            )}
            <p className="gent-record-detail">
              {r.detail || 'Add a few details to make this useful.'}
            </p>
            {r.kind === 'person' && <RelationshipDetails person={r} />}
            {r.kind === 'note' && <CaptureReviewPanel note={r} />}
            {(r.kind === 'ritual' || r.kind === 'wardrobe') && (
              <LifeRecordDetails record={r} />
            )}
            <div className="gent-actions">
              <button
                disabled={generating}
                onClick={() => {
                  setDraft(r);
                  setGenerated('');
                }}
              >
                Edit
              </button>
              <button onClick={() => put({ ...r, completed: !r.completed })}>
                <Check size={14} />
                {r.kind === 'ritual'
                  ? r.completed
                    ? 'Resume'
                    : 'Pause'
                  : r.completed
                    ? 'Reopen'
                    : 'Complete'}
              </button>
              <button
                onClick={() =>
                  ask(
                    r.kind === 'person'
                      ? `Prepare a meeting brief for ${r.title}. Ask me to select the relationship context I want to share; identify open questions and a thoughtful follow-up.`
                      : `Help me prepare for ${r.title}, my ${labels[r.kind].toLowerCase()}. Ask me to select the context I want to share.`,
                  )
                }
              >
                Prepare with Cassius
              </button>
              <button
                aria-label={`Delete ${r.title}`}
                onClick={() => {
                  if (
                    window.confirm(
                      `Remove “${r.title}” from working memory? Save afterward to remove it from your account.`,
                    )
                  )
                    update({
                      ...memory,
                      records: memory.records
                        .filter((x) => x.id !== r.id)
                        .map((x) => ({
                          ...x,
                          origin:
                            x.relatedPersonId === r.id ? undefined : x.origin,
                          relatedPersonId:
                            x.relatedPersonId === r.id
                              ? undefined
                              : x.relatedPersonId,
                          ...(x.tripPlan
                            ? {
                                tripPlan: {
                                  ...x.tripPlan,
                                  events: x.tripPlan.events.map((e) =>
                                    e.contactId === r.id
                                      ? { ...e, contactId: '' }
                                      : e,
                                  ),
                                },
                              }
                            : {}),
                        })),
                    });
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
            <small>
              {r.shareWithCassius
                ? 'Available for selected Cassius context'
                : 'Excluded from Cassius context'}
            </small>
          </article>
        ))}
      </div>
      {!records.length && !draft && (
        <div className="gent-empty">
          <span className="gent-orbit">
            <Compass size={28} />
          </span>
          <h2>A private space, ready for you.</h2>
          <p>Add your first {labels[space.kinds[0]].toLowerCase()} to begin.</p>
        </div>
      )}
    </section>
  );
}
export function GentlemanProfileEditor() {
  const { memory, update } = useGentleman();
  return (
    <section className="gent-space">
      <span className="eyebrow gold">GENTLEMAN PROFILE</span>
      <h1>Known on your terms.</h1>
      <p className="lede">
        Tell Cassius what makes a recommendation right for you. Every field is
        optional.
      </p>
      <div className="gent-editor">
        {profileFields.map((k) => (
          <label key={k}>
            {
              {
                name: 'Preferred name',
                taste: 'Taste, interests and favorite places',
                style: 'Style and presentation',
                business: 'Business and personal brand',
                travel: 'Travel preferences',
                grooming: 'Grooming and routines',
                goals: 'Goals and priorities',
                assistant: 'How Cassius should help',
              }[k]
            }
            <textarea
              rows={2}
              maxLength={1000}
              value={memory.profile[k]}
              onChange={(e) =>
                update({
                  ...memory,
                  profile: { ...memory.profile, [k]: e.target.value },
                })
              }
            />
          </label>
        ))}
        <label className="gent-check">
          <input
            type="checkbox"
            checked={memory.shareProfile}
            onChange={(e) =>
              update({ ...memory, shareProfile: e.target.checked })
            }
          />
          Make this profile available when I choose to include Cassius context
        </label>
        <p>
          Profile changes stay temporary until you save private memory. Your
          membership and financial information are managed separately.
        </p>
        <button
          className="outline-button"
          onClick={() => {
            if (
              window.confirm(
                'Clear all profile fields and personal records? Save afterward to replace your account memory with an empty copy.',
              )
            )
              update(emptyMemory());
          }}
        >
          Clear all personal memory
        </button>
      </div>
    </section>
  );
}
export function CollectiveHub() {
  return (
    <section className="gent-space">
      <span className="eyebrow gold">COLLECTIVE</span>
      <h1>Your place in the Collective.</h1>
      <p className="lede">
        The business, craft and opportunities behind your membership.
      </p>
      <div className="gent-hub">
        {[
          [
            'performance',
            'Performance',
            'Commissions, referrals and your impact.',
          ],
          [
            'identity',
            'Ambassador identity',
            'Your introduction, signature code and membership.',
          ],
          [
            'knowledge',
            'Product Studio',
            'Know the products. Make informed recommendations.',
          ],
          [
            'studio',
            'Creator Studio',
            'Create for Groomed Gent, your own business or personal brand.',
          ],
          [
            'status',
            'Status & privileges',
            'Membership, rewards and opportunities.',
          ],
        ].map(([key, title, copy]) => (
          <a href={`#${key}`} key={key}>
            <h2>{title}</h2>
            <p>{copy}</p>
            <ArrowUpRight size={20} />
          </a>
        ))}
      </div>
    </section>
  );
}
