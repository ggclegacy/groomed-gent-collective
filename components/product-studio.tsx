'use client';
import {
  getDossier,
  productCoverage,
  productBrain,
} from '@/lib/product-brain/runtime';
import { useState, useSyncExternalStore } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronLeft,
  FlaskConical,
  Layers3,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Choice } from '@/components/workspaces';
import { Progress } from '@/components/ui/progress';
import {
  knowledge,
  categories,
  roles,
  roomSections,
  scenarios,
  dailyLesson,
  approvedFacts,
  contentBrief,
  isVerified,
  prepareAtlas,
  practiceReport,
  readProgress,
  recommend,
  type Category,
  type Ingredient,
  type Product,
  type Role,
  type RoomSection,
  type LearningProgress,
} from '@/lib/product-knowledge';
const destinations = [
  'Product Vault',
  'Sales Lab',
  'Recommend',
  'Matchups',
  'Academy',
  'Claims & Evidence',
] as const;
type Destination = (typeof destinations)[number];
function Evidence({ ids }: { ids: string[] }) {
  return (
    <details className="ps-evidence">
      <summary>
        View evidence · {ids.length} source{ids.length === 1 ? '' : 's'}
      </summary>
      {ids.length ? (
        ids.map((id) => {
          const source = knowledge.sources.find((s) => s.id === id);
          return (
            <div key={id}>
              <strong>{source?.title ?? 'Source unavailable'}</strong>
              <p>
                {source?.locator ?? 'This record cannot support an answer.'}
              </p>
              <small>
                {source?.status ?? 'unavailable'} · Last verified:{' '}
                {source?.lastVerifiedAt ?? 'Not verified'}
              </small>
            </div>
          );
        })
      ) : (
        <p>No supporting sources are published.</p>
      )}
    </details>
  );
}
function Pending({
  title = 'Awaiting verified knowledge',
  children,
}: {
  title?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="ps-pending">
      <ShieldCheck size={21} />
      <div>
        <h3>{title}</h3>
        <p>
          {children ??
            'The founder-approved product record will unlock this section. No product facts have been inferred.'}
        </p>
      </div>
    </div>
  );
}
function IngredientCard({
  ingredient,
  ask,
}: {
  ingredient: Ingredient | null;
  ask: (q: string) => void;
}) {
  return (
    <article className="ps-glass ps-ingredient">
      <span className="eyebrow gold">INGREDIENT INTELLIGENCE</span>
      <h3>{ingredient?.name ?? 'Inside the formula'}</h3>
      <p>
        {ingredient
          ? 'Learn the ingredient in the context of this formula.'
          : 'No ingredient list has been supplied. This learning structure is ready for a verified formula.'}
      </p>
      {[
        ['What it is', ingredient?.whatItIs?.text],
        ['Why GGC uses it', ingredient?.purpose?.text],
        [
          'Evidence & science',
          ingredient?.evidence.map((f) => f.text).join(' '),
        ],
        ['Synergies', ingredient?.synergies.map((f) => f.text).join(' ')],
        [
          'Ambassador takeaways',
          ingredient?.takeaways.map((f) => f.text).join(' '),
        ],
        ['Customer-friendly explanation', ingredient?.simpleExplanation?.text],
        ['Deep dive', ingredient?.deepDive?.text],
      ].map(([label, value]) => (
        <details key={label}>
          <summary>{label}</summary>
          <p>{value || 'Awaiting source-backed ingredient information.'}</p>
        </details>
      ))}
      <div className="ps-chips">
        {[
          'Teach Me',
          'Explain Simply',
          'Explain for My Role',
          'Deep Dive',
          'Quiz Me',
        ].map((action) => (
          <button
            key={action}
            onClick={() =>
              ask(
                `${action}: ${ingredient?.name ?? 'the ingredient list, once verified'}`,
              )
            }
          >
            {action}
            <ArrowUpRight size={14} />
          </button>
        ))}
      </div>
      <Evidence ids={ingredient?.sourceIds ?? []} />
    </article>
  );
}
function ContentPanel({ product, role }: { product: Product; role: Role }) {
  const [format, setFormat] = useState('Instagram Story');
  const [relationship, setRelationship] = useState('Commission relationship');
  const [brief, setBrief] = useState('');
  const [message, setMessage] = useState('');
  const reset = () => {
    setBrief('');
    setMessage('');
  };
  return (
    <div>
      <h3>Create with {product.name}</h3>
      <p>
        Prepare a product-aware brief. Published claims and disclosure guidance
        must be supplied before it becomes customer-ready content.
      </p>
      <div className="ps-two">
        <Choice
          label="Format"
          value={format}
          options={[
            'Instagram Story',
            'Reel concept',
            'TikTok script',
            'Caption',
            'Product Photo Concept',
            'Role-specific conversation',
            'Customer DM',
            'Comparison Graphic',
          ]}
          onChange={(v) => {
            setFormat(v);
            reset();
          }}
        />
        <Choice
          label="Your brand relationship"
          value={relationship}
          options={[
            'Commission relationship',
            'Gifted product',
            'Discounted product',
            'Employee / owner',
            'Other / needs review',
          ]}
          onChange={(v) => {
            setRelationship(v);
            reset();
          }}
        />
      </div>
      <button
        className="gold-button"
        onClick={() =>
          setBrief(contentBrief(product, format, role, relationship))
        }
      >
        Prepare editorial brief <ArrowRight size={16} />
      </button>
      {brief && (
        <div className="ps-result">
          <label className="field">
            Product-aware brief
            <textarea rows={12} readOnly value={brief} />
          </label>
          <button
            className="outline-button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(brief);
                setMessage('Editorial brief copied. Review is still required.');
              } catch {
                setMessage('Select and copy the brief manually.');
              }
            }}
          >
            Copy brief
          </button>
          <output className="form-status">{message}</output>
          <a className="text-link" href="#studio">
            Open Creator Studio <ArrowUpRight size={16} />
          </a>
        </div>
      )}
    </div>
  );
}
function ProductRoom({
  product,
  role,
  close,
  ask,
}: {
  product: Product;
  role: Role;
  close: () => void;
  ask: (q: string) => void;
}) {
  const [section, setSection] = useState<RoomSection>('What It Is');
  const facts = approvedFacts(product, knowledge).filter((f) =>
    product.facts[section]?.some((v) => v.id === f.id),
  );
  const ingredients =
    product.formula?.ingredients
      .map((i) => knowledge.ingredients.find((v) => v.id === i.ingredientId))
      .filter((i): i is Ingredient => Boolean(i && isVerified(i, knowledge))) ??
    [];
  return (
    <section className="ps-room">
      <button className="text-link" onClick={close}>
        <ChevronLeft size={16} />
        Back to the vault
      </button>
      <div className="ps-room-heading">
        <div>
          <span className="eyebrow gold">
            PRODUCT ROOM /{' '}
            {product.concept ? 'CONCEPT RECORD' : product.status.toUpperCase()}
          </span>
          <h2>{product.name}</h2>
          <p>{product.descriptor}</p>
        </div>
        <span className="ps-stamp">
          {product.version}
          <br />
          Last verified: {product.lastVerifiedAt ?? 'Pending'}
        </span>
      </div>
      <div className="ps-room-layout">
        <nav aria-label="Product room sections" className="ps-room-nav">
          {roomSections.map((name, i) => (
            <button
              key={name}
              aria-pressed={section === name}
              onClick={() => setSection(name)}
            >
              <span>{String(i + 1).padStart(2, '0')}</span>
              {name}
            </button>
          ))}
        </nav>
        <div className="ps-glass ps-room-body">
          <span className="eyebrow gold">{product.name} / KNOWLEDGE</span>
          <h3>{section}</h3>
          {section === "What's Inside" ? (
            ingredients.length ? (
              ingredients.map((i) => (
                <IngredientCard key={i.id} ingredient={i} ask={ask} />
              ))
            ) : (
              <IngredientCard ingredient={null} ask={ask} />
            )
          ) : section === 'Content Studio' ? (
            <ContentPanel
              key={`${product.id}-${role}`}
              product={product}
              role={role}
            />
          ) : section === 'Ask Atlas' ? (
            <>
              <p>
                Atlas stays with this product and your role. Every future answer
                must trace back to a current, approved source.
              </p>
              <button
                className="gold-button"
                onClick={() =>
                  ask(`Help me understand ${product.name} as a ${role}.`)
                }
              >
                Ask about this product <Sparkles size={16} />
              </button>
            </>
          ) : section === 'Science & Sources' ? (
            <>
              <Pending title="Evidence before explanation">
                The planning brief establishes a concept, not a formula or
                scientific claim. Manufacturer documentation and reviewed
                evidence are still needed.
              </Pending>
              <Evidence ids={product.sourceIds} />
            </>
          ) : section === 'Compare' ? (
            <>
              <Pending title="Build a fair comparison">
                Formula philosophy, ingredients, customer fit and price
                rationale need verified records on both sides. No competitor
                claims are supplied.
              </Pending>
              <button
                className="text-link"
                onClick={() =>
                  document
                    .getElementById('product-matchups')
                    ?.scrollIntoView({ block: 'start' })
                }
              >
                Use Product Matchups below <ArrowRight size={16} />
              </button>
            </>
          ) : section === 'Objection Handling' ? (
            <>
              <p>
                Start by understanding the concern. Ask what matters most,
                confirm what is known, and leave room for a no.
              </p>
              <Pending title="Product-specific responses pending" />
              <button
                className="outline-button"
                onClick={() =>
                  ask(
                    `Help me respond to a customer objection about ${product.name} without unsupported claims.`,
                  )
                }
              >
                Prepare an Atlas question
              </button>
            </>
          ) : facts.length ? (
            facts.map((f) => (
              <div key={f.id}>
                <p>{f.text}</p>
                <Evidence ids={f.sourceIds} />
              </div>
            ))
          ) : (
            <Pending title={`${section} · not yet verified`}>
              This concept has no approved {section.toLowerCase()} details. The
              current specification and founder review are required before this
              information can be taught as fact.
            </Pending>
          )}
        </div>
      </div>
    </section>
  );
}
function SalesLab({ product, role }: { product: Product; role: Role }) {
  const [difficulty, setDifficulty] = useState('Considered');
  const [customer, setCustomer] = useState('Curious newcomer');
  const [started, setStarted] = useState(false);
  const [responses, setResponses] = useState<string[]>([]);
  const [response, setResponse] = useState('');
  const [report, setReport] = useState(false);
  const prompts = [
    scenarios[role] +
      ` ${customer === 'Gift shopper' ? '“I’m choosing a gift. Where should I start?”' : customer === 'Skeptical customer' ? '“Why should I consider changing what I already use?”' : '“What would you want to know before recommending something?”'}`,
    difficulty === 'Challenging'
      ? '“That still sounds like a sales pitch. What can you actually verify?”'
      : '“How do I know whether this fits my routine and budget?”',
    '“What would you check before I make a decision?”',
  ];
  function retry() {
    setStarted(false);
    setResponses([]);
    setResponse('');
    setReport(false);
  }
  return (
    <section className="ps-glass ps-workbench">
      <span className="eyebrow gold">SALES LAB / PRACTICE WITH INTENTION</span>
      <h2>A conversation. Not a script.</h2>
      <p>{scenarios[role]}</p>
      <div className="ps-two">
        <Choice
          label="Customer"
          value={customer}
          options={['Curious newcomer', 'Skeptical customer', 'Gift shopper']}
          onChange={(v) => {
            setCustomer(v);
            retry();
          }}
        />
        <Choice
          label="Difficulty"
          value={difficulty}
          options={['Considered', 'Challenging']}
          onChange={(v) => {
            setDifficulty(v);
            retry();
          }}
        />
      </div>
      <p className="ps-meta">
        {product.name} · {role} · Guided local exercise. AI simulation and
        scoring are not connected.
      </p>
      {!started ? (
        <button className="gold-button" onClick={() => setStarted(true)}>
          Start practice <ArrowRight size={16} />
        </button>
      ) : (
        <>
          {responses.map((r, i) => (
            <div className="ps-transcript" key={i}>
              <p>
                <strong>Customer</strong> {prompts[i]}
              </p>
              <p>
                <strong>You</strong> {r}
              </p>
            </div>
          ))}
          {!report ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!response.trim()) return;
                setResponses([...responses, response.trim()]);
                setResponse('');
                if (responses.length === 2) setReport(true);
              }}
            >
              <blockquote>{prompts[responses.length]}</blockquote>
              <label className="field">
                Your response
                <textarea
                  rows={4}
                  maxLength={2000}
                  required
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Respond naturally. Ask, listen, then verify."
                />
              </label>
              <button className="gold-button" disabled={!response.trim()}>
                {responses.length === 2
                  ? 'Review session'
                  : 'Continue conversation'}{' '}
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <div className="ps-result">
              <h3>Session report</h3>
              <p>
                Reflection prompts, not AI grades. This session does not award
                certification.
              </p>
              {practiceReport(responses).map((item) => (
                <div className="ps-report-row" key={item.name}>
                  <strong>{item.name}</strong>
                  <p>{item.finding}</p>
                </div>
              ))}
              <button className="gold-button" onClick={retry}>
                Practice again <ArrowRight size={16} />
              </button>
            </div>
          )}
          <button className="text-link ps-spaced" onClick={retry}>
            Reset session
          </button>
        </>
      )}
    </section>
  );
}
function Recommendation({ open }: { open: (p: Product) => void }) {
  const [category, setCategory] = useState<Category>('Beard');
  const [budget, setBudget] = useState('');
  const [context, setContext] = useState('');
  const [gifting, setGifting] = useState('Personal routine');
  const [result, setResult] = useState<Product[] | null>(null);
  return (
    <section className="ps-glass ps-workbench">
      <span className="eyebrow gold">RECOMMENDATION DESK</span>
      <h2>Start with their world.</h2>
      <p>
        Discover the need, then check the fit against verified product
        knowledge.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setResult(
            recommend(
              knowledge,
              category,
              budget ? Number(budget) : null,
              'USD',
            ),
          );
        }}
      >
        <div className="ps-two">
          <Choice
            label="Area of interest"
            value={category}
            options={[...categories]}
            onChange={(v) => {
              setCategory(v as Category);
              setResult(null);
            }}
          />
          <Choice
            label="Use case"
            value={gifting}
            options={[
              'Personal routine',
              'Gifting',
              'Travel',
              'Exploring a change',
            ]}
            onChange={(v) => {
              setGifting(v);
              setResult(null);
            }}
          />
        </div>
        <label className="field">
          Budget in USD · optional
          <input
            type="number"
            min="0"
            max="100000"
            step="0.01"
            value={budget}
            onChange={(e) => {
              setBudget(e.target.value);
              setResult(null);
            }}
            placeholder="No budget specified"
          />
        </label>
        <label className="field">
          Customer context
          <textarea
            rows={3}
            maxLength={2000}
            value={context}
            onChange={(e) => {
              setContext(e.target.value);
              setResult(null);
            }}
            placeholder="Routine, preferences, what matters to them. Avoid identifying or sensitive details."
          />
        </label>
        <button className="gold-button">
          Check available knowledge <ArrowRight size={16} />
        </button>
      </form>
      {result && (
        <div className="ps-result">
          <h3>
            {result.length
              ? 'Products to explore'
              : 'No verified recommendation available'}
          </h3>
          <p>
            {gifting} · {category}
            {budget ? ` · Up to $${budget}` : ''}
          </p>
          {result.length ? (
            result.map((p) => (
              <button
                className="outline-button"
                key={p.id}
                onClick={() => open(p)}
              >
                {p.name}
              </button>
            ))
          ) : (
            <p>
              The current catalog contains concept records only. Confirm product
              suitability{budget ? ' and current pricing' : ''} before
              recommending. Customer context is held in this view; AI
              interpretation is not connected.
            </p>
          )}
          <strong>Useful next question</strong>
          <p>
            {gifting === 'Gifting'
              ? 'What do you know about the recipient’s routine and preferences?'
              : 'What are they using now, and what would they like to change?'}
          </p>
        </div>
      )}
    </section>
  );
}
function Matchups() {
  const [left, setLeft] = useState(knowledge.products[0].name);
  const [right, setRight] = useState(knowledge.products[1].name);
  return (
    <section id="product-matchups" className="ps-glass ps-workbench">
      <span className="eyebrow gold">PRODUCT MATCHUPS</span>
      <h2>Understand the distinction.</h2>
      <p>
        Compare the records, with equal standards of evidence on both sides.
      </p>
      <div className="ps-two">
        <Choice
          label="First product"
          value={left}
          options={knowledge.products.map((p) => p.name)}
          onChange={setLeft}
        />
        <Choice
          label="Second product"
          value={right}
          options={knowledge.products.map((p) => p.name)}
          onChange={setRight}
        />
      </div>
      {left === right ? (
        <Pending title="Choose two different products">
          Select another record to compare.
        </Pending>
      ) : (
        <div className="ps-table-wrap">
          <table>
            <caption>Concept records · no verified comparison claims</caption>
            <thead>
              <tr>
                <th scope="col">Dimension</th>
                <th scope="col">{left}</th>
                <th scope="col">{right}</th>
              </tr>
            </thead>
            <tbody>
              {[
                'Formula philosophy',
                'Ingredients',
                'Use case',
                'Positioning',
                'Customer fit',
                'Price rationale',
              ].map((label) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  <td>Not verified</td>
                  <td>Not verified</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="ps-meta">
        Competitor comparisons require dated, attributable sources. No
        superiority or competitor-quality claims are seeded.
      </p>
    </section>
  );
}
function subscribeLearning(notify: () => void) {
  window.addEventListener('storage', notify);
  window.addEventListener('ggc-learning-save', notify);
  return () => {
    window.removeEventListener('storage', notify);
    window.removeEventListener('ggc-learning-save', notify);
  };
}
function learningSnapshot() {
  try {
    return localStorage.getItem('ggc.product-learning.v1') ?? '';
  } catch {
    return 'unavailable';
  }
}
function Academy() {
  const [answers, setAnswers] = useState<number[]>([]);
  const [message, setMessage] = useState('');
  const raw = useSyncExternalStore(
    subscribeLearning,
    learningSnapshot,
    () => '',
  );
  let progress: LearningProgress | null = null;
  try {
    progress = readProgress(raw || null);
  } catch {
    /* Keep unreadable storage intact. */
  }
  const complete = Boolean(
    progress?.completions.some(
      (c) => c.id === dailyLesson.id && c.lessonVersion === dailyLesson.version,
    ),
  );
  function finish() {
    if (!dailyLesson.questions.every((q, i) => answers[i] === q.answer)) {
      setMessage(
        'Review the lesson and try again. Choose source verification, distinguish ingredient evidence from product evidence, and confirm current prices.',
      );
      return;
    }
    if (!progress) {
      setMessage('Lesson passed. Progress could not be saved on this device.');
      return;
    }
    try {
      const date = new Date();
      const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const latest = readProgress(
        localStorage.getItem('ggc.product-learning.v1'),
      );
      const next = {
        ...latest,
        completions: [
          ...latest.completions.filter((c) => c.id !== dailyLesson.id),
          {
            id: dailyLesson.id,
            lessonVersion: dailyLesson.version,
            date: today,
          },
        ],
      };
      localStorage.setItem('ggc.product-learning.v1', JSON.stringify(next));
      window.dispatchEvent(new Event('ggc-learning-save'));
      setMessage(
        'Foundation practice completed and saved on this device. This is not product certification.',
      );
    } catch {
      setMessage(
        'Lesson passed, but saving failed. Existing progress was not changed.',
      );
    }
  }
  return (
    <div className="ps-academy">
      <section className="ps-glass ps-workbench">
        <span className="eyebrow gold">
          DAILY BRIEF / 3 MINUTES / EDITORIAL PRACTICE
        </span>
        <h2>{dailyLesson.title}</h2>
        {!progress && (
          <Pending title="Progress unavailable">
            Saved progress could not be read. You can practice; existing data
            will not be overwritten.
          </Pending>
        )}
        <p>{dailyLesson.lesson}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            finish();
          }}
        >
          {dailyLesson.questions.map((q, i) => (
            <fieldset className="ps-question" key={q.question}>
              <legend>
                {i + 1}. {q.question}
              </legend>
              {q.options.map((option, j) => (
                <label key={option}>
                  <input
                    type="radio"
                    name={`q-${i}`}
                    checked={answers[i] === j}
                    onChange={() => {
                      const next = [...answers];
                      next[i] = j;
                      setAnswers(next);
                      setMessage('');
                    }}
                  />
                  {option}
                </label>
              ))}
            </fieldset>
          ))}
          <button
            className="gold-button"
            disabled={dailyLesson.questions.some(
              (_, i) => answers[i] === undefined,
            )}
          >
            {complete ? 'Review again' : 'Complete brief'}
            <Check size={16} />
          </button>
          <output className="form-status">{message}</output>
        </form>
      </section>
      <section className="ps-glass ps-workbench">
        <span className="eyebrow gold">PRODUCT MASTERY</span>
        <h2>Depth earns authority.</h2>
        <ol className="ps-progression">
          {[
            'Foundation',
            'Product Certified',
            'Product Specialist',
            'Groomed Gent Authority',
          ].map((stage, i) => (
            <li key={stage}>
              <span>0{i + 1}</span>
              <div>
                <h3>{stage}</h3>
                <p>
                  {i === 0
                    ? `${complete ? '1 / 1' : '0 / 1'} editorial practice brief completed. Founder-reviewed curriculum pending.`
                    : 'Locked · approved curriculum and assessed mastery required.'}
                </p>
              </div>
            </li>
          ))}
        </ol>
        {knowledge.products.map((p) => (
          <div className="ps-mastery" key={p.id}>
            <strong>{p.name}</strong>
            <span>Not assessed</span>
            <Progress value={0} aria-label={`${p.name}: not assessed`} />
          </div>
        ))}
        <p className="ps-meta">
          Progress stays on this device. Certification, account sync and product
          assessments are not active.
        </p>
      </section>
    </div>
  );
}
function Policy() {
  return (
    <section className="ps-glass ps-workbench">
      <span className="eyebrow gold">CLAIMS & EVIDENCE</span>
      <h2>Confidence has a foundation.</h2>
      <p>
        These are workflow categories, not regulatory approvals. No claim
        language or disclosure policy is published yet.
      </p>
      <div className="ps-policy-grid">
        {[
          [
            'GREEN',
            'Approved language',
            'Exact wording reviewed for this product, source, version and channel.',
          ],
          [
            'GOLD',
            'Qualified language',
            'Requires its approved wording, qualification and permitted context together.',
          ],
          [
            'RED',
            'Prohibited language',
            'Excluded from customer-facing output and available to reviewers for prevention.',
          ],
        ].map(([tier, label, description]) => (
          <article key={tier} className={`ps-policy ps-${tier.toLowerCase()}`}>
            <span>{tier}</span>
            <h3>{label}</h3>
            <p>{description}</p>
            <small>0 published claims</small>
          </article>
        ))}
      </div>
      <Pending title="Endorsement guidance awaiting review">
        Content briefs record the ambassador’s relationship and channel.
        Founder-reviewed, jurisdiction-aware guidance is required before
        automatic disclosure assistance can publish wording.
      </Pending>
      <h3>Knowledge release</h3>
      <dl className="ps-record">
        <dt>Version</dt>
        <dd>{knowledge.version}</dd>
        <dt>Verified products</dt>
        <dd>
          {
            knowledge.products.filter((p) => approvedFacts(p, knowledge).length)
              .length
          }
        </dd>
        <dt>Verified ingredients</dt>
        <dd>{knowledge.ingredients.length}</dd>
        <dt>Last verified</dt>
        <dd>Pending founder review</dd>
        <dt>AI behavior</dt>
        <dd>Controlled sources · cite evidence · abstain when unsupported</dd>
      </dl>
      <Evidence ids={knowledge.sources.map((s) => s.id)} />
    </section>
  );
}
export function ProductStudio() {
  const [destination, setDestination] = useState<Destination>('Product Vault');
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [product, setProduct] = useState(knowledge.products[0]);
  const [room, setRoom] = useState(false);
  const [role, setRole] = useState<Role>('Everyday Ambassador');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<ReturnType<typeof prepareAtlas> | null>(
    null,
  );
  const [atlasOpen, setAtlasOpen] = useState(false);
  const filtered = knowledge.products.filter(
    (p) =>
      (category === 'All' || p.categories.includes(category as Category)) &&
      `${p.name} ${p.descriptor}`.toLowerCase().includes(search.toLowerCase()),
  );
  function open(p: Product) {
    setProduct(p);
    setRoom(true);
    setDestination('Product Vault');
    setAnswer(null);
  }
  function ask(q: string) {
    setQuestion(q);
    setAnswer(null);
    setAtlasOpen(true);
  }
  return (
    <div className="product-studio">
      {getDossier(product.id) && (
        <details className="ps-glass" style={{ padding: '1.25rem' }}>
          <summary>Product knowledge · {product.name}</summary>
          <p>
            Website statements remain unverified until reviewed. Conflicting
            details are marked disputed; missing information is unknown.
          </p>
          <p>
            {productCoverage(product.id)?.verified.length ?? 0} verified fields
            · {productCoverage(product.id)?.disputed.length ?? 0} disputed
            fields · {productCoverage(product.id)?.unknown.length ?? 0} unknown
            fields
          </p>
          {getDossier(product.id)!.supplement && (
            <details open>
              <summary>Supplement Facts and first-party evidence</summary>
              <p>
                Amounts below are per the stated label serving. “Unknown” means
                not disclosed. Website claims have not been approved for
                advertising.
              </p>
              <table>
                <caption>
                  {getDossier(product.id)!.supplement!.fields.servingSize
                    .value ?? 'Serving size unknown'}{' '}
                  ·{' '}
                  {getDossier(product.id)!.supplement!.fields
                    .servingsPerContainer.value ?? 'Unknown'}{' '}
                  servings per container
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Label ingredient / nutrient</th>
                    <th scope="col">Amount per serving</th>
                    <th scope="col">Daily Value</th>
                  </tr>
                </thead>
                <tbody>
                  {getDossier(product.id)!.supplement!.rows.map((row) => (
                    <tr key={row.id}>
                      <th scope="row">
                        {row.name.value}
                        {row.name.status === 'disputed' ? ' · disputed' : ''}
                      </th>
                      <td>
                        {row.amount.value ?? 'Unknown'}
                        {row.amount.status === 'disputed' ? ' · disputed' : ''}
                      </td>
                      <td>{row.dailyValue.value ?? 'Unknown / not shown'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {Object.entries(getDossier(product.id)!.supplement!.fields).map(
                ([name, field]) => (
                  <details key={name}>
                    <summary>
                      {name.replace(/([A-Z])/g, ' $1')} · {field.status}
                    </summary>
                    <p style={{ whiteSpace: 'pre-wrap' }}>
                      {field.value ?? 'Unknown: not disclosed.'}
                    </p>
                    {field.note && <p>{field.note}</p>}
                    {field.evidence.map((e, i) => {
                      const source = productBrain.products
                        .find((p) => p.dossier.productId === product.id)
                        ?.sources.find((s) => s.id === e.sourceId);
                      return source ? (
                        <p key={i}>
                          <a
                            href={source.locator}
                            target="_blank"
                            rel="noreferrer"
                          >
                            First-party source
                          </a>{' '}
                          · retrieved {source.capturedAt.slice(0, 10)} ·{' '}
                          {e.locator}
                        </p>
                      ) : null;
                    })}
                  </details>
                ),
              )}
              <details>
                <summary>
                  Every listed ingredient and undisclosed amounts
                </summary>
                <ul>
                  {getDossier(product.id)!.ingredients.map((row) => (
                    <li key={row.id}>
                      {row.fields.name.value} ·{' '}
                      {row.fields.concentration.value ?? 'Amount unknown'}
                      {row.fields.name.note ? ' — ' + row.fields.name.note : ''}
                    </li>
                  ))}
                </ul>
              </details>
            </details>
          )}
          {Object.entries(getDossier(product.id)!.sections).map(
            ([section, fields]) => (
              <details key={section}>
                <summary>{section}</summary>
                <dl>
                  {Object.entries(fields).map(([name, field]) => (
                    <div key={name}>
                      <dt>
                        {name} · {field.status}
                      </dt>
                      <dd>
                        {field.value ?? 'Not supplied'}
                        {field.note ? ` — ${field.note}` : ''}
                      </dd>
                    </div>
                  ))}
                </dl>
              </details>
            ),
          )}
        </details>
      )}
      <div className="ps-intro">
        <div>
          <span className="eyebrow gold">THE PRODUCT INTELLIGENCE ATELIER</span>
          <h2>
            Know it deeply.
            <br />
            <em>Represent it well.</em>
          </h2>
          <p>
            Review product evidence, build your knowledge, and prepare informed
            recommendations.
          </p>
        </div>
        <button
          className="ps-daily ps-glass"
          onClick={() => {
            setDestination('Academy');
            setRoom(false);
          }}
        >
          <BookOpen size={23} />
          <span>
            <small>TODAY’S 3-MINUTE BRIEF</small>
            <strong>Confidence starts with a source.</strong>
            <span>
              Enter your daily practice <ArrowRight size={15} />
            </span>
          </span>
        </button>
      </div>
      <nav className="ps-destinations" aria-label="Product Studio navigation">
        {destinations.map((name) => (
          <button
            key={name}
            aria-pressed={destination === name}
            onClick={() => {
              setDestination(name);
              setRoom(false);
            }}
          >
            {name}
          </button>
        ))}
      </nav>
      <div className="ps-context">
        <Choice
          label="Your world"
          value={role}
          options={[...roles]}
          onChange={(v) => {
            setRole(v as Role);
            setAnswer(null);
          }}
        />
        <Choice
          label="Product context"
          value={product.name}
          options={knowledge.products.map((p) => p.name)}
          onChange={(v) => {
            setProduct(knowledge.products.find((p) => p.name === v)!);
            setAnswer(null);
          }}
        />
        <span className="ps-meta">
          <span className="ps-light" /> Concept collection · founder review
          pending
        </span>
      </div>
      <div className="ps-body">
        <div className="ps-primary">
          {destination === 'Product Vault' ? (
            room ? (
              <ProductRoom
                key={product.id}
                product={product}
                role={role}
                close={() => setRoom(false)}
                ask={ask}
              />
            ) : (
              <>
                <div className="ps-section-heading">
                  <div>
                    <span className="eyebrow gold">01 / PRODUCT VAULT</span>
                    <h2>The collection, understood.</h2>
                  </div>
                  <span className="ps-meta">
                    {filtered.length} of {knowledge.products.length} product and
                    concept records
                  </span>
                </div>
                <label className="field ps-search">
                  Search the vault
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Find a product or area of interest"
                  />
                </label>
                <div className="ps-chips" aria-label="Product categories">
                  {['All', ...categories].map((c) => (
                    <button
                      key={c}
                      aria-pressed={category === c}
                      onClick={() => setCategory(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div className="ps-vault">
                  {filtered.map((p, i) => (
                    <button
                      key={p.id}
                      className="ps-product"
                      onClick={() => open(p)}
                    >
                      <div className="ps-product-top">
                        <span>GGC / 0{i + 1}</span>
                        <ArrowUpRight size={19} />
                      </div>
                      <div className="ps-product-mark" aria-hidden="true">
                        <Layers3 size={48} strokeWidth={0.7} />
                        <span>
                          {p.name
                            .split(' ')
                            .map((w) => w[0])
                            .join('')}
                        </span>
                      </div>
                      <div className="ps-product-copy">
                        <span className="ps-meta">CONCEPT · NOT VERIFIED</span>
                        <h3>{p.name}</h3>
                        <p>{p.descriptor}</p>
                        <span className="ps-product-action">
                          Enter product room <ArrowRight size={17} />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                {!filtered.length && (
                  <Pending title="No matching products">
                    Try another category or search. Unpopulated categories
                    remain available for future verified products.
                  </Pending>
                )}
                <p className="ps-meta ps-spaced">
                  Names and category concepts come from the planning brief.
                  These are not final packaging, formulas, prices or approved
                  product claims.
                </p>
              </>
            )
          ) : destination === 'Sales Lab' ? (
            <SalesLab
              key={`${product.id}-${role}`}
              product={product}
              role={role}
            />
          ) : destination === 'Recommend' ? (
            <Recommendation open={open} />
          ) : destination === 'Matchups' ? (
            <Matchups />
          ) : destination === 'Academy' ? (
            <Academy />
          ) : (
            <Policy />
          )}
          {room && <Matchups />}
        </div>
        <aside
          className={`ps-atlas ps-glass ${atlasOpen ? 'ps-atlas-open' : ''}`}
          aria-label="Atlas Product Expert"
        >
          <button
            className="ps-atlas-toggle"
            aria-expanded={atlasOpen}
            onClick={() => setAtlasOpen(!atlasOpen)}
          >
            <Sparkles size={19} /> Atlas Product Expert{' '}
            <span>{atlasOpen ? '−' : '+'}</span>
          </button>
          <div className="ps-atlas-content">
            <div className="ps-atlas-orbit" aria-hidden="true">
              <Sparkles size={32} strokeWidth={1} />
            </div>
            <span className="eyebrow gold">ATLAS / PRODUCT EXPERT</span>
            <h3>Clarity, in context.</h3>
            <p>
              Your product. Your world.
              <br />
              Every answer accountable to a source.
            </p>
            <div className="ps-atlas-context">
              <strong>{product.name}</strong>
              <span>{role}</span>
              <small>AI not connected</small>
            </div>
            <div className="ps-prompts">
              {[
                'What is verified?',
                'Help me explain it simply.',
                'What should I check before recommending?',
              ].map((q) => (
                <button key={q} onClick={() => ask(q)}>
                  {q}
                  <ArrowUpRight size={14} />
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setAnswer(
                  prepareAtlas({
                    knowledgeVersion: knowledge.version,
                    policyVersion: knowledge.aiBehavior.policyVersion,
                    productId: product.id,
                    role,
                    intent: 'question',
                    question,
                    channel: 'conversation',
                  }),
                );
              }}
            >
              <label className="field">
                Ask about this product
                <textarea
                  rows={4}
                  maxLength={2000}
                  value={question}
                  onChange={(e) => {
                    setQuestion(e.target.value);
                    setAnswer(null);
                  }}
                  placeholder="Ingredients, objections, evidence…"
                />
              </label>
              <button className="gold-button" disabled={!question.trim()}>
                Check knowledge <ArrowRight size={16} />
              </button>
            </form>
            {answer && (
              <div className="ps-result">
                <output>{answer.message}</output>
                <Evidence ids={answer.sourceIds} />
              </div>
            )}
            <p className="ps-meta">
              Context is kept in this session. No question is sent to an AI
              provider.
            </p>
            <div className="ps-atlas-footer">
              <FlaskConical size={16} /> Evidence before inference
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
