'use client';
import { useMaterialScope } from '@/components/living-materials';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { OnboardingDraft } from '@/lib/profile';
import { VoiceInput } from '@/components/browser-voice-input';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Fingerprint,
  Plus,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { accountRequest } from '@/lib/account-client';
import type { AccountAccess } from '@/lib/account';
import {
  domains,
  domainLabels,
  transferPrompt,
  type Proposal,
  type Intelligence,
  type Knowledge,
  type Domain,
} from '@/lib/intelligence/model';
const roles = [
  'Founder / Business Owner',
  'Professional',
  'Barber / Grooming Professional',
  'Salon / Barbershop Owner',
  'Creator',
  'Fitness / Wellness Professional',
  'Student',
  'Sales',
  'Hospitality',
  'Building Something New',
];
const improvements = [
  'Business & Income',
  'Career',
  'Discipline',
  'Fitness',
  'Grooming',
  'Style',
  'Relationships',
  'Confidence',
  'Travel & Experiences',
  'Network',
  'Personal Brand',
];
const styles = [
  'Challenge me',
  'Keep me accountable',
  'Help me think clearly',
  'Give me practical next steps',
  'Keep it brief',
];
const fresh = (category: Domain, text: string): Proposal => ({
  category,
  text,
  certainty: 'known',
  source: 'You',
  sensitivity: 'private',
  decision: 'confirm',
});
export function CassiusIdentity({
  onboarding = false,
}: {
  onboarding?: boolean;
}) {
  useMaterialScope();
  const router = useRouter();
  const [access, setAccess] = useState<AccountAccess | null>(null),
    [state, setState] = useState<Intelligence | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    try {
      const a = await accountRequest<AccountAccess>('');
      const next = a.signedIn
        ? await accountRequest<Intelligence>('/intelligence')
        : null;
      setState(next);
      setAccess(a);
      setError('');
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Your profile could not be loaded.',
      );
    }
  }, []);
  useEffect(() => {
    let cancelled = false;
    accountRequest<AccountAccess>('')
      .then(async (a) => {
        const next = a.signedIn
          ? await accountRequest<Intelligence>('/intelligence')
          : null;
        if (!cancelled) {
          setAccess(a);
          setState(next);
        }
      })
      .catch((e) => {
        if (!cancelled)
          setError(
            e instanceof Error
              ? e.message
              : 'Your profile could not be loaded.',
          );
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    const revalidate = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener('pageshow', revalidate);
    return () => window.removeEventListener('pageshow', revalidate);
  }, []);
  const mutate = async (data: Record<string, unknown>) => {
    if (!state) return false;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      setState(
        await accountRequest<Intelligence>('/intelligence', 'POST', {
          ...data,
          revision: state.revision,
        }),
      );
      setNotice('Your Cassius profile is saved.');
      if (onboarding && (data.action === 'approve' || data.action === 'skip'))
        router.replace('/');
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Your changes could not be saved.',
      );
      return false;
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="ci-page">
      <header className="ci-header">
        <Link href="/" className="ci-wordmark">
          GROOMED GENT <span>COLLECTIVE</span>
        </Link>
        <nav>
          <Link href="/">Command</Link>
          <Link href="/membership">Partners</Link>
          {access?.signedIn && (
            <a
              href={
                access.signOutPath ??
                '/signout-with-chatgpt?return_to=/onboarding'
              }
              target="_top"
            >
              Sign out
            </a>
          )}
        </nav>
      </header>
      <div className="ci-ambient" aria-hidden="true" />
      <div className="ci-content">
        {error && (
          <div role="alert" className="ci-message">
            {error}{' '}
            <button onClick={() => void load()}>Reload saved profile</button>
          </div>
        )}
        {notice && <output className="ci-status">{notice}</output>}
        {!access ? (
          <section className="ci-hero">
            <Fingerprint size={44} />
            <h1>Opening your space.</h1>
            <p>Connecting to your private account…</p>
          </section>
        ) : !access.signedIn ? (
          <section className="ci-hero">
            <div className="ci-emblem">
              <Fingerprint size={44} />
            </div>
            <span className="ci-eyebrow">YOUR WORLD. UNDERSTOOD.</span>
            <h1>
              Meet the intelligence
              <br />
              built around you.
            </h1>
            <p>
              A little context. A sharper perspective. Meet Cassius, then shape
              what he knows as your life moves forward.
            </p>
            {access.configured ? (
              <>
                <a
                  className="ci-primary"
                  href={
                    access.signInPath
                      ? '/sign-up'
                      : '/signin-with-chatgpt?return_to=/onboarding'
                  }
                  target="_top"
                >
                  Create your account <ArrowRight size={17} />
                </a>
                <a
                  className="ci-text-link"
                  href={
                    access.signInPath ??
                    '/signin-with-chatgpt?return_to=/onboarding'
                  }
                  target="_top"
                >
                  Already part of the Collective? Sign in
                </a>
              </>
            ) : (
              <div className="ci-panel">
                <ShieldCheck />
                <h2>Your private space is being connected.</h2>
                <p>
                  Account services must be configured before you can save
                  personal information. You can still explore the Collective.
                </p>
                <Link href="/">
                  Explore the Collective <ArrowRight size={15} />
                </Link>
              </div>
            )}
            <small>
              Share what matters. You decide what Cassius remembers.
            </small>
          </section>
        ) : !state ? (
          <section className="ci-hero">
            <h1>Loading your private profile.</h1>
          </section>
        ) : onboarding && !state.completed ? (
          <ResumableMeet state={state} busy={busy} mutate={mutate} />
        ) : (
          <KnowledgeSpace
            state={state}
            busy={busy}
            mutate={mutate}
            error={error}
          />
        )}
      </div>
    </main>
  );
}
function Choices({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="ci-choices">
      {options.map((o) => (
        <button
          type="button"
          key={o}
          aria-pressed={value.includes(o)}
          onClick={() =>
            onChange(
              value.includes(o) ? value.filter((v) => v !== o) : [...value, o],
            )
          }
        >
          {o}
          {value.includes(o) && <Check size={14} />}
        </button>
      ))}
    </div>
  );
}
function ResumableMeet(props: {
  state: Intelligence;
  busy: boolean;
  mutate: (d: Record<string, unknown>) => Promise<boolean>;
}) {
  const [saved, setSaved] = useState<{
    revision: number;
    draft: OnboardingDraft | null;
  } | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    accountRequest<{ revision: number; draft: OnboardingDraft | null }>(
      '/onboarding',
    )
      .then((value) => {
        setSaved(value);
        setError('');
      })
      .catch(() => setError('Your saved answers could not be opened.'));
  }, []);
  useEffect(load, [load]);
  if (!saved)
    return (
      <section className="ci-meet">
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button onClick={load}>Try again</button>
          </>
        ) : (
          <output>Opening your saved answers…</output>
        )}
      </section>
    );
  return <Meet {...props} initial={saved} />;
}
function Meet({
  initial,
  state,
  busy,
  mutate,
}: {
  initial: { revision: number; draft: OnboardingDraft | null };
  state: Intelligence;
  busy: boolean;
  mutate: (d: Record<string, unknown>) => Promise<boolean>;
}) {
  const [step, setStep] = useState(initial.draft?.step ?? 0),
    [name, setName] = useState(initial.draft?.name ?? ''),
    [role, setRole] = useState<string[]>(initial.draft?.role ?? []),
    [improve, setImprove] = useState<string[]>(initial.draft?.improve ?? []),
    [style, setStyle] = useState<string[]>(initial.draft?.style ?? []),
    [goal, setGoal] = useState(initial.draft?.goal ?? ''),
    [business, setBusiness] = useState(initial.draft?.business ?? ''),
    [other, setOther] = useState(initial.draft?.other ?? ''),
    [items, setItems] = useState<Proposal[] | null>(null),
    [importing, setImporting] = useState(false);
  const revision = useRef(initial.revision);
  const [saving, setSaving] = useState(false),
    [saveError, setSaveError] = useState('');
  const saveStep = async (nextStep: number) => {
    setSaving(true);
    setSaveError('');
    try {
      const saved = await accountRequest<{ revision: number }>(
        '/onboarding',
        'PUT',
        {
          revision: revision.current,
          draft: {
            step: nextStep,
            name,
            role,
            improve,
            style,
            goal,
            business,
            other,
          },
        },
      );
      revision.current = saved.revision;
      setStep(nextStep);
      return true;
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : 'Your answers could not be saved.',
      );
      return false;
    } finally {
      setSaving(false);
    }
  };
  busy = busy || saving;
  const businessOwner =
    role.includes(roles[0]) || role.includes('Salon / Barbershop Owner');
  const steps = businessOwner
    ? ['name', 'roles', 'improve', 'goal', 'business', 'style', 'context']
    : ['name', 'roles', 'improve', 'goal', 'style', 'context'];
  const current = steps[Math.min(step, steps.length - 1)];
  const review = () => {
    const next = [
      ...(name.trim()
        ? [fresh('identity', `Preferred name: ${name.trim()}`)]
        : []),
      ...role.map((r) => fresh('work', r)),
      ...(other.trim() ? [fresh('work', other)] : []),
      ...improve.map((v) => fresh('goal', `Improve ${v}`)),
      ...(goal.trim() ? [fresh('goal', goal)] : []),
      ...(businessOwner && business.trim()
        ? [fresh('business', business)]
        : []),
      ...style.map((s) => fresh('ai_style', s)),
    ];
    setItems(next);
  };
  return (
    <section className="ci-meet">
      <div className="ci-meet-top">
        <span className="ci-eyebrow">MEET CASSIUS</span>
        <span>A few good questions</span>
      </div>
      <div
        className="ci-progress"
        aria-label={`Step ${step + 1} of ${steps.length}`}
      >
        {steps.map((s, i) => (
          <span key={s} className={i <= step ? 'is-lit' : ''} />
        ))}
      </div>
      <output className="ci-save-status">
        {saving
          ? 'Saving your answers…'
          : 'Continue saves this step to your account.'}
      </output>
      {saveError && <p role="alert">{saveError}</p>}
      {items ? (
        <>
          <h1>
            Does this sound
            <br />
            like you?
          </h1>
          <p className="ci-lede">
            Keep what feels accurate. Edit what needs context. This is your
            foundation, and you can change it any time.
          </p>
          <Review items={items} setItems={setItems} disabled={busy} />
          <div className="ci-actions">
            <button
              className="ci-secondary"
              disabled={busy}
              onClick={() => setItems(null)}
            >
              Back to questions
            </button>
            <button
              className="ci-primary"
              disabled={busy || !items.some((i) => i.decision !== 'remove')}
              onClick={() =>
                void mutate({ action: 'approve', approved: true, items })
              }
            >
              {busy ? 'Building your profile…' : 'Build My Cassius Profile'}
              <ArrowRight size={17} />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="ci-cassius-mark">
            <Sparkles size={24} />
            <span>CASSIUS</span>
          </div>
          {current === 'name' && (
            <>
              <h1>Good to meet you.</h1>
              <p className="ci-lede">
                Let’s start with what you like to be called. I’ll learn the rest
                with you, over time.
              </p>
              <label className="ci-field">
                Your name
                <input
                  type="text"
                  name="preferredName"
                  autoComplete="name"
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="What should I call you?"
                />
              </label>
            </>
          )}
          {current === 'roles' && (
            <>
              <h1>
                What does your world
                <br />
                look like right now{name ? `, ${name}` : ''}?
              </h1>
              <p className="ci-lede">
                You can be more than one thing. Choose what fits.
              </p>
              <Choices options={roles} value={role} onChange={setRole} />
              <label className="ci-field">
                In your own words · optional
                <input
                  maxLength={400}
                  value={other}
                  onChange={(e) => setOther(e.target.value)}
                  placeholder="Or tell me what you do"
                />
              </label>
            </>
          )}
          {current === 'improve' && (
            <>
              <h1>
                Where do you want
                <br />
                to get sharper?
              </h1>
              <p className="ci-lede">
                A few priorities will help me focus on what matters to you.
              </p>
              <Choices
                options={improvements}
                value={improve}
                onChange={setImprove}
              />
            </>
          )}
          {current === 'goal' && (
            <>
              <h1>
                What are you
                <br />
                building toward?
              </h1>
              <p className="ci-lede">
                A new chapter, a business, a better routine. Tell me what’s on
                your mind.
              </p>
              <label className="ci-field">
                Your next chapter
                <textarea
                  rows={4}
                  maxLength={1200}
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Right now, I’m working toward…"
                />
              </label>
              <VoiceInput
                onText={(text) =>
                  setGoal((current) =>
                    `${current} ${text}`.trim().slice(0, 1200),
                  )
                }
              />
              <small>
                Prefer speaking? Use your phone keyboard’s dictation. No
                recording is kept here.
              </small>
            </>
          )}
          {current === 'business' && (
            <>
              <h1>
                Tell me about
                <br />
                what you’re building.
              </h1>
              <p className="ci-lede">
                A name, what your business does, your role, and the challenge in
                front of you. Share as much or as little as feels useful.
              </p>
              <label className="ci-field">
                Your business · optional
                <textarea
                  rows={4}
                  maxLength={1200}
                  value={business}
                  onChange={(e) => setBusiness(e.target.value)}
                  placeholder="Business name, what you offer, and what you’re working toward…"
                />
              </label>
              <VoiceInput
                onText={(text) =>
                  setBusiness((current) =>
                    `${current} ${text}`.trim().slice(0, 1200),
                  )
                }
              />
            </>
          )}
          {current === 'style' && (
            <>
              <h1>
                How should I<br />
                work with you?
              </h1>
              <p className="ci-lede">
                Set the tone. We can adjust as we get to know each other.
              </p>
              <Choices options={styles} value={style} onChange={setStyle} />
            </>
          )}
          {current === 'context' && (
            <>
              <h1>
                You don’t have to
                <br />
                start from zero.
              </h1>
              <p className="ci-lede">
                Already work with an AI? Bring over the context you choose.
                You’ll review every detail before it joins your profile.
              </p>
              <button
                className="ci-secondary"
                onClick={() => setImporting(true)}
              >
                <Copy size={17} /> Bring Your Context
              </button>
              <p className="ci-note">
                Completely optional. A few details are enough to begin.
              </p>
            </>
          )}
          <div className="ci-actions">
            <button
              className="ci-secondary"
              disabled={step === 0 || busy}
              onClick={() => void saveStep(step - 1)}
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              className="ci-primary"
              disabled={busy}
              onClick={async () => {
                if (await saveStep(current === 'context' ? step : step + 1)) {
                  if (current === 'context') review();
                }
              }}
            >
              {current === 'context' ? 'Review my foundation' : 'Continue'}
              <ArrowRight size={17} />
            </button>
          </div>
          <button
            className="ci-secondary"
            disabled={busy}
            onClick={async () => {
              if (await saveStep(step))
                window.location.assign('/member-session');
            }}
          >
            Save and finish later
          </button>
          <button
            className="ci-text-link"
            disabled={busy}
            onClick={() => void mutate({ action: 'skip' })}
          >
            Start with a blank slate. We’ll learn as we go.
          </button>
        </>
      )}
      {importing && (
        <ImportContext
          disabled={busy}
          onClose={() => setImporting(false)}
          onReady={(imported) => {
            review();
            setItems((previous) => [...(previous ?? []), ...imported]);
            setImporting(false);
          }}
        />
      )}
      <p className="ci-privacy">
        <ShieldCheck size={15} /> Your knowledge stays private. Using it in AI
        conversations is a separate choice.
      </p>
      {state.nodes.length > 0 && (
        <p>
          Your existing {state.nodes.length} saved details will be preserved.
        </p>
      )}
    </section>
  );
}
function Review({
  items,
  setItems,
  disabled = false,
}: {
  items: Proposal[];
  setItems: (v: Proposal[]) => void;
  disabled?: boolean;
}) {
  const patch = (index: number, changes: Partial<Proposal>) =>
    setItems(items.map((p, i) => (i === index ? { ...p, ...changes } : p)));
  return (
    <div className="ci-review">
      <div className="ci-review-summary">
        <span>
          {items.filter((i) => i.decision !== 'remove').length} proposed details
        </span>
        <span>Nothing is saved until you approve</span>
      </div>
      {domains
        .filter((d) => items.some((p) => p.category === d))
        .map((d) => (
          <section key={d}>
            <h2>{domainLabels[d]}</h2>
            {items.map((p, i) =>
              p.category !== d ? null : (
                <article
                  key={i}
                  className={`ci-review-card ${p.decision === 'remove' ? 'ci-removed' : ''}`}
                >
                  <div className="ci-card-meta">
                    <span>{p.source}</span>
                    <span>
                      {p.certainty === 'known'
                        ? 'Source says: known'
                        : 'Source says: uncertain'}
                    </span>
                  </div>
                  <label className="ci-field">
                    <span className="sr-only">Edit detail {i + 1}</span>
                    <textarea
                      disabled={disabled || p.decision === 'remove'}
                      value={p.text}
                      rows={2}
                      maxLength={1200}
                      onChange={(e) => patch(i, { text: e.target.value })}
                    />
                  </label>
                  <div className="ci-card-controls">
                    <label>
                      Category
                      <select
                        disabled={disabled}
                        value={p.category}
                        onChange={(e) =>
                          patch(i, { category: e.target.value as Domain })
                        }
                      >
                        {domains.map((v) => (
                          <option key={v} value={v}>
                            {domainLabels[v]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Privacy
                      <select
                        disabled={disabled}
                        value={p.sensitivity}
                        onChange={(e) =>
                          patch(i, {
                            sensitivity: e.target
                              .value as Proposal['sensitivity'],
                          })
                        }
                      >
                        <option value="private">
                          Private · eligible for AI with consent
                        </option>
                        <option value="sensitive">
                          Sensitive · exclude from AI
                        </option>
                      </select>
                    </label>
                  </div>
                  <div className="ci-decisions">
                    {(
                      ['confirm', 'uncertain', 'historical', 'remove'] as const
                    ).map((v) => (
                      <button
                        disabled={disabled}
                        key={v}
                        aria-pressed={p.decision === v}
                        onClick={() => patch(i, { decision: v })}
                      >
                        {
                          {
                            confirm: 'Correct',
                            uncertain: 'Not sure',
                            historical: 'Not anymore',
                            remove: 'Remove',
                          }[v]
                        }
                      </button>
                    ))}
                  </div>
                </article>
              ),
            )}
          </section>
        ))}
    </div>
  );
}
function ImportContext({
  onClose,
  onReady,
  disabled,
}: {
  onClose: () => void;
  onReady: (p: Proposal[]) => void;
  disabled: boolean;
}) {
  const [source, setSource] = useState('ChatGPT'),
    [raw, setRaw] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-label="Bring Your Context"
      className="ci-dialog"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
    >
      <div className="ci-dialog-header">
        <span className="ci-eyebrow">BRING YOUR CONTEXT</span>
        <button aria-label="Close import" disabled={busy} onClick={onClose}>
          <X />
        </button>
      </div>
      <h2>A thoughtful handoff.</h2>
      <p>
        Copy this prompt into your AI, then bring its reply here. The source AI
        may only have access to part of your history. Review the reply for
        secrets before pasting.
      </p>
      <label className="ci-field">
        Where is your context coming from?
        <select value={source} onChange={(e) => setSource(e.target.value)}>
          {['ChatGPT', 'Claude', 'Gemini', 'Other AI'].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      <details>
        <summary>Read the transfer prompt</summary>
        <textarea
          aria-label="Transfer prompt"
          readOnly
          value={transferPrompt}
          rows={7}
        />
      </details>
      <button
        className="ci-secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(transferPrompt);
            setCopied(true);
          } catch {
            setError('Open the prompt above and copy it manually.');
          }
        }}
      >
        <Copy size={15} />
        {copied ? 'Prompt copied' : 'Copy transfer prompt'}
      </button>
      <label className="ci-field">
        Paste the reply
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          maxLength={40000}
          rows={7}
          placeholder="Paste structured JSON or plain text…"
        />
      </label>
      <p className="ci-note">
        This text is parsed without sending it to an AI. The raw import is not
        retained. Plain text is grouped provisionally; you can change every
        category.
      </p>
      {error && <p role="alert">{error}</p>}
      <button
        className="ci-primary"
        disabled={busy || disabled || !raw.trim()}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            const result = await accountRequest<{ proposals: Proposal[] }>(
              '/intelligence',
              'POST',
              { action: 'parse', source, text: raw },
            );
            onReady(result.proposals);
          } catch (e) {
            setError(
              e instanceof Error ? e.message : 'Could not read the import.',
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Preparing review…' : 'Review proposed knowledge'}
        <ArrowRight size={16} />
      </button>
    </dialog>
  );
}
function KnowledgeSpace({
  error,
  state,
  busy,
  mutate,
}: {
  state: Intelligence;
  busy: boolean;
  error: string;
  mutate: (d: Record<string, unknown>) => Promise<boolean>;
}) {
  const [filter, setFilter] = useState<string>('all'),
    [search, setSearch] = useState(''),
    [importing, setImporting] = useState(false),
    [review, setReview] = useState<Proposal[] | null>(null),
    [edit, setEdit] = useState<Knowledge | null>(null),
    [remove, setRemove] = useState<Knowledge | null>(null),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [relation, setRelation] = useState('supports'),
    [erase, setErase] = useState('');
  const visible = state.nodes.filter(
    (n) =>
      (filter === 'all' || n.category === filter) &&
      n.text.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <section className="ci-knowledge">
      <div className="ci-knowledge-heading">
        <div>
          <span className="ci-eyebrow">YOUR PERSONAL INTELLIGENCE</span>
          <h1>
            What Cassius
            <br />
            knows about me.
          </h1>
          <p className="ci-lede">
            {state.completed
              ? 'We have enough to begin. I’ll keep learning with you, naturally.'
              : 'Your foundation starts with a detail that matters.'}{' '}
            You always have the final word on what stays.
          </p>
        </div>
        <div
          className="ci-orbit"
          aria-label={`${state.nodes.length} knowledge items across ${new Set(state.nodes.map((n) => n.category)).size} domains`}
        >
          <div className="ci-orbit-ring" />
          <div className="ci-orbit-center">
            <Fingerprint size={32} />
            <strong>YOU</strong>
          </div>
          {['Identity', 'Work', 'Goals', 'Life'].map((v, i) => (
            <span key={v} className={`ci-orbit-label ci-orbit-${i}`}>
              {v}
            </span>
          ))}
        </div>
      </div>
      <div className="ci-toolbar">
        <button
          className="ci-primary"
          disabled={busy}
          onClick={() => setReview([fresh('identity', '')])}
        >
          <Plus size={16} /> Add a detail
        </button>
        <button
          className="ci-secondary"
          disabled={busy}
          onClick={() => setImporting(true)}
        >
          Bring Your Context
        </button>
        <Link className="ci-secondary" href="/">
          Enter the Collective <ArrowRight size={16} />
        </Link>
      </div>
      <div className="ci-consent">
        <ShieldCheck size={22} />
        <div>
          <strong>You control the connection.</strong>
          <p>
            Allow Cassius to use confirmed, current private details in AI
            conversations. Those selected details are sent to the configured AI
            provider when you chat. Sensitive, uncertain, retired and disputed
            knowledge is excluded.
          </p>
        </div>
        <label>
          <input
            type="checkbox"
            checked={state.personalization}
            disabled={busy}
            onChange={(e) =>
              void mutate({
                action: 'settings',
                personalization: e.target.checked,
              })
            }
          />{' '}
          Use my context
        </label>
      </div>
      {review && (
        <section className="ci-panel">
          <h2>Review your next layer.</h2>
          <Review items={review} setItems={setReview} disabled={busy} />
          <div className="ci-actions">
            <button
              disabled={busy}
              className="ci-secondary"
              onClick={() => setReview(null)}
            >
              Cancel
            </button>
            <button
              className="ci-primary"
              disabled={
                busy ||
                review.some((i) => i.decision !== 'remove' && !i.text.trim())
              }
              onClick={async () => {
                if (
                  await mutate({
                    action: 'approve',
                    approved: true,
                    items: review,
                  })
                )
                  setReview(null);
              }}
            >
              Build My Cassius Profile
            </button>
          </div>
        </section>
      )}
      <label className="ci-field">
        Find something Cassius knows
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your knowledge"
        />
      </label>
      <div className="ci-domain-tabs">
        <button
          aria-pressed={filter === 'all'}
          onClick={() => setFilter('all')}
        >
          All <span>{state.nodes.length}</span>
        </button>
        {domains
          .filter((d) => state.nodes.some((n) => n.category === d))
          .map((d) => (
            <button
              key={d}
              aria-pressed={filter === d}
              onClick={() => setFilter(d)}
            >
              {domainLabels[d]}{' '}
              <span>{state.nodes.filter((n) => n.category === d).length}</span>
            </button>
          ))}
      </div>
      {!visible.length && (
        <div className="ci-empty">
          <Sparkles size={28} />
          <h2>
            {state.nodes.length
              ? 'No matching details.'
              : 'Room for who you’re becoming.'}
          </h2>
          <p>
            {state.nodes.length
              ? 'Try another search or category.'
              : 'Add one goal, a preference, or something about your world. That’s enough to begin.'}
          </p>
        </div>
      )}
      <div className="ci-node-grid">
        {visible.map((n) => (
          <article className="ci-node" key={n.id}>
            <div className="ci-card-meta">
              <span>{domainLabels[n.category]}</span>
              <span>{n.status === 'current' ? n.confirmation : n.status}</span>
            </div>
            <p>{n.text}</p>
            <small>
              {n.source} · {n.sensitivity} · Updated{' '}
              {new Date(n.updatedAt).toLocaleDateString()} · v{n.revision}
            </small>
            <div className="ci-node-actions">
              <button disabled={busy} onClick={() => setEdit(n)}>
                Edit / correct
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  void mutate({
                    action: 'update',
                    id: n.id,
                    item: { ...n, decision: 'confirm' },
                    status: 'current',
                  })
                }
              >
                Confirm
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  void mutate({
                    action: 'update',
                    id: n.id,
                    item: n,
                    status: 'historical',
                  })
                }
              >
                Not anymore
              </button>
              <button disabled={busy} onClick={() => setRemove(n)}>
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>
      <details className="ci-panel">
        <summary>Connect the pieces of your life</summary>
        <p>
          A goal can lead to a project, a milestone, and an accomplishment.
          Connect details you’ve saved to show how they relate.
        </p>
        <div className="ci-connect">
          {[
            ['From', from, setFrom],
            ['To', to, setTo],
          ].map(([label, value, setter]) => (
            <label key={String(label)} className="ci-field">
              {String(label)}
              <select
                value={String(value)}
                onChange={(e) =>
                  (setter as (v: string) => void)(e.target.value)
                }
              >
                <option value="">Choose an item</option>
                {state.nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {domainLabels[n.category]}: {n.text.slice(0, 65)}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label className="ci-field">
            Relationship
            <select
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
            >
              {[
                ['supports', 'Supports'],
                ['has_project', 'Has project'],
                ['has_milestone', 'Has milestone'],
                ['achieved', 'Achieved'],
                ['related_to', 'Related to'],
              ].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <button
            className="ci-secondary"
            disabled={busy || !from || !to || from === to}
            onClick={() =>
              void mutate({ action: 'connect', from, to, relation })
            }
          >
            Connect
          </button>
        </div>
        {state.edges.map((e) => (
          <div className="ci-edge" key={e.id}>
            <span>
              {state.nodes.find((n) => n.id === e.from)?.text}
              <small>{e.relation.replaceAll('_', ' ')}</small>
              {state.nodes.find((n) => n.id === e.to)?.text}
            </span>
            <button
              disabled={busy}
              onClick={() => void mutate({ action: 'disconnect', id: e.id })}
            >
              Disconnect
            </button>
          </div>
        ))}
      </details>
      <details className="ci-panel">
        <summary>Privacy & removal</summary>
        <p>
          Corrections preserve the previous version. “Not anymore” keeps a
          historical detail. Removing knowledge deletes the detail, its
          correction history and its connections from the active database.
          Backups expire according to the hosting provider’s retention policy.
          This does not erase existing chat text or unrelated Collective
          records.
        </p>
        <label className="ci-field">
          To remove all Cassius knowledge, type REMOVE MY KNOWLEDGE
          <input
            value={erase}
            onChange={(e) => setErase(e.target.value)}
            autoComplete="off"
          />
        </label>
        <button
          className="ci-secondary"
          disabled={busy || erase !== 'REMOVE MY KNOWLEDGE'}
          onClick={async () => {
            if (await mutate({ action: 'erase', confirmation: erase }))
              setErase('');
          }}
        >
          Remove all my knowledge
        </button>
      </details>
      {importing && (
        <ImportContext
          disabled={busy}
          onClose={() => setImporting(false)}
          onReady={(items) => {
            setReview(items);
            setImporting(false);
          }}
        />
      )}
      {edit && (
        <EditKnowledge
          error={error}
          node={edit}
          disabled={busy}
          onClose={() => setEdit(null)}
          onSave={async (item, status) => {
            if (await mutate({ action: 'update', id: edit.id, item, status }))
              setEdit(null);
          }}
        />
      )}
      {remove && (
        <ConfirmRemoval
          error={error}
          node={remove}
          disabled={busy}
          onClose={() => setRemove(null)}
          onRemove={async () => {
            if (await mutate({ action: 'remove', id: remove.id }))
              setRemove(null);
          }}
        />
      )}
    </section>
  );
}
function EditKnowledge({
  error,
  node,
  disabled,
  onClose,
  onSave,
}: {
  node: Knowledge;
  error: string;
  disabled: boolean;
  onClose: () => void;
  onSave: (item: Proposal, status: Knowledge['status']) => Promise<void>;
}) {
  const [items, setItems] = useState<Proposal[]>([
      {
        ...node,
        decision: node.confirmation === 'confirmed' ? 'confirm' : 'uncertain',
      },
    ]),
    [status, setStatus] = useState(node.status);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label="Review your knowledge"
      className="ci-dialog"
      onCancel={(e) => {
        if (disabled) e.preventDefault();
        else onClose();
      }}
    >
      <div className="ci-dialog-header">
        <h2>Keep it true to you.</h2>
        <button disabled={disabled} aria-label="Close edit" onClick={onClose}>
          <X />
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      <Review items={items} setItems={setItems} disabled={disabled} />
      <label className="ci-field">
        State
        <select
          disabled={disabled}
          value={status}
          onChange={(e) => setStatus(e.target.value as Knowledge['status'])}
        >
          <option value="current">Current</option>
          <option value="historical">Historical</option>
          <option value="disputed">Disputed</option>
        </select>
      </label>
      <p className="ci-note">
        The prior version is retained as history. To permanently remove it, use
        Remove on the knowledge card.
      </p>
      <button
        className="ci-primary"
        disabled={
          disabled || !items[0].text.trim() || items[0].decision === 'remove'
        }
        onClick={() =>
          void onSave(
            items[0],
            items[0].decision === 'historical' ? 'historical' : status,
          )
        }
      >
        Save correction
      </button>
    </dialog>
  );
}
function ConfirmRemoval({
  error,
  node,
  disabled,
  onClose,
  onRemove,
}: {
  node: Knowledge;
  error: string;
  disabled: boolean;
  onClose: () => void;
  onRemove: () => Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label="Review your knowledge"
      className="ci-dialog"
      onCancel={(e) => {
        if (disabled) e.preventDefault();
        else onClose();
      }}
    >
      <h2>Remove this knowledge?</h2>
      <p>{node.text}</p>
      <p>This deletes its saved history and connections too.</p>
      {error && <p role="alert">{error}</p>}
      <div className="ci-actions">
        <button className="ci-secondary" disabled={disabled} onClick={onClose}>
          Keep it
        </button>
        <button
          className="ci-primary"
          disabled={disabled}
          onClick={() => void onRemove()}
        >
          Remove knowledge
        </button>
      </div>
    </dialog>
  );
}
