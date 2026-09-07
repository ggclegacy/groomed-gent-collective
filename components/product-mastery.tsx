'use client';
import Link from 'next/link';
import { VoiceInput } from '@/components/browser-voice-input';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronLeft,
  Copy,
  FlaskConical,
  Headphones,
  Layers3,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Choice } from '@/components/workspaces';
import { productBrain } from '@/lib/product-brain/runtime';
import type { Dossier, Field } from '@/lib/product-brain/schema';
import {
  applyLearning,
  cardsFor,
  catalogCards,
  creatorBrief,
  customerCard,
  emptyLearning,
  label,
  mastery,
  productName,
  reviewQueue,
  skills,
  type Card,
  type LearningCommand,
  type LearningState,
} from '@/lib/product-mastery/model';
import { coachPrompt, scenarios } from '@/lib/product-mastery/coaching';
import { productHandoffUrl } from '@/lib/product-mastery/handoff';
import { askCassius } from '@/lib/cassius/client';
import type { ConversationTurn, IntelligenceAnswer } from '@/lib/collective';
import { roles, knowledge, type Product } from '@/lib/product-knowledge';

const dossiers = productBrain.products.map((p) => p.dossier);
const allCards = catalogCards();
const pendingProducts = knowledge.products.filter(
  (p) => !p.concept && !dossiers.some((d) => d.productId === p.id),
);
type Destination =
  | 'Today'
  | 'Product rooms'
  | 'Sales Lab'
  | 'Customer mode'
  | 'My mastery';
const views: Destination[] = [
  'Today',
  'Product rooms',
  'Sales Lab',
  'Customer mode',
  'My mastery',
];
function useLearning() {
  const [state, setState] = useState<LearningState>(emptyLearning);
  const [mode, setMode] = useState<'loading' | 'account' | 'session' | 'error'>(
    'loading',
  );
  const [message, setMessage] = useState('Checking your learning account…');
  const [busy, setBusy] = useState(false);
  const revision = useRef(0),
    lock = useRef(false),
    alive = useRef(true);
  const reload = useCallback(async () => {
    try {
      const response = await fetch('/api/account/learning', {
        cache: 'no-store',
        credentials: 'same-origin',
        signal: AbortSignal.timeout(10000),
      });
      const data = (await response.json()) as {
        error?: string;
        revision: number;
        learning: LearningState;
      };
      if (!alive.current) return;
      if (!response.ok) {
        if ([401, 403, 503].includes(response.status)) {
          setState(emptyLearning());
          revision.current = 0;
          setMode('session');
          setMessage(
            'Practice preview · progress lasts only while this page is open. Member saving requires connected member services and an active account.',
          );
          return;
        }
        throw new Error(
          'Your progress could not be loaded. Reload to try again.',
        );
      }
      if (
        data.learning?.version !== 1 ||
        !Array.isArray(data.learning.attempts) ||
        !data.learning.records
      )
        throw new Error(
          'Progress could not be read. Your saved record has been preserved.',
        );
      revision.current = data.revision;
      setState(data.learning);
      setMode('account');
      setMessage('Your learning progress saves to your member account.');
    } catch (error) {
      if (alive.current) {
        setMode('error');
        setMessage(
          error instanceof Error ? error.message : 'Progress is unavailable.',
        );
      }
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    // The reload performs asynchronous network I/O; state updates happen only after it resolves.
    // oxlint-disable-next-line react/react-compiler
    void reload();
    return () => {
      alive.current = false;
    };
  }, [reload]);
  async function submit(command: LearningCommand) {
    if (lock.current || mode === 'loading' || mode === 'error') return null;
    lock.current = true;
    setBusy(true);
    try {
      if (mode === 'session') {
        const next = applyLearning(state, command);
        setState(next);
        return next;
      }
      const response = await fetch('/api/account/learning', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision: revision.current, command }),
        signal: AbortSignal.timeout(10000),
      });
      const data = (await response.json()) as {
        error?: string;
        revision: number;
        learning: LearningState;
      };
      if (!response.ok)
        throw new Error(
          data.error ??
            'Progress was not saved. Retry or reload your progress.',
        );
      revision.current = data.revision;
      setState(data.learning);
      setMessage('Progress saved to your account.');
      return data.learning as LearningState;
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Progress was not saved.',
      );
      return null;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return { state, mode, message, busy, submit, reload };
}
type Learning = ReturnType<typeof useLearning>;
function SourceField({
  field,
  title,
  productId,
}: {
  field: Field | undefined;
  title: string;
  productId: string;
}) {
  const record = productBrain.products.find(
    (p) => p.dossier.productId === productId,
  );
  return (
    <div className="pm-fact">
      <div className="pm-fact-heading">
        <h4>{title}</h4>
        <span className={`pm-status pm-${field?.status ?? 'unknown'}`}>
          {field?.status === 'unverified'
            ? 'Website / awaiting review'
            : (field?.status ?? 'Unknown')}
        </span>
      </div>
      <p>{field?.value ?? 'Unknown · not supplied in the product record.'}</p>
      {field?.note && <p className="pm-muted">{field.note}</p>}
      {Boolean(field?.evidence.length) && (
        <details className="pm-source">
          <summary>Trace this statement</summary>
          {field!.evidence.map((e, i) => {
            const source = record?.sources.find((s) => s.id === e.sourceId);
            return (
              <div key={i}>
                <blockquote>{e.quote}</blockquote>
                <small>{e.locator}</small>
                {source && (
                  <p>
                    {/^https?:\/\//.test(source.locator) ? (
                      <a href={source.locator} target="_blank" rel="noreferrer">
                        Open source <ArrowUpRight size={12} />
                      </a>
                    ) : (
                      <span>{source.locator}</span>
                    )}{' '}
                    · captured {source.capturedAt.slice(0, 10)}
                  </p>
                )}
              </div>
            );
          })}
        </details>
      )}
    </div>
  );
}
function AnswerView({ answer }: { answer: IntelligenceAnswer }) {
  const [reading, setReading] = useState(false);
  useEffect(
    () => () => {
      window.speechSynthesis?.cancel();
    },
    [],
  );
  return (
    <div className="pm-ai-answer">
      <p className="pm-pre">{answer.text}</p>
      {answer.citations.length > 0 && (
        <div className="pm-citations">
          {answer.citations
            .filter((c, i, a) => a.findIndex((v) => v.url === c.url) === i)
            .map((c, i) => (
              <a
                key={i}
                href={/^https?:\/\//.test(c.url) ? c.url : undefined}
                target="_blank"
                rel="noreferrer"
              >
                {c.title} <ArrowUpRight size={12} />
              </a>
            ))}
        </div>
      )}
      <button
        className="text-link"
        onClick={() => {
          if (!window.speechSynthesis) return;
          if (reading) {
            window.speechSynthesis.cancel();
            setReading(false);
            return;
          }
          const utterance = new SpeechSynthesisUtterance(answer.text);
          utterance.onend = () => setReading(false);
          utterance.onerror = () => setReading(false);
          window.speechSynthesis.speak(utterance);
          setReading(true);
        }}
      >
        <Headphones size={15} />
        {reading ? 'Stop reading' : 'Read aloud'}
      </button>
    </div>
  );
}
function CassiusCoach({
  d,
  state,
  role,
  initial = '',
}: {
  d: Dossier;
  state: LearningState;
  role: string;
  initial?: string;
}) {
  const [input, setInput] = useState(initial);
  const [depth, setDepth] = useState('Explain simply');
  const [answer, setAnswer] = useState<IntelligenceAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const life = useRef(0);
  useEffect(
    () => () => {
      life.current++;
    },
    [],
  );
  async function ask() {
    if (busy || !input.trim()) return;
    const request = life.current;
    setBusy(true);
    setError('');
    const result = await askCassius(
      coachPrompt(d, state, role, `${depth}. ${input}`, 'teach'),
    );
    if (request !== life.current) return;
    setBusy(false);
    if (result.state === 'ready') setAnswer(result.data);
    else setError(result.message);
  }
  return (
    <section className="pm-panel pm-coach">
      <div className="pm-title-line">
        <Sparkles size={20} />
        <span className="eyebrow gold">CASSIUS / YOUR PRODUCT COACH</span>
      </div>
      <h3>Make it click.</h3>
      <p>
        Ask about this product, an ingredient, or how to explain it in your
        world.
      </p>
      <Choice
        label="Learning depth"
        value={depth}
        options={[
          'Explain simply',
          'Teach me in depth',
          'Help me explain to a customer',
          'Check my explanation',
        ]}
        onChange={(v) => {
          setDepth(v);
          setAnswer(null);
        }}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask();
        }}
      >
        <label className="field">
          Ask Cassius
          <textarea
            rows={3}
            maxLength={5000}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What should I understand about this formula?"
          />
        </label>
        <button className="gold-button" disabled={busy || !input.trim()}>
          {busy ? 'Cassius is thinking…' : 'Teach me'}
          <ArrowRight size={16} />
        </button>
      </form>
      <p className="pm-muted">
        Product facts stay tied to their source. General explanations are
        education, not approved GGC claims.
      </p>
      <output>{error}</output>
      {answer && <AnswerView answer={answer} />}
    </section>
  );
}
function Exercise({
  card,
  learning,
  onNext,
  studied = false,
}: {
  card: Card;
  learning: Learning;
  onNext: () => void;
  studied?: boolean;
}) {
  const [answer, setAnswer] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [revealed, setRevealed] = useState(studied);
  const [result, setResult] = useState<{
    correct: boolean;
    assessed: boolean;
    due: string;
  } | null>(null);
  const id = useRef<string | null>(null);
  async function submit() {
    id.current ??= crypto.randomUUID();
    const next = await learning.submit({
      action: 'answer',
      id: id.current,
      cardId: card.id,
      version: card.version,
      answer,
      confidence,
      mode: revealed ? 'guided' : 'recall',
    });
    if (next) {
      const attempt = next.attempts.find((a) => a.id === id.current);
      if (attempt)
        setResult({
          correct: attempt.correct,
          assessed: attempt.assessed,
          due: next.records[card.id].dueAt,
        });
    }
  }
  return (
    <article className="pm-panel pm-exercise">
      <span className="eyebrow gold">
        {card.skill} /{' '}
        {card.options.length ? 'DECISION PRACTICE' : 'RECALL PRACTICE'}
      </span>
      <h3>{card.title}</h3>
      <p className="pm-question">{card.question}</p>
      {!result ? (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            {card.options.length ? (
              <fieldset className="pm-options">
                <legend className="sr-only">Choose your answer</legend>
                {card.options.map((option) => (
                  <label key={option} data-selected={answer === option}>
                    <input
                      type="radio"
                      name={card.id}
                      value={option}
                      checked={answer === option}
                      onChange={() => setAnswer(option)}
                      disabled={learning.busy}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </fieldset>
            ) : (
              <label className="field">
                Your answer
                <input
                  autoComplete="off"
                  maxLength={1000}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Recall the exact statement or amount"
                  disabled={learning.busy}
                />
              </label>
            )}
            <fieldset className="pm-confidence">
              <legend>How sure are you?</legend>
              {['Still guessing', 'Fairly sure', 'Very sure'].map((c, i) => (
                <button
                  type="button"
                  key={c}
                  aria-pressed={confidence === i + 1}
                  onClick={() => setConfidence(i + 1)}
                >
                  {c}
                </button>
              ))}
            </fieldset>
            <div className="pm-actions">
              <button
                className="gold-button"
                disabled={
                  !answer.trim() ||
                  !confidence ||
                  learning.busy ||
                  ['loading', 'error'].includes(learning.mode)
                }
              >
                {learning.busy ? 'Saving…' : 'Check my answer'}
                <Check size={16} />
              </button>
              <button
                type="button"
                className="text-link"
                onClick={() => setRevealed(true)}
              >
                Study the source first
              </button>
            </div>
          </form>
          {revealed && (
            <div className="pm-callout">
              <p>{card.lesson}</p>
              <small>
                This becomes guided practice. Come back later for unaided
                recall.
              </small>
            </div>
          )}
        </>
      ) : (
        <div className="pm-callout" aria-live="polite">
          <h4>{result.correct ? 'You have it.' : 'Let’s sharpen that.'}</h4>
          <p>{card.explanation}</p>
          {!result.correct && (
            <p>
              <strong>Expected answer:</strong> {card.answer}
            </p>
          )}
          <p>
            {result.assessed
              ? 'Recall recorded.'
              : 'Guided practice or a quick retry · no mastery credit.'}{' '}
            Review after {new Date(result.due).toLocaleString()}.
          </p>
          <button className="gold-button" onClick={onNext}>
            Continue <ArrowRight size={16} />
          </button>
        </div>
      )}
      {(revealed || result) &&
        card.fields.map((f) => (
          <SourceField
            key={f.path}
            field={f.field}
            title={label(f.path.split('.').at(-1)!)}
            productId={card.productId}
          />
        ))}
    </article>
  );
}
function DailyMission({
  d,
  learning,
  role,
  onPractice,
}: {
  d: Dossier;
  learning: Learning;
  role: string;
  onPractice: () => void;
}) {
  const [mission] = useState(() => {
    const queue = reviewQueue(learning.state, cardsFor(d));
    const chosen: Card[] = [];
    for (const group of [
      [skills[0], skills[1]],
      [skills[2], skills[3]],
      [skills[4]],
    ]) {
      const candidate = queue.find((c) => group.some((s) => s === c.skill));
      if (candidate) chosen.push(candidate);
    }
    return chosen;
  });
  const [step, setStep] = useState(0);
  const [explanation, setExplanation] = useState('');
  const [feedback, setFeedback] = useState<IntelligenceAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  const life = useRef(0);
  useEffect(
    () => () => {
      life.current++;
    },
    [],
  );
  async function review() {
    setBusy(true);
    setError('');
    const current = life.current;
    const result = await askCassius(
      coachPrompt(
        d,
        learning.state,
        role,
        `Review this short customer explanation: ${explanation}`,
        'feedback',
      ),
    );
    if (current !== life.current) return;
    setBusy(false);
    if (result.state === 'ready') setFeedback(result.data);
    else setError(result.message);
  }
  return (
    <div className="pm-mission">
      <div className="pm-section-header">
        <div>
          <span className="eyebrow gold">YOUR NEXT USEFUL STEP</span>
          <h2>
            {done
              ? 'A little sharper than before.'
              : 'Know it. Recall it. Explain it.'}
          </h2>
          <p>{productName(d)}</p>
        </div>
        <span className="pm-pill">3–5 minute mission</span>
      </div>
      <Progress
        value={done ? 100 : (step / (mission.length + 1)) * 100}
        aria-label="Mission progress"
      />
      {done ? (
        <section className="pm-panel">
          <Trophy size={36} />
          <h3>Your practice has a finish line.</h3>
          <p>
            Your next reviews are scheduled from your answers and confidence. A
            missed day never erases your work.
          </p>
          <div className="pm-actions">
            <button className="gold-button" onClick={onPractice}>
              Try a customer conversation <ArrowRight size={16} />
            </button>
            <button
              className="text-link"
              onClick={() => {
                setDone(false);
                setStep(0);
                setStarted(false);
              }}
            >
              Review this mission
            </button>
          </div>
        </section>
      ) : !started ? (
        <section className="pm-panel">
          <BookOpen size={28} />
          <h3>Start with one clear idea.</h3>
          <p>
            {mission[0]?.lesson ??
              'Learn to distinguish a product record from an assumption.'}
          </p>
          <p className="pm-muted">
            You’ll recall facts, make a judgment, and explain the product in
            your own words. Answers you study first count as practice.
          </p>
          <button
            className="gold-button"
            disabled={learning.mode === 'loading' || learning.mode === 'error'}
            onClick={() => {
              setStarted(true);
              setStep(0);
            }}
          >
            Begin mission <ArrowRight size={16} />
          </button>
        </section>
      ) : step < mission.length ? (
        <Exercise
          key={mission[step].id}
          card={mission[step]}
          studied={step === 0}
          learning={learning}
          onNext={() => setStep(step + 1)}
        />
      ) : (
        <section className="pm-panel">
          <span className="eyebrow gold">TEACH IT BACK</span>
          <h3>Explain it to someone new.</h3>
          <p>
            In two or three sentences: what is known, what would you ask them,
            and what needs checking? Don’t include customer names or private
            health information.
          </p>
          <label className="field">
            Your explanation
            <textarea
              rows={4}
              maxLength={3000}
              value={explanation}
              onChange={(e) => {
                setExplanation(e.target.value);
                setFeedback(null);
              }}
            />
          </label>
          <VoiceInput
            onText={(text) => {
              setExplanation(text);
              setFeedback(null);
            }}
          />
          <div className="pm-actions">
            <button
              className="gold-button"
              disabled={!explanation.trim() || busy}
              onClick={() => void review()}
            >
              {busy ? 'Reviewing…' : 'Get Cassius feedback'}
              <Sparkles size={16} />
            </button>
            <button className="text-link" onClick={() => setDone(true)}>
              {feedback ? 'Finish mission' : 'Finish without AI feedback'}
            </button>
          </div>
          <output>{error}</output>
          {feedback && <AnswerView answer={feedback} />}
          <p className="pm-muted">
            AI coaching is formative feedback. It does not award mastery or
            certification.
          </p>
        </section>
      )}
    </div>
  );
}
function Formula({ d }: { d: Dossier }) {
  const [query, setQuery] = useState('');
  const rows = d.supplement?.rows.filter((r) =>
    r.name.value?.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <label className="field">
        Find an ingredient
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search this formula"
        />
      </label>
      {d.supplement && (
        <>
          <SourceField
            title="Serving size"
            field={d.supplement.fields.servingSize}
            productId={d.productId}
          />
          <SourceField
            title="Servings per container"
            field={d.supplement.fields.servingsPerContainer}
            productId={d.productId}
          />
          <div className="pm-table-wrap">
            <table>
              <caption>
                Captured Supplement Facts · amounts retain the stated serving
                basis
              </caption>
              <thead>
                <tr>
                  <th scope="col">Ingredient / nutrient</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Daily Value</th>
                </tr>
              </thead>
              <tbody>
                {rows?.map((r) => (
                  <tr key={r.id}>
                    <th scope="row">
                      {r.name.value ?? 'Unknown'}
                      <small>{r.name.status}</small>
                    </th>
                    <td>
                      {r.amount.value ?? 'Unknown / not disclosed'}
                      <small>{r.amount.status}</small>
                    </td>
                    <td>
                      {r.dailyValue.value ?? 'Not shown'}
                      <small>{r.dailyValue.status}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows?.length && <p>No matching label rows.</p>}
          </div>
          <SourceField
            title="Other ingredients"
            field={d.supplement.fields.otherIngredients}
            productId={d.productId}
          />
          <SourceField
            title="Blend declaration"
            field={d.supplement.fields.blendDeclaration}
            productId={d.productId}
          />
        </>
      )}
      {d.ingredients
        .filter((i) =>
          `${i.fields.name.value} ${i.fields.commonName.value}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .map((i) => (
          <details className="pm-ingredient" key={i.id}>
            <summary>
              <FlaskConical size={18} />
              {i.fields.name.value ?? 'Unnamed ingredient'}
              <span>{i.fields.concentration.value ?? 'Amount unknown'}</span>
            </summary>
            {Object.entries(i.fields).map(([key, f]) => (
              <SourceField
                key={key}
                title={label(key)}
                field={f}
                productId={d.productId}
              />
            ))}
            <p className="pm-muted">
              Ingredient education is separate from this product’s formula. Ask
              Cassius for an explanation and check its sources.
            </p>
          </details>
        ))}
      <SourceField
        title="Complete declaration"
        field={d.sections.formula.completeDeclaration}
        productId={d.productId}
      />
    </>
  );
}
function ProductRoom({
  d,
  learning,
  role,
  onLearn,
  onPractice,
  onCustomer,
}: {
  d: Dossier;
  learning: Learning;
  role: string;
  onLearn: () => void;
  onPractice: () => void;
  onCustomer: () => void;
}) {
  return (
    <div className="pm-room">
      <div className="pm-section-header">
        <div>
          <span className="eyebrow gold">
            PRODUCT ROOM / REVISION {d.revision}
          </span>
          <h2>{productName(d)}</h2>
          <p>One product. Every detail, at your pace.</p>
        </div>
        <div className="pm-actions">
          <button className="gold-button" onClick={onLearn}>
            Learn this product <BookOpen size={16} />
          </button>
          <button className="outline-button" onClick={onCustomer}>
            Customer view <ArrowUpRight size={16} />
          </button>
        </div>
      </div>
      <Tabs defaultValue="overview">
        <TabsList className="pm-tabs">
          {[
            ['overview', 'Overview'],
            ['formula', 'Inside the formula'],
            ['use', 'Use & cautions'],
            ['science', 'Science & evidence'],
            ['practice', 'Explain & practice'],
          ].map(([v, t]) => (
            <TabsTrigger key={v} value={v}>
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview">
          <div className="pm-two">
            <section className="pm-panel">
              <SourceField
                title="The product"
                field={d.sections.identity.positioning}
                productId={d.productId}
              />
              <SourceField
                title="Who the record describes"
                field={d.sections.identity.targetCustomer}
                productId={d.productId}
              />
              <SourceField
                title="Sizes & variants"
                field={
                  d.supplement?.fields.variants ?? d.sections.identity.sizes
                }
                productId={d.productId}
              />
              <SourceField
                title="Captured price · check live page"
                field={d.sections.identity.price}
                productId={d.productId}
              />
            </section>
            <CassiusCoach
              key={d.productId}
              d={d}
              state={learning.state}
              role={role}
            />
          </div>
        </TabsContent>
        <TabsContent value="formula">
          <section className="pm-panel">
            <Formula d={d} />
          </section>
        </TabsContent>
        <TabsContent value="use">
          <section className="pm-panel">
            {Object.entries(d.sections.use).map(([key, f]) => (
              <SourceField
                key={key}
                title={label(key)}
                field={f}
                productId={d.productId}
              />
            ))}
            {Object.entries(d.sections.safety).map(([key, f]) => (
              <SourceField
                key={key}
                title={label(key)}
                field={f}
                productId={d.productId}
              />
            ))}
            {d.supplement && (
              <SourceField
                title="Full captured warnings"
                field={d.supplement.fields.warnings}
                productId={d.productId}
              />
            )}
          </section>
        </TabsContent>
        <TabsContent value="science">
          <section className="pm-panel">
            <h3>Know what the evidence can support.</h3>
            <p>
              Website copy is a first-party observation. Ingredient research
              does not establish a benefit for a finished GGC formula.
            </p>
            <SourceField
              title="Formula rationale"
              field={d.sections.formula.rationale}
              productId={d.productId}
            />
            <SourceField
              title="Educational explanation"
              field={d.sections.claims.educationalExplanation}
              productId={d.productId}
            />
            <SourceField
              title="Research evidence"
              field={d.sections.claims.evidence}
              productId={d.productId}
            />
            <SourceField
              title="Reviewed marketing language"
              field={d.sections.claims.approvedMarketing}
              productId={d.productId}
            />
            {d.supplement && (
              <SourceField
                title="Conflicts needing review"
                field={d.supplement.fields.conflicts}
                productId={d.productId}
              />
            )}
            <details className="pm-source">
              <summary>Browse the full product record</summary>
              {Object.entries(d.sections).map(([section, fields]) => (
                <details key={section}>
                  <summary>{label(section)}</summary>
                  {Object.entries(fields).map(([key, f]) => (
                    <SourceField
                      key={key}
                      title={label(key)}
                      field={f}
                      productId={d.productId}
                    />
                  ))}
                </details>
              ))}
              {d.supplement &&
                Object.entries(d.supplement.fields).map(([key, f]) => (
                  <SourceField
                    key={key}
                    title={label(key)}
                    field={f}
                    productId={d.productId}
                  />
                ))}
            </details>
          </section>
        </TabsContent>
        <TabsContent value="practice">
          <div className="pm-two">
            <CassiusCoach
              d={d}
              state={learning.state}
              role={role}
              initial="Help me explain this product in 20 seconds, while being clear about unknowns."
            />
            <section className="pm-panel">
              <Target size={28} />
              <h3>Turn knowledge into a conversation.</h3>
              <p>
                Practice discovery, objections and responsible next steps with a
                fictional customer.
              </p>
              <button className="gold-button" onClick={onPractice}>
                Enter Sales Lab <ArrowRight size={16} />
              </button>
            </section>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
function SalesLab({
  d,
  learning,
  role,
}: {
  d: Dossier;
  learning: Learning;
  role: string;
}) {
  const [scenario, setScenario] = useState<string>(scenarios[0]);
  const [difficulty, setDifficulty] = useState('Supported');
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [answers, setAnswers] = useState<IntelligenceAnswer[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [review, setReview] = useState<IntelligenceAnswer | null>(null);
  const life = useRef(0);
  const count = turns.filter((t) => t.role === 'user').length;
  useEffect(
    () => () => {
      life.current++;
    },
    [],
  );
  function reset() {
    life.current++;
    setTurns([]);
    setAnswers([]);
    setInput('');
    setReview(null);
    setError('');
    setBusy(false);
  }
  async function send(kind: 'start' | 'reply' | 'review') {
    if (busy) return;
    setBusy(true);
    setError('');
    const current = life.current;
    const request =
      kind === 'start'
        ? 'Open the scenario with the first customer question.'
        : kind === 'review'
          ? 'End the simulation and coach the conversation above. If a factual assertion cannot be checked, say so.'
          : input;
    const result = await askCassius(
      coachPrompt(
        d,
        learning.state,
        role,
        request,
        kind === 'review' ? 'feedback' : 'practice',
        scenario,
        difficulty,
      ),
      undefined,
      turns,
    );
    if (current !== life.current) return;
    setBusy(false);
    if (result.state !== 'ready') {
      setError(result.message);
      return;
    }
    if (kind === 'review') {
      setReview(result.data);
      return;
    }
    setTurns([
      ...turns,
      ...(kind === 'reply' ? [{ role: 'user' as const, content: input }] : []),
      { role: 'assistant', content: result.data.text },
    ]);
    setAnswers([...answers, result.data]);
    setInput('');
  }
  return (
    <section className="pm-panel pm-sales">
      <span className="eyebrow gold">CASSIUS SALES LAB</span>
      <h2>Practice the moment that matters.</h2>
      <p>
        {productName(d)} · {role}
      </p>
      <div className="pm-two">
        <Choice
          label="Customer scenario"
          value={scenario}
          options={[...scenarios]}
          onChange={(v) => {
            setScenario(v);
            reset();
          }}
        />
        <Choice
          label="Challenge level"
          value={difficulty}
          options={['Supported', 'Independent', 'Challenging']}
          onChange={(v) => {
            setDifficulty(v);
            reset();
          }}
        />
      </div>
      <p className="pm-muted">
        Three exchanges, then focused coaching. This is a fictional customer.
        Avoid real customer names or private health details.
      </p>
      {!turns.length ? (
        <button
          className="gold-button"
          disabled={busy}
          onClick={() => void send('start')}
        >
          {busy ? 'Opening conversation…' : 'Start conversation'}
          <Sparkles size={16} />
        </button>
      ) : (
        <>
          <div className="pm-conversation">
            {turns.map((t, i) => (
              <div key={i} className={`pm-turn pm-${t.role}`}>
                <span className="eyebrow">
                  {t.role === 'user' ? 'YOU' : 'PRACTICE CUSTOMER'}
                </span>
                <p>{t.content}</p>
              </div>
            ))}
          </div>
          {count < 3 && !review ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send('reply');
              }}
            >
              <label className="field">
                Your response · {count + 1} of 3
                <textarea
                  rows={4}
                  value={input}
                  maxLength={1800}
                  onChange={(e) => setInput(e.target.value)}
                />
              </label>
              <VoiceInput onText={setInput} />
              <button className="gold-button" disabled={busy || !input.trim()}>
                {busy ? 'Responding…' : 'Send response'}
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            !review && (
              <button
                className="gold-button"
                disabled={busy}
                onClick={() => void send('review')}
              >
                {busy ? 'Preparing coaching…' : 'Review my conversation'}
                <Sparkles size={16} />
              </button>
            )
          )}
          {review && (
            <>
              <h3>Your coaching</h3>
              <AnswerView answer={review} />
              <p className="pm-muted">
                Feedback is not certification. Practice the suggested
                improvement in a new session.
              </p>
            </>
          )}
          <div className="pm-actions">
            <button className="text-link" onClick={reset}>
              <RotateCcw size={15} />
              Try again
            </button>
            {count > 0 && !review && count < 3 && (
              <button
                className="text-link"
                disabled={busy}
                onClick={() => void send('review')}
              >
                End early & get feedback
              </button>
            )}
          </div>
          {answers.some((a) => a.citations.length > 0) && (
            <details className="pm-source">
              <summary>Sources referenced during practice</summary>
              {answers
                .flatMap((a) => a.citations)
                .filter((c, i, a) => a.findIndex((v) => v.url === c.url) === i)
                .map((c, i) => (
                  <p key={i}>
                    <a
                      href={/^https?:\/\//.test(c.url) ? c.url : undefined}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {c.title}
                    </a>
                  </p>
                ))}
            </details>
          )}
        </>
      )}
      <output>{error}</output>
    </section>
  );
}
function CustomerMode({ d }: { d: Dossier }) {
  const [other, setOther] = useState(
    dossiers.find((p) => p.productId !== d.productId)?.productId ?? '',
  );
  const [relationship, setRelationship] = useState(
    'I may earn a commission when you buy through my link.',
  );
  const [message, setMessage] = useState('');
  const compared = dossiers.find((p) => p.productId === other);
  const copy = customerCard(d, relationship);
  const source = productBrain.products
    .find((p) => p.dossier.productId === d.productId)
    ?.sources.find(
      (s) =>
        s.kind === 'website' &&
        /^https:\/\/groomedgentco.com\/products\//.test(s.locator),
    );
  async function clipboard(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage('Copied.');
    } catch {
      setMessage('Clipboard is unavailable. Select and copy the text below.');
    }
  }
  return (
    <>
      <div className="pm-section-header">
        <div>
          <span className="eyebrow gold">CUSTOMER MODE</span>
          <h2>Clarity in the conversation.</h2>
          <p>Fast reference, thoughtful questions, reviewed language.</p>
        </div>
        {source && (
          <a
            className="outline-button"
            href={source.locator}
            target="_blank"
            rel="noreferrer"
          >
            Live product page <ArrowUpRight size={16} />
          </a>
        )}
      </div>
      <div className="pm-two">
        <section className="pm-panel">
          <h3>Your conversation guide</h3>
          <ol className="pm-guide">
            <li>“What are you hoping to find?”</li>
            <li>“What do you already use, and what matters most to you?”</li>
            <li>
              Check the current directions, cautions and product fit together.
            </li>
            <li>
              “Would it help to see the product page, or would you rather think
              about it?”
            </li>
          </ol>
          <SourceField
            title="Reviewed customer explanation"
            field={d.sections.education.customerExplanation}
            productId={d.productId}
          />
          <SourceField
            title="Directions reference"
            field={
              d.supplement?.fields.directions ?? d.sections.use.application
            }
            productId={d.productId}
          />
          <SourceField
            title="Cautions reference"
            field={
              d.supplement?.fields.warnings ?? d.sections.safety.sensitivities
            }
            productId={d.productId}
          />
        </section>
        <section className="pm-panel">
          <h3>From knowledge to content.</h3>
          <Choice
            label="Choose your actual relationship"
            value={relationship}
            options={[
              'I may earn a commission when you buy through my link.',
              'Groomed Gent Co. gave me this product.',
              'I work for Groomed Gent Co.',
            ]}
            onChange={(v) => {
              setRelationship(v);
              setMessage('');
            }}
          />
          {copy ? (
            <>
              <div className="pm-share-card">
                <span>GROOMED GENT CO.</span>
                <p className="pm-pre">{copy}</p>
              </div>
              <button
                className="gold-button"
                onClick={() => void clipboard(copy)}
              >
                <Copy size={16} />
                Copy reviewed product card
              </button>
            </>
          ) : (
            <div className="pm-callout">
              <ShieldCheck size={24} />
              <h4>Promotional copy awaits review.</h4>
              <p>
                The website record is available for learning. A customer-ready
                benefit card unlocks when marketing language is verified.
              </p>
            </div>
          )}
          <div className="pm-actions">
            <a className="gold-button" href={productHandoffUrl(d.productId)}>
              Send product brief to Creator Studio <ArrowUpRight size={16} />
            </a>
            <button
              className="text-link"
              onClick={() => void clipboard(creatorBrief(d, relationship))}
            >
              Copy editorial brief
            </button>
          </div>
          <details className="pm-source">
            <summary>View editorial brief</summary>
            <p className="pm-pre">{creatorBrief(d, relationship)}</p>
          </details>
          <output>{message}</output>
          <p className="pm-muted">
            Product-page links are first-party references. Referral attribution
            and live inventory are not connected here.
          </p>
        </section>
      </div>
      <section className="pm-panel">
        <h3>Compare without guessing.</h3>
        <Choice
          label="Compare with"
          value={compared ? productName(compared) : ''}
          options={dossiers
            .filter((p) => p.productId !== d.productId)
            .map(productName)}
          onChange={(v) =>
            setOther(dossiers.find((p) => productName(p) === v)!.productId)
          }
        />
        {compared && (
          <div className="pm-two">
            {[d, compared].map((p) => (
              <div key={p.productId}>
                <h4>{productName(p)}</h4>
                <SourceField
                  title="Serving"
                  field={
                    p.supplement?.fields.servingSize ?? p.sections.use.amount
                  }
                  productId={p.productId}
                />
                <SourceField
                  title="Complete formula"
                  field={p.sections.formula.completeDeclaration}
                  productId={p.productId}
                />
                <SourceField
                  title="Captured price"
                  field={p.sections.identity.price}
                  productId={p.productId}
                />
                <SourceField
                  title="Unresolved differences"
                  field={p.supplement?.fields.conflicts}
                  productId={p.productId}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
function MasteryPanel({
  learning,
  onReview,
}: {
  learning: Learning;
  onReview: (card: Card) => void;
}) {
  const [now] = useState(Date.now);
  const report = mastery(learning.state, allCards);
  const stale = allCards.filter(
    (c) =>
      learning.state.records[c.id] &&
      learning.state.records[c.id].version !== c.version,
  );
  const attempts = learning.state.attempts.filter((a) => a.assessed);
  const correct = attempts.filter((a) => a.correct).length;
  const confidentErrors = attempts.filter(
    (a) => !a.correct && a.confidence === 3,
  ).length;
  const week = new Date();
  week.setUTCHours(0, 0, 0, 0);
  week.setUTCDate(week.getUTCDate() - ((week.getUTCDay() + 6) % 7));
  const days = new Set(
    attempts
      .filter((a) => Date.parse(a.at) >= week.getTime())
      .map((a) => a.at.slice(0, 10)),
  ).size;
  const next = reviewQueue(learning.state, allCards).slice(0, 6);
  return (
    <>
      <div className="pm-section-header">
        <div>
          <span className="eyebrow gold">MY MASTERY</span>
          <h2>Confidence you can demonstrate.</h2>
          <p>
            Mastery counts correct recall on a later day. It is an internal
            learning measure, not a professional credential.
          </p>
        </div>
      </div>
      <div className="pm-metrics">
        <div>
          <strong>{attempts.length}</strong>
          <span>Assessed recalls</span>
        </div>
        <div>
          <strong>
            {attempts.length
              ? Math.round((correct / attempts.length) * 100) + '%'
              : '—'}
          </strong>
          <span>Recall accuracy</span>
        </div>
        <div>
          <strong>{confidentErrors}</strong>
          <span>Confident errors to learn from</span>
        </div>
        <div>
          <strong>{stale.length}</strong>
          <span>Changed lessons to refresh</span>
        </div>
      </div>
      <div className="pm-two">
        <section className="pm-panel">
          <h3>Your skill map</h3>
          {report.map((r) => (
            <div className="pm-skill" key={r.skill}>
              <div>
                <strong>{r.skill}</strong>
                <span>
                  {r.learned} / {r.total} retained
                </span>
              </div>
              <Progress
                value={r.percent}
                aria-label={`${r.skill}: ${r.percent}%`}
              />
            </div>
          ))}
        </section>
        <section className="pm-panel">
          <h3>Make room for learning.</h3>
          <Choice
            label="Weekly practice goal"
            value={
              learning.state.goal ? `${learning.state.goal} days` : 'No goal'
            }
            options={['No goal', '2 days', '3 days', '5 days', '7 days']}
            onChange={(v) =>
              void learning.submit({
                action: 'goal',
                goal: v === 'No goal' ? 0 : Number(v[0]),
              })
            }
          />
          <p>
            {days} practice day{days === 1 ? '' : 's'} this week
            {learning.state.goal ? ` · target ${learning.state.goal}` : ''}.
            Week starts Monday, UTC.
          </p>
          <p className="pm-muted">
            Choose a pace that works. No lost streaks, penalties, or pressure to
            keep scrolling.
          </p>
          <h4>Partner practice challenge</h4>
          <p>
            Invite a teammate to choose one product. Each explains it in 20
            seconds, then checks one statement against its source. Discuss one
            thing you would change.
          </p>
          <small>
            Optional offline activity. Team participation is not tracked.
          </small>
        </section>
      </div>
      <section className="pm-panel">
        <h3>Next reviews</h3>
        {next.map((c) => {
          const r = learning.state.records[c.id];
          return (
            <button
              key={c.id}
              className="pm-review-row"
              onClick={() => onReview(c)}
            >
              <span>
                <strong>{c.title}</strong>
                <small>
                  {productName(
                    dossiers.find((d) => d.productId === c.productId)!,
                  )}
                </small>
              </span>
              <span>
                {r?.version !== c.version && r
                  ? 'Product record changed'
                  : !r
                    ? 'New lesson'
                    : Date.parse(r.dueAt) <= now
                      ? 'Ready to review'
                      : `Due ${new Date(r.dueAt).toLocaleDateString()}`}
              </span>
              <ArrowRight size={16} />
            </button>
          );
        })}
      </section>
    </>
  );
}
function PendingProductRoom({
  product,
  onBack,
}: {
  product: Product;
  onBack: () => void;
}) {
  const [answer, setAnswer] = useState<IntelligenceAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <section className="pm-panel">
      <button className="text-link" onClick={onBack}>
        <ChevronLeft size={16} />
        All product rooms
      </button>
      <h2>{product.name}</h2>
      <p>{product.descriptor}</p>
      <div className="pm-callout">
        <h3>This product’s learning dossier needs completion.</h3>
        <p>
          Its catalog entry remains available. Formula quizzes and mastery
          unlock when the source-backed Product Brain dossier is supplied.
        </p>
      </div>
      <button
        className="gold-button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError('');
          const result = await askCassius(
            `What source-backed information is available for ${product.name}, exact product ID ${product.id}? Distinguish captured website statements from verified facts and identify missing formula information. Do not infer ingredients or doses.`,
          );
          setBusy(false);
          if (result.state === 'ready') setAnswer(result.data);
          else setError(result.message);
        }}
      >
        {busy ? 'Checking sources…' : 'Ask Cassius about available information'}
        <Sparkles size={16} />
      </button>
      <output>{error}</output>
      {answer && <AnswerView answer={answer} />}
    </section>
  );
}
export function ProductMastery() {
  const [now] = useState(Date.now);
  const learning = useLearning();
  const [view, setView] = useState<Destination>('Today');
  const [productId, setProductId] = useState(
    dossiers.find((d) => d.supplement?.rows.length)?.productId ??
      dossiers[0].productId,
  );
  const [role, setRole] = useState<string>(roles[0]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All products');
  const [room, setRoom] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [review, setReview] = useState<Card | null>(null);
  const [missionId, setMissionId] = useState(0);
  const d = dossiers.find((p) => p.productId === productId)!;
  const filtered = dossiers.filter(
    (p) =>
      `${productName(p)} ${p.sections.identity.category.value} ${p.ingredients.map((i) => i.fields.name.value).join(' ')}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (category === 'All products' ||
        (category === 'Supplements' && p.supplement) ||
        (category === 'Grooming' && !p.supplement)),
  );
  const pendingFiltered = pendingProducts.filter(
    (p) =>
      `${p.name} ${p.descriptor}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (category === 'All products' || category === 'Grooming'),
  );
  const ready = allCards.filter((c) => {
    const r = learning.state.records[c.id];
    return r && (r.version !== c.version || Date.parse(r.dueAt) <= now);
  }).length;
  function navigate(next: Destination) {
    setView(next);
    setReview(null);
    if (next === 'Product rooms') {
      setRoom(false);
      setPendingProduct(null);
    }
  }
  return (
    <div className="product-studio pm-studio">
      <header className="pm-hero">
        <div>
          <span className="eyebrow gold">THE GGC PRODUCT EXPERIENCE</span>
          <h2>
            Know the product.
            <br />
            <em>Earn the confidence.</em>
          </h2>
          <p>
            Your product rooms, personal coach and practice ground. Build
            understanding you can bring to every conversation.
          </p>
        </div>
        <div className="pm-hero-stat">
          <div className="pm-orbit">
            <Layers3 size={38} />
          </div>
          <strong>{dossiers.length + pendingProducts.length}</strong>
          <span>products to explore</span>
          <small>{ready} reviews ready when you are</small>
        </div>
      </header>
      <nav className="pm-nav" aria-label="Product experience">
        {views.map((v) => (
          <button
            key={v}
            aria-current={view === v ? 'page' : undefined}
            onClick={() => navigate(v)}
          >
            {v}
          </button>
        ))}
      </nav>
      <div className="pm-account" aria-live="polite">
        <span
          className={`pm-dot ${learning.mode === 'account' ? 'pm-connected' : ''}`}
        />
        <span>{learning.message}</span>
        <button
          className="text-link"
          disabled={learning.busy || learning.mode === 'loading'}
          onClick={() => void learning.reload()}
        >
          Reload progress
        </button>
        {learning.mode === 'session' && (
          <Link className="text-link" href="/membership">
            Member access <ArrowUpRight size={12} />
          </Link>
        )}
      </div>
      <div className="pm-context">
        <Choice
          label="Learning product"
          value={productName(d)}
          options={dossiers.map(productName)}
          onChange={(v) => {
            setProductId(dossiers.find((p) => productName(p) === v)!.productId);
            setReview(null);
            setMissionId(missionId + 1);
          }}
        />
        <Choice
          label="Your world"
          value={role}
          options={[...roles]}
          onChange={setRole}
        />
      </div>
      <section className="pm-content" aria-label="Product workspace">
        {review ? (
          <>
            <button className="text-link" onClick={() => setReview(null)}>
              <ChevronLeft size={16} />
              Back to mastery
            </button>
            <Exercise
              key={review.id}
              card={review}
              learning={learning}
              onNext={() => setReview(null)}
            />
          </>
        ) : view === 'Today' ? (
          learning.mode === 'loading' ? (
            <output>Loading your next mission…</output>
          ) : (
            <DailyMission
              key={`${d.productId}-${missionId}`}
              d={d}
              learning={learning}
              role={role}
              onPractice={() => navigate('Sales Lab')}
            />
          )
        ) : view === 'Product rooms' ? (
          pendingProduct ? (
            <PendingProductRoom
              key={pendingProduct.id}
              product={pendingProduct}
              onBack={() => setPendingProduct(null)}
            />
          ) : room ? (
            <>
              <button className="text-link" onClick={() => setRoom(false)}>
                <ChevronLeft size={16} />
                All product rooms
              </button>
              <ProductRoom
                key={d.productId}
                d={d}
                learning={learning}
                role={role}
                onLearn={() => {
                  setMissionId(missionId + 1);
                  navigate('Today');
                }}
                onPractice={() => navigate('Sales Lab')}
                onCustomer={() => navigate('Customer mode')}
              />
            </>
          ) : (
            <>
              <div className="pm-section-header">
                <div>
                  <span className="eyebrow gold">
                    THE COLLECTION, UNDERSTOOD
                  </span>
                  <h2>Find your next deep dive.</h2>
                </div>
                <span>
                  {filtered.length + pendingFiltered.length} product records
                </span>
              </div>
              <div className="pm-two">
                <label className="field">
                  Search products or ingredients
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Try magnesium, hydration, or a product name"
                  />
                </label>
                <Choice
                  label="Collection"
                  value={category}
                  options={['All products', 'Supplements', 'Grooming']}
                  onChange={setCategory}
                />
              </div>
              <div className="pm-vault">
                {filtered.map((p, i) => {
                  const progress = mastery(learning.state, cardsFor(p));
                  const retained = progress.reduce((n, r) => n + r.learned, 0);
                  return (
                    <button
                      key={p.productId}
                      className="pm-product"
                      onClick={() => {
                        setProductId(p.productId);
                        setRoom(true);
                      }}
                    >
                      <div className="pm-product-top">
                        <span>GGC / {String(i + 1).padStart(2, '0')}</span>
                        <ArrowUpRight size={19} />
                      </div>
                      <div className="pm-product-symbol">
                        <FlaskConical size={36} />
                      </div>
                      <span className="pm-muted">
                        {p.sections.identity.category.value ??
                          'Category unknown'}{' '}
                        · Revision {p.revision}
                      </span>
                      <h3>{productName(p)}</h3>
                      <p>
                        {p.supplement?.rows.length
                          ? `${p.supplement.rows.length} label rows to explore`
                          : 'Formula coverage is incomplete'}
                      </p>
                      <div className="pm-product-footer">
                        <span>{retained} lessons retained</span>
                        <span>
                          Enter room <ArrowRight size={15} />
                        </span>
                      </div>
                    </button>
                  );
                })}
                {pendingFiltered.map((p) => (
                  <button
                    key={p.id}
                    className="pm-product"
                    onClick={() => setPendingProduct(p)}
                  >
                    <div className="pm-product-top">
                      <span>GGC / CATALOG</span>
                      <ArrowUpRight size={19} />
                    </div>
                    <div className="pm-product-symbol">
                      <Layers3 size={36} />
                    </div>
                    <h3>{p.name}</h3>
                    <p>Product dossier needs completion</p>
                    <div className="pm-product-footer">
                      <span>Explore available context</span>
                      <ArrowRight size={15} />
                    </div>
                  </button>
                ))}
              </div>
              {!filtered.length && !pendingFiltered.length && (
                <p>
                  No matching products. Try a different ingredient or
                  collection.
                </p>
              )}
              <p className="pm-muted">
                Captured website information remains awaiting review. An
                unavailable product page does not establish a formula.
              </p>
            </>
          )
        ) : view === 'Sales Lab' ? (
          <SalesLab
            key={`${d.productId}-${role}`}
            d={d}
            learning={learning}
            role={role}
          />
        ) : view === 'Customer mode' ? (
          <CustomerMode key={d.productId} d={d} />
        ) : (
          <MasteryPanel learning={learning} onReview={setReview} />
        )}
      </section>
      <footer className="pm-footer">
        <ShieldCheck size={16} />
        <span>
          Built on the GGC Product Brain. Sources stay visible. Unknowns stay
          unknown.
        </span>
      </footer>
    </div>
  );
}
