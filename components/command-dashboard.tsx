'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  Aperture,
  BookOpen,
  Copy,
  Sparkles,
  ChartNoAxesCombined,
  RefreshCw,
  Target,
} from 'lucide-react';
import { parseProfile, storageKeys } from '@/lib/collective';
import type { Section } from '@/lib/collective';
import {
  bestMove,
  change,
  currency,
  periods,
  visiblePulse,
} from '@/lib/dashboard/model';
import type { Action, Dashboard, Period } from '@/lib/dashboard/model';
import { parseDashboard } from '@/lib/dashboard/validate';
import { sampleDashboard } from '@/lib/dashboard/sample';
export interface CommandHandoff {
  destination: Section;
  brief: string;
  productId?: string;
}
const subscribeHydration = () => () => {};
export function CommandDashboard(props: {
  onAction: (action: Action) => void;
}) {
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  return hydrated ? (
    <CommandDashboardEditor {...props} />
  ) : (
    <output className="command-skeleton">Preparing your command center…</output>
  );
}
function localValue(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function CommandDashboardEditor({
  onAction,
}: {
  onAction: (action: Action) => void;
}) {
  const [period, setPeriod] = useState<Period>('Month');
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [sample, setSample] = useState(false);
  const [name] = useState(
    () => parseProfile(localValue(storageKeys.profile))?.name ?? '',
  );
  const [personalGoal, setPersonalGoal] = useState<number | null>(() => {
    const value = Number(localValue('ggc.preview.dashboard-goal.v1'));
    return Number.isSafeInteger(value) && value > 0 && value <= 100000000
      ? value
      : null;
  });
  const [goalInput, setGoalInput] = useState(() =>
    personalGoal ? String(personalGoal / 100) : '',
  );
  const [goalMessage, setGoalMessage] = useState('');
  const [answer, setAnswer] = useState('');
  const [aiError, setAiError] = useState('');
  const [thinking, setThinking] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  function refresh() {
    setLoading(true);
    setError('');
    setAnswer('');
    setAiError('');
    setThinking(false);
    request.current?.abort();
    request.current = null;
  }
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 15000);
    fetch(`/api/dashboard?period=${period}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const result = parseDashboard(await response.json());
        if (!result || result.period !== period) throw new Error();
        if (active) setData(result);
      })
      .catch(() => {
        if (active)
          setError(
            'Your command center could not refresh. Your saved studio work is safe.',
          );
      })
      .finally(() => {
        clearTimeout(timeout);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [period, retry]);
  const dashboard = data && sample ? sampleDashboard(data, period) : data;
  const performance =
    dashboard?.performance.state === 'ready'
      ? dashboard.performance.data
      : null;
  const move = dashboard ? bestMove(dashboard) : null;
  const monthlyGoal = sample ? dashboard?.goal?.minorUnits : personalGoal;
  const earned = performance?.earnedCommission;
  const goalProgress =
    period === 'Month' && earned?.currency === 'USD' && monthlyGoal
      ? Math.min(100, Math.max(0, (earned.minorUnits / monthlyGoal) * 100))
      : null;
  async function findMove() {
    if (!dashboard || thinking) return;
    if (sample) {
      setAnswer(
        'This sample illustrates a product-led move. Switch to your dashboard to ask Cassius about the context currently available.',
      );
      return;
    }
    const controller = new AbortController();
    request.current?.abort();
    request.current = controller;
    setThinking(true);
    setAiError('');
    setAnswer('');
    const timeout = setTimeout(() => controller.abort(), 35000);
    try {
      const response = await fetch('/api/dashboard/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          question: `Find my best next growth move for Groomed Gent Collective. Period: ${period}. Explain why, what evidence is available, and one practical action. Use the server dashboard context and distinguish missing data from zero.`,
        }),
      });
      const raw = await response.json();
      if (!raw || typeof raw !== 'object')
        throw new Error('Cassius could not respond.');
      const result = raw as Record<string, unknown>;
      if (!response.ok)
        throw new Error(
          typeof result.error === 'string'
            ? result.error
            : 'Cassius could not respond. Try again.',
        );
      if (typeof result.text !== 'string' || !result.text.trim())
        throw new Error('Cassius could not respond. Try again.');
      if (request.current === controller) setAnswer(result.text);
    } catch (failure) {
      if (request.current === controller)
        setAiError(
          controller.signal.aborted
            ? 'Cassius took too long. Try again.'
            : failure instanceof Error
              ? failure.message
              : 'Cassius could not respond. Try again.',
        );
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) setThinking(false);
    }
  }
  return (
    <div className="command-dashboard">
      <header className="command-heading">
        <div>
          <span className="eyebrow gold">YOUR COMMAND CENTER</span>
          <h1>
            {name ? `Welcome back, ${name.split(' ')[0]}.` : 'Welcome, Gent.'}
          </h1>
          <p>
            {dashboard?.membership.label ?? 'The Collective'} <span> / </span>{' '}
            {sample
              ? 'Illustrative performance'
              : 'A considered view of your business'}
          </p>
        </div>
        <fieldset className="command-periods" aria-label="Performance period">
          {periods.map((value) => (
            <button
              key={value}
              aria-pressed={period === value}
              onClick={() => {
                if (value !== period) {
                  refresh();
                  setPeriod(value);
                }
              }}
            >
              {value}
            </button>
          ))}
        </fieldset>
      </header>
      <div className="command-data-status">
        <span>
          <i />
          {sample
            ? 'SAMPLE DATA · Not your earnings or account activity'
            : dashboard?.mode === 'live'
              ? 'ACCOUNT REPORTING'
              : 'PREVIEW · Commerce reporting awaiting connection'}
        </span>
        <button
          onClick={() => {
            setSample(!sample);
            setAnswer('');
            setAiError('');
            request.current?.abort();
            request.current = null;
            setThinking(false);
          }}
        >
          {sample ? 'Return to my dashboard' : 'Explore sample performance'}{' '}
          <ArrowUpRight size={14} />
        </button>
      </div>
      {loading ? (
        <output
          className="command-skeleton"
          aria-label="Loading command center"
        >
          <span>Preparing your command center…</span>
          <div />
          <div />
          <div />
        </output>
      ) : error ? (
        <div className="command-error" role="alert">
          <h2>A moment to reconnect.</h2>
          <p>{error}</p>
          <button
            className="gold-button"
            onClick={() => {
              refresh();
              setRetry((n) => n + 1);
            }}
          >
            Try again <RefreshCw size={16} />
          </button>
        </div>
      ) : (
        dashboard &&
        move && (
          <>
            <div className="command-primary">
              <section
                className="command-earnings"
                aria-labelledby="earnings-title"
              >
                <div className="command-section-label">
                  <h2 id="earnings-title">
                    {period === 'Month'
                      ? 'This month'
                      : period === 'Today'
                        ? 'Today'
                        : `Last ${period === '7D' ? '7' : '30'} days`}
                  </h2>
                  <span>PERFORMANCE / 01</span>
                </div>
                <p className="command-earnings-label">Commission earned</p>
                <div className="command-money">{currency(earned)}</div>
                <p className={`command-change ${earned ? 'has-value' : ''}`}>
                  {performance
                    ? change(earned ?? null, performance.previousEarnings)
                    : 'Your earnings will appear when reporting is connected.'}
                </p>
                <div className="command-balances">
                  <div>
                    <span>Available</span>
                    <strong>
                      {currency(performance?.availableCommission)}
                    </strong>
                  </div>
                  <div>
                    <span>Pending</span>
                    <strong>{currency(performance?.pendingCommission)}</strong>
                  </div>
                  <div>
                    <span>Next payout</span>
                    <strong>
                      {performance?.nextPayout
                        ? new Date(performance.nextPayout).toLocaleDateString(
                            'en-US',
                            { month: 'short', day: 'numeric', timeZone: 'UTC' },
                          )
                        : 'Not scheduled'}
                    </strong>
                  </div>
                </div>
                <dl className="command-metrics">
                  {[
                    ['Sales generated', currency(performance?.revenue)],
                    ['Orders', performance ? String(performance.orders) : '—'],
                    [
                      'Conversion',
                      performance?.conversionRate != null
                        ? `${(performance.conversionRate * 100).toFixed(1)}%`
                        : '—',
                    ],
                    [
                      'Avg. order',
                      performance && performance.orders > 0
                        ? currency({
                            ...performance.revenue,
                            minorUnits: Math.round(
                              performance.revenue.minorUnits /
                                performance.orders,
                            ),
                          })
                        : '—',
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                <a className="command-text-link" href="#performance">
                  View your performance ledger <ArrowUpRight size={16} />
                </a>
              </section>
              <section
                className="command-intelligence"
                aria-labelledby="move-title"
              >
                <div className="command-section-label">
                  <span className="gold">CASSIUS INTELLIGENCE</span>
                  <div className="command-sigil" aria-hidden="true">
                    <Sparkles size={22} />
                  </div>
                </div>
                <span className="command-kicker">YOUR NEXT BEST ACTION</span>
                <h2 id="move-title">{move.title}</h2>
                <p>{move.rationale}</p>
                <span className="command-evidence">{move.evidence}</span>
                <button
                  className="gold-button command-find"
                  disabled={thinking}
                  onClick={findMove}
                >
                  {thinking
                    ? 'Considering your next move…'
                    : 'Find my best move'}{' '}
                  <ArrowRight size={18} />
                </button>
                <div className="command-ai-result" aria-live="polite">
                  {answer && <p>{answer}</p>}
                  {aiError && (
                    <p role="alert">
                      {aiError} Your foundation action remains available below.
                    </p>
                  )}
                </div>
                <button
                  className="command-text-link"
                  onClick={() => onAction(move.action)}
                >
                  {move.action.label} <ArrowUpRight size={16} />
                </button>
                <button
                  className="command-text-link command-why"
                  onClick={() =>
                    onAction({
                      label: 'Ask Cassius why',
                      destination: 'intelligence',
                      brief: `Explain this suggested action: ${move.title} ${move.rationale} ${sample ? 'This is an illustrative sample, not real performance.' : 'Performance is not connected; do not infer earnings.'}`,
                    })
                  }
                >
                  Ask Cassius why
                </button>
              </section>
            </div>
            <section className="command-actions" aria-label="Command actions">
              {[
                {
                  label: 'Create content',
                  destination: 'studio',
                  Icon: Aperture,
                },
                {
                  label: 'Find opportunity',
                  destination: 'intelligence',
                  Icon: Sparkles,
                  brief:
                    'Give me one practical sales idea grounded in Groomed Gent knowledge. Do not invent campaigns or offers.',
                },
                { label: 'Share my code', destination: 'identity', Icon: Copy },
                {
                  label: 'Learn a product',
                  destination: 'knowledge',
                  Icon: BookOpen,
                },
                {
                  label: 'Your performance',
                  destination: 'performance',
                  Icon: ChartNoAxesCombined,
                },
              ].map(({ Icon, ...action }) => (
                <button
                  key={action.label}
                  onClick={() => onAction(action as Action)}
                >
                  <Icon size={20} strokeWidth={1.5} />
                  <span>{action.label}</span>
                  <ArrowUpRight size={14} />
                </button>
              ))}
            </section>
            <div className="command-secondary">
              <section className="command-momentum">
                <div className="command-section-label">
                  <h2>Your momentum</h2>
                  <Target size={18} />
                </div>
                <div className="command-goal-copy">
                  <span>MONTHLY EARNINGS GOAL</span>
                  <strong>
                    {monthlyGoal
                      ? currency({ minorUnits: monthlyGoal, currency: 'USD' })
                      : 'Set your intention.'}
                  </strong>
                </div>
                <progress
                  className="command-progress"
                  aria-label="Monthly earnings goal"
                  max={100}
                  value={goalProgress ?? undefined}
                  aria-valuetext={
                    goalProgress === null
                      ? 'Progress unavailable until monthly earnings are connected'
                      : `${goalProgress.toFixed(0)} percent`
                  }
                />
                <p>
                  {goalProgress !== null
                    ? `${goalProgress.toFixed(0)}% of your ${sample ? 'sample ' : ''}monthly goal`
                    : period !== 'Month'
                      ? 'Select Month to see goal progress.'
                      : 'Progress begins when monthly earnings are connected.'}
                </p>
                {!sample && (
                  <form
                    className="command-goal-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const amount = Math.round(Number(goalInput) * 100);
                      if (
                        !Number.isSafeInteger(amount) ||
                        amount <= 0 ||
                        amount > 100000000
                      ) {
                        setGoalMessage(
                          'Enter a goal between $0.01 and $1,000,000.',
                        );
                        return;
                      }
                      setPersonalGoal(amount);
                      try {
                        localStorage.setItem(
                          'ggc.preview.dashboard-goal.v1',
                          String(amount),
                        );
                        setGoalMessage('Personal goal saved on this device.');
                      } catch {
                        setGoalMessage(
                          'Goal set for this visit. Device storage is unavailable.',
                        );
                      }
                    }}
                  >
                    <label htmlFor="command-goal">Personal goal · USD</label>
                    <div>
                      <input
                        id="command-goal"
                        type="number"
                        min="0.01"
                        max="1000000"
                        step="0.01"
                        inputMode="decimal"
                        value={goalInput}
                        onChange={(event) => setGoalInput(event.target.value)}
                        required
                        placeholder="e.g. 500"
                      />
                      <button type="submit">Save goal</button>
                    </div>
                    <output>{goalMessage}</output>
                  </form>
                )}
                <div className="command-tier">
                  <span>COLLECTIVE STATUS</span>
                  <h3>{dashboard.membership.label}</h3>
                  {dashboard.membership.next ? (
                    <p>
                      Next: {dashboard.membership.next.label} ·{' '}
                      {performance &&
                      performance.revenue.currency ===
                        dashboard.membership.next.threshold.currency
                        ? currency({
                            ...dashboard.membership.next.threshold,
                            minorUnits: Math.max(
                              0,
                              dashboard.membership.next.threshold.minorUnits -
                                performance.revenue.minorUnits,
                            ),
                          }) + ' in qualifying sales to go. '
                        : currency(dashboard.membership.next.threshold) +
                          ' qualifying sales required. '}
                      {dashboard.membership.next.benefit}
                    </p>
                  ) : (
                    <p>Tier criteria and privileges are awaiting approval.</p>
                  )}
                  <a href="#status">
                    Explore status <ArrowUpRight size={14} />
                  </a>
                </div>
              </section>
              <section className="command-pulse">
                <div className="command-section-label">
                  <h2>Collective pulse</h2>
                  <span>IN YOUR CIRCLE</span>
                </div>
                <p className="command-muted">
                  {dashboard.feedConnected
                    ? 'Selected for your Collective.'
                    : 'Available in your workspace. Live announcements are not connected.'}
                </p>
                {visiblePulse(
                  dashboard.pulse,
                  dashboard.membership.tierId,
                  dashboard.ambassador?.kind ?? null,
                  new Date(),
                ).map((item) => (
                  <button
                    key={item.id}
                    className="command-pulse-item"
                    onClick={() => onAction(item.action)}
                  >
                    <span className="command-pulse-kind">{item.kind}</span>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                    <span className="command-text-link">
                      {item.action.label} <ArrowUpRight size={16} />
                    </span>
                  </button>
                ))}
              </section>
            </div>
            <section className="command-trends">
              <div className="command-section-label">
                <h2>Performance intelligence</h2>
                <span>THE SIGNAL / NOT THE NOISE</span>
              </div>
              {performance && performance.trend.length > 1 ? (
                <div className="command-trend-grid">
                  <div>
                    <span className="command-kicker">
                      EARNINGS TREND {sample ? '· SAMPLE' : ''}
                    </span>
                    <svg
                      viewBox="0 0 600 160"
                      aria-label={`Earnings trend across ${performance.trend.length} observations; exact values below`}
                    >
                      <defs>
                        <linearGradient
                          id="command-chart-fill"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#c4912f"
                            stopOpacity=".22"
                          />
                          <stop
                            offset="100%"
                            stopColor="#c4912f"
                            stopOpacity="0"
                          />
                        </linearGradient>
                      </defs>
                      {(() => {
                        const values = performance.trend.map(
                          (point) => point.earnings.minorUnits,
                        );
                        const min = Math.min(0, ...values),
                          max = Math.max(1, ...values);
                        const points = values
                          .map(
                            (v, i) =>
                              `${10 + (i * 580) / (values.length - 1)},${140 - ((v - min) / (max - min)) * 120}`,
                          )
                          .join(' ');
                        return (
                          <>
                            <path
                              d="M10 40 H590 M10 90 H590 M10 140 H590"
                              stroke="#ffffff10"
                              fill="none"
                            />
                            <polygon
                              points={`10,155 ${points} 590,155`}
                              fill="url(#command-chart-fill)"
                            />
                            <polyline
                              points={points}
                              stroke="#dfbc73"
                              strokeWidth="2.5"
                              strokeLinejoin="round"
                              fill="none"
                            />
                          </>
                        );
                      })()}
                    </svg>
                    <details>
                      <summary>View exact trend values</summary>
                      <table>
                        <thead>
                          <tr>
                            <th>Observation</th>
                            <th>Earnings</th>
                          </tr>
                        </thead>
                        <tbody>
                          {performance.trend.map((point) => (
                            <tr key={point.date}>
                              <td>{point.date}</td>
                              <td>{currency(point.earnings)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </details>
                  </div>
                  <div>
                    <h3>Where interest becomes action</h3>
                    {performance.channels.length ? (
                      performance.channels.map((channel) => (
                        <div className="command-channel" key={channel.id}>
                          <span>{channel.name}</span>
                          <strong>{channel.orders} orders</strong>
                          <small>
                            {channel.clicks > 0
                              ? `${((channel.orders / channel.clicks) * 100).toFixed(1)}% conversion`
                              : 'Conversion unavailable'}
                          </small>
                        </div>
                      ))
                    ) : (
                      <p>Channel attribution is not available yet.</p>
                    )}
                    <p className="command-muted">{move.rationale}</p>
                  </div>
                </div>
              ) : (
                <div className="command-no-trend">
                  <ChartNoAxesCombined size={30} />
                  <div>
                    <h3>
                      {performance?.orders === 0
                        ? 'A clear starting point.'
                        : 'Your signal is taking shape.'}
                    </h3>
                    <p>
                      {performance?.orders === 0
                        ? 'No attributed orders in this period. Your next move is ready above.'
                        : 'Trends, leading products and channel insights will appear as attributed activity becomes available. Missing data is never shown as zero.'}
                    </p>
                  </div>
                  <a href="#performance">
                    Reporting details <ArrowUpRight size={16} />
                  </a>
                </div>
              )}
            </section>
          </>
        )
      )}
    </div>
  );
}
