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
  ShoppingBag,
  MousePointer2,
  Wallet,
  LockKeyhole,
  ChevronRight,
  CircleCheck,
} from 'lucide-react';
import { parseProfile, storageKeys } from '@/lib/collective';
import type { Section } from '@/lib/collective';
import { bestMove, currency, visiblePulse } from '@/lib/dashboard/model';
import type { Action, Dashboard, Period } from '@/lib/dashboard/model';
import { parseDashboard } from '@/lib/dashboard/validate';
import { sampleDashboard } from '@/lib/dashboard/sample';
import {
  GlassSurface,
  StatusChip,
  PeriodSelector,
  TrendIndicator,
  Sparkline,
  MetricTile,
  ProgressRing,
  CassiusGlyph,
  RankedBar,
  PulseItem,
  CommandAction,
  SectionTitle,
} from '@/components/dashboard/primitives';
import { PerformanceChart } from '@/components/dashboard/performance-chart';
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
    <output className="vd-loading">
      <span>Preparing your command center…</span>
      <i />
      <i />
      <i />
    </output>
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
  const sampleMonth = sample && data ? sampleDashboard(data, 'Month') : null;
  const monthlyEarned =
    sampleMonth?.performance.state === 'ready'
      ? sampleMonth.performance.data.earnedCommission
      : period === 'Month'
        ? earned
        : null;
  const goalProgress =
    monthlyEarned?.currency === 'USD' && monthlyGoal
      ? Math.min(
          100,
          Math.max(0, (monthlyEarned.minorUnits / monthlyGoal) * 100),
        )
      : null;
  async function findMove() {
    if (!dashboard || thinking) return;
    if (sample) {
      setAnswer(
        `Sample analysis: ${move?.rationale ?? 'Prepare one thoughtful product story.'} This is an illustrative scenario, not an income forecast.`,
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
  const p = performance;
  const delta = (
    current: number | undefined | null,
    previous: number | undefined | null,
  ) =>
    current != null && previous != null && previous !== 0
      ? ((current - previous) / Math.abs(previous)) * 100
      : null;
  const topSalesProduct = p
    ? [...p.products].sort(
        (a, b) => b.revenue.minorUnits - a.revenue.minorUnits,
      )[0]
    : null;
  const topProduct =
    p?.products.find(
      (product) => product.productId === move?.action.productId,
    ) ?? null;
  const productShare =
    p &&
    topProduct &&
    p.revenue.minorUnits > 0 &&
    p.revenue.currency === topProduct.revenue.currency
      ? (topProduct.revenue.minorUnits / p.revenue.minorUnits) * 100
      : null;
  const pulse = dashboard
    ? visiblePulse(
        dashboard.pulse,
        dashboard.membership.tierId,
        dashboard.ambassador?.kind ?? null,
        new Date(),
      )
    : [];
  const goalAmount = monthlyGoal
    ? { minorUnits: monthlyGoal, currency: 'USD' }
    : null;
  const remaining =
    goalAmount && monthlyEarned?.currency === 'USD'
      ? Math.max(0, goalAmount.minorUnits - monthlyEarned.minorUnits)
      : null;
  const topChannels = p
    ? [...p.channels].sort((a, b) => b.orders - a.orders)
    : [];
  const totalChannelOrders = topChannels.reduce((sum, c) => sum + c.orders, 0);
  const channelStops = topChannels.reduce<{ stops: string[]; end: number }>(
    (acc, c, i) => {
      const next =
        acc.end +
        (totalChannelOrders ? (c.orders / totalChannelOrders) * 100 : 0);
      acc.stops.push(
        `${['#d6b370', '#a1895c', '#57534c', '#a3a391'][i % 4]} ${acc.end}% ${next}%`,
      );
      acc.end = next;
      return acc;
    },
    { stops: [], end: 0 },
  );
  return (
    <div className="vd-root">
      <header className="vd-welcome">
        <div>
          <span className="vd-overline">AMBASSADOR COMMAND</span>
          <h1>
            {name
              ? `${name.split(' ')[0]}’s command center`
              : 'Your command center'}
          </h1>
        </div>
        <StatusChip tone="gold">
          {dashboard?.membership.label ?? 'The Collective'}
        </StatusChip>
      </header>
      <div className="vd-control-bar">
        <PeriodSelector
          value={period}
          onChange={(value) => {
            if (value !== period) {
              refresh();
              setPeriod(value);
            }
          }}
        />
        <button
          className="vd-preview-toggle"
          aria-pressed={sample}
          onClick={() => {
            setSample(!sample);
            setAnswer('');
            setAiError('');
            request.current?.abort();
            request.current = null;
            setThinking(false);
          }}
        >
          {sample ? (
            <>
              <CircleCheck size={14} />
              Sample on <span>· Return to my data</span>
            </>
          ) : (
            <>
              <Sparkles size={14} />
              Explore sample performance
            </>
          )}
        </button>
      </div>
      {sample && (
        <div className="vd-sample-banner">
          <StatusChip tone="gold">SAMPLE</StatusChip>
          <span>Illustrative data. Not your earnings, offers or status.</span>
        </div>
      )}
      {loading ? (
        <output className="vd-loading">
          <span>Preparing your command center…</span>
          <i />
          <i />
          <i />
        </output>
      ) : error ? (
        <GlassSurface className="vd-error">
          <LockKeyhole size={28} />
          <h2>A moment to reconnect.</h2>
          <p role="alert">{error}</p>
          <button
            className="vd-gold-button"
            onClick={() => {
              refresh();
              setRetry((n) => n + 1);
            }}
          >
            Refresh dashboard <RefreshCw size={16} />
          </button>
        </GlassSurface>
      ) : (
        dashboard &&
        move && (
          <>
            <div className="vd-command-grid">
              <GlassSurface className="vd-earnings">
                <div className="vd-module-header">
                  <span className="vd-overline">COMMISSION EARNED</span>
                  <StatusChip tone={p ? 'green' : 'muted'}>
                    {p
                      ? period === 'Month'
                        ? 'THIS MONTH'
                        : period.toUpperCase()
                      : 'AWAITING DATA'}
                  </StatusChip>
                </div>
                <div className="vd-earnings-main">
                  <div>
                    <strong
                      key={period + String(sample)}
                      className="vd-earnings-number"
                    >
                      {currency(earned)}
                    </strong>
                    {p ? (
                      <TrendIndicator
                        value={delta(
                          earned?.minorUnits,
                          p.previousEarnings?.currency === earned?.currency
                            ? p.previousEarnings?.minorUnits
                            : null,
                        )}
                      />
                    ) : (
                      <span className="vd-connection-label">
                        <LockKeyhole size={13} />
                        Commerce not connected
                      </span>
                    )}
                  </div>
                  <div className="vd-hero-spark">
                    <Sparkline
                      values={
                        p?.trend.map((point) => point.earnings.minorUnits) ?? []
                      }
                      ghost={!p}
                    />
                    <span>{p ? 'EARNINGS PULSE' : 'SIGNAL PENDING'}</span>
                  </div>
                </div>
                <div className="vd-balances">
                  <div>
                    <span>
                      <i className="vd-status-dot" />
                      AVAILABLE
                    </span>
                    <strong>{currency(p?.availableCommission)}</strong>
                  </div>
                  <div>
                    <span>
                      <i className="vd-status-dot vd-dot-pending" />
                      PENDING
                    </span>
                    <strong>{currency(p?.pendingCommission)}</strong>
                  </div>
                  <div>
                    <span>NEXT PAYOUT</span>
                    <strong>
                      {p?.nextPayout
                        ? new Date(p.nextPayout).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            timeZone: 'UTC',
                          })
                        : 'Unscheduled'}
                    </strong>
                  </div>
                </div>
                <div className="vd-metrics">
                  <MetricTile
                    label="SALES"
                    value={currency(p?.revenue)}
                    icon={ChartNoAxesCombined}
                    trend={delta(
                      p?.revenue.minorUnits,
                      p?.previous?.revenue.currency === p?.revenue.currency
                        ? p?.previous?.revenue.minorUnits
                        : null,
                    )}
                  />
                  <MetricTile
                    label="ORDERS"
                    value={p ? String(p.orders) : '—'}
                    icon={ShoppingBag}
                    detail={
                      p?.previous
                        ? `${p.orders - p.previous.orders >= 0 ? '+' : ''}${p.orders - p.previous.orders} vs prior period`
                        : undefined
                    }
                  />
                  <MetricTile
                    label="CONVERSION"
                    value={
                      p?.conversionRate != null
                        ? `${(p.conversionRate * 100).toFixed(1)}%`
                        : '—'
                    }
                    icon={MousePointer2}
                    detail={
                      p?.conversionRate != null &&
                      p.previous?.conversionRate != null
                        ? `${p.conversionRate >= p.previous.conversionRate ? '+' : ''}${((p.conversionRate - p.previous.conversionRate) * 100).toFixed(1)} percentage points`
                        : undefined
                    }
                  />
                  <MetricTile
                    label="AVG. ORDER"
                    value={
                      p && p.orders
                        ? currency({
                            ...p.revenue,
                            minorUnits: Math.round(
                              p.revenue.minorUnits / p.orders,
                            ),
                          })
                        : '—'
                    }
                    icon={Wallet}
                    trend={delta(
                      p && p.orders ? p.revenue.minorUnits / p.orders : null,
                      p?.previous?.averageOrder?.currency ===
                        p?.revenue.currency
                        ? p?.previous?.averageOrder?.minorUnits
                        : null,
                    )}
                  />
                </div>
                <a className="vd-ledger-link" href="#performance">
                  Performance ledger <ArrowUpRight size={14} />
                </a>
              </GlassSurface>
              <GlassSurface className="vd-cassius">
                <div className="vd-module-header">
                  <span className="vd-cassius-wordmark">
                    CASSIUS<span>COLLECTIVE INTELLIGENCE</span>
                  </span>
                  <StatusChip tone="gold">
                    {sample
                      ? 'SAMPLE INSIGHT'
                      : thinking
                        ? 'ANALYZING'
                        : 'NEXT BEST MOVE'}
                  </StatusChip>
                </div>
                <div className="vd-intelligence-body">
                  <CassiusGlyph active={thinking} />
                  <div>
                    <span className="vd-overline">
                      {topProduct
                        ? 'THE STRONGEST SIGNAL'
                        : 'BUILD YOUR FOUNDATION'}
                    </span>
                    <h2>
                      {topProduct
                        ? `Lead with ${topProduct.name}.`
                        : 'Confidence is your first advantage.'}
                    </h2>
                  </div>
                </div>
                <div className="vd-opportunity">
                  <div>
                    <strong>
                      {productShare !== null ? (
                        `${productShare.toFixed(0)}%`
                      ) : (
                        <BookOpen size={25} strokeWidth={1.2} />
                      )}
                    </strong>
                    <span>
                      {productShare !== null
                        ? 'OF RECORDED SALES'
                        : 'PRODUCT CONFIDENCE'}
                    </span>
                  </div>
                  <p>
                    {topProduct
                      ? 'Turn your leading product into your next story.'
                      : 'One product. One informed recommendation. One personal story.'}
                  </p>
                </div>
                <button
                  className="vd-gold-button"
                  disabled={thinking}
                  onClick={findMove}
                >
                  {thinking ? 'Reading the signal…' : 'Find my best move'}
                  <ArrowRight size={17} />
                </button>
                <div className="vd-cassius-links">
                  <button onClick={() => onAction(move.action)}>
                    {topProduct
                      ? 'Create a product story'
                      : 'Prepare my first story'}
                    <ArrowUpRight size={14} />
                  </button>
                  <button
                    onClick={() =>
                      onAction({
                        label: 'Why this?',
                        destination: 'intelligence',
                        brief: `Explain this suggested action: ${move.title} ${move.rationale} ${sample ? 'This is explicitly sample performance.' : 'Use only available evidence; do not infer missing earnings.'}`,
                      })
                    }
                  >
                    Why this? <ChevronRight size={14} />
                  </button>
                </div>
                <div className="vd-ai-response" aria-live="polite">
                  {answer && (
                    <div>
                      <span className="vd-overline">
                        {sample ? 'SAMPLE ANALYSIS' : 'CASSIUS ANALYSIS'}
                      </span>
                      <p>{answer}</p>
                    </div>
                  )}
                  {aiError && (
                    <p role="alert">
                      {aiError} Your suggested action remains available.
                    </p>
                  )}
                </div>
              </GlassSurface>
              <GlassSurface className="vd-chart-panel">
                <SectionTitle
                  index="01"
                  title="Performance"
                  action={
                    <StatusChip>
                      {sample ? 'SAMPLE' : p ? 'CONNECTED' : 'NOT CONNECTED'}
                    </StatusChip>
                  }
                />
                <PerformanceChart
                  performance={p}
                  period={period}
                  sample={sample}
                />
              </GlassSurface>
              <section className="vd-launcher">
                <SectionTitle index="02" title="Make your move" />
                <div className="vd-launcher-grid">
                  <CommandAction
                    title="Create"
                    subtitle="Creator Studio"
                    icon={Aperture}
                    onClick={() =>
                      onAction({ label: 'Create', destination: 'studio' })
                    }
                  />
                  <CommandAction
                    title="Grow"
                    subtitle="Find opportunity"
                    icon={ChartNoAxesCombined}
                    onClick={() =>
                      onAction({
                        label: 'Find opportunity',
                        destination: 'intelligence',
                        brief:
                          'Give me one practical sales idea grounded in Groomed Gent knowledge. Do not invent campaigns or offers.',
                      })
                    }
                  />
                  <CommandAction
                    title="Share"
                    subtitle="My signature code"
                    icon={Copy}
                    onClick={() =>
                      onAction({
                        label: 'Share my code',
                        destination: 'identity',
                      })
                    }
                  />
                  <CommandAction
                    title="Learn"
                    subtitle="Product Studio"
                    icon={BookOpen}
                    onClick={() =>
                      onAction({
                        label: 'Learn a product',
                        destination: 'knowledge',
                      })
                    }
                  />
                  <CommandAction
                    title="Ask Cassius"
                    subtitle="A clearer next move"
                    icon={Sparkles}
                    primary
                    onClick={() =>
                      onAction({
                        label: 'Ask Cassius',
                        destination: 'intelligence',
                      })
                    }
                  />
                </div>
              </section>
              <GlassSurface className="vd-momentum">
                <SectionTitle index="03" title="Momentum" />
                <div className="vd-momentum-main">
                  <ProgressRing
                    value={goalProgress}
                    label={
                      goalProgress !== null
                        ? `${goalProgress.toFixed(0)}%`
                        : 'Your goal'
                    }
                    subtext={
                      goalProgress !== null
                        ? 'OF MONTHLY GOAL'
                        : 'AWAITING SIGNAL'
                    }
                  />
                  <div className="vd-goal-summary">
                    <span className="vd-overline">MONTHLY EARNINGS</span>
                    <strong>
                      {monthlyEarned
                        ? currency(monthlyEarned)
                        : period === 'Month'
                          ? '—'
                          : 'Month view'}
                    </strong>
                    <span>
                      of{' '}
                      {goalAmount ? currency(goalAmount) : 'your personal goal'}
                    </span>
                    <small>
                      {remaining !== null
                        ? `${currency({ minorUnits: remaining, currency: 'USD' })} to go`
                        : period !== 'Month'
                          ? 'Select Month for progress'
                          : 'Set your intention below'}
                    </small>
                  </div>
                </div>
                {!sample && (
                  <details className="vd-goal-editor">
                    <summary>
                      {personalGoal
                        ? 'Edit personal goal'
                        : 'Set a personal goal'}
                      <ArrowUpRight size={14} />
                    </summary>
                    <form
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
                          setGoalMessage('Goal saved on this device.');
                        } catch {
                          setGoalMessage(
                            'Goal set for this visit. Storage is unavailable.',
                          );
                        }
                      }}
                    >
                      <label htmlFor="vd-goal">Personal goal · USD</label>
                      <div>
                        <input
                          id="vd-goal"
                          type="number"
                          min="0.01"
                          max="1000000"
                          step="0.01"
                          inputMode="decimal"
                          required
                          value={goalInput}
                          onChange={(event) => setGoalInput(event.target.value)}
                          placeholder="500"
                        />
                        <button type="submit">Save goal</button>
                      </div>
                      <output>{goalMessage}</output>
                    </form>
                  </details>
                )}
                <div className="vd-tier">
                  <div className="vd-tier-rail" aria-hidden="true">
                    <i />
                    <span />
                    <i />
                    <span />
                    <i />
                  </div>
                  <div className="vd-tier-labels">
                    <strong>
                      {sample
                        ? 'Ambassador'
                        : dashboard.membership.tierId
                          ? dashboard.membership.label
                          : 'Your status'}
                    </strong>
                    <span>
                      {dashboard.membership.next?.label ?? 'Next chapter'}
                    </span>
                    <LockKeyhole size={12} />
                  </div>
                  <div className="vd-next-benefit">
                    <LockKeyhole size={16} />
                    <span>
                      {dashboard.membership.next
                        ? dashboard.membership.next.benefit
                        : 'Tier benefits awaiting approval'}
                    </span>
                  </div>
                  <a href="#status">
                    Status & privileges
                    <ArrowUpRight size={14} />
                  </a>
                </div>
              </GlassSurface>
              <GlassSurface className="vd-pulse">
                <SectionTitle
                  index="04"
                  title="Collective pulse"
                  action={
                    <StatusChip tone={sample ? 'gold' : 'muted'}>
                      {sample ? 'SAMPLE' : 'WORKSPACE'}
                    </StatusChip>
                  }
                />
                {pulse.length ? (
                  pulse.map((item) => (
                    <PulseItem
                      key={item.id}
                      item={item}
                      onAction={onAction}
                      sample={sample}
                    />
                  ))
                ) : (
                  <div className="vd-feed-empty">
                    <LayersIcon />
                    <p>You’re up to date.</p>
                  </div>
                )}
                {!sample && !dashboard.feedConnected && (
                  <p className="vd-footnote">
                    Live announcements awaiting connection
                  </p>
                )}
              </GlassSurface>
              <GlassSurface className="vd-products">
                <SectionTitle index="05" title="Product intelligence" />
                <div className="vd-ranking-head">
                  <span>TOP PRODUCTS</span>
                  <span>SALES MIX</span>
                </div>
                {p?.products.length ? (
                  [...p.products]
                    .sort((a, b) => b.revenue.minorUnits - a.revenue.minorUnits)
                    .slice(0, 4)
                    .map((product, index) => (
                      <RankedBar
                        key={product.productId}
                        index={index}
                        name={product.name}
                        value={
                          p.revenue.minorUnits > 0 &&
                          p.revenue.currency === product.revenue.currency
                            ? (product.revenue.minorUnits /
                                p.revenue.minorUnits) *
                              100
                            : null
                        }
                        detail={`${product.orders} orders · ${currency(product.revenue)}`}
                      />
                    ))
                ) : (
                  <div
                    className="vd-empty-ranking"
                    aria-label="Product ranking awaiting attributed sales"
                  >
                    {[76, 54, 32].map((width, index) => (
                      <div key={width}>
                        <span>0{index + 1}</span>
                        <i style={{ width: `${width}%` }} />
                      </div>
                    ))}
                    <p>Product leaders appear with attributed sales.</p>
                  </div>
                )}
                <div className="vd-inline-insight">
                  <Sparkles size={15} />
                  <p>
                    {topSalesProduct
                      ? `${topSalesProduct.name} leads your recorded product sales.`
                      : 'Know the product. Create the opportunity.'}
                  </p>
                </div>
              </GlassSurface>
              <GlassSurface className="vd-channels">
                <SectionTitle index="06" title="Channel intelligence" />
                <div className="vd-channel-composition">
                  <div
                    className={`vd-channel-donut ${totalChannelOrders ? '' : 'vd-channel-empty'}`}
                    style={
                      totalChannelOrders
                        ? {
                            background: `conic-gradient(${channelStops.stops.join(',')})`,
                          }
                        : undefined
                    }
                  >
                    <div>
                      <strong>
                        {p?.channels.length ? totalChannelOrders : '—'}
                      </strong>
                      <span>ORDERS</span>
                    </div>
                  </div>
                  <div className="vd-channel-list">
                    {topChannels.length ? (
                      topChannels.slice(0, 4).map((channel, i) => (
                        <div key={channel.id}>
                          <i
                            style={{
                              background: [
                                '#d6b370',
                                '#a1895c',
                                '#57534c',
                                '#a3a391',
                              ][i % 4],
                            }}
                          />
                          <span>
                            <strong>{channel.name}</strong>
                            <small>
                              {channel.clicks > 0
                                ? `${((channel.orders / channel.clicks) * 100).toFixed(1)}% conversion`
                                : 'Conversion unavailable'}
                            </small>
                          </span>
                          <b>{channel.orders}</b>
                        </div>
                      ))
                    ) : (
                      <>
                        <span className="vd-overline">
                          AWAITING ATTRIBUTION
                        </span>
                        <p>Your channel mix will appear here.</p>
                      </>
                    )}
                  </div>
                </div>
                <div className="vd-inline-insight">
                  <Sparkles size={15} />
                  <p>
                    {topChannels[0]
                      ? `${topChannels[0].name} leads your recorded channel orders.`
                      : 'Every connection starts with a conversation.'}
                  </p>
                </div>
              </GlassSurface>
            </div>
            <div className="vd-system-footer">
              <StatusChip tone={sample ? 'gold' : 'muted'}>
                {sample ? 'SAMPLE ENVIRONMENT' : 'PRIVATE PREVIEW'}
              </StatusChip>
              <span>GROOMED GENT / THE COLLECTIVE</span>
              <a href="#performance">
                Reporting details <ArrowUpRight size={14} />
              </a>
            </div>
          </>
        )
      )}
    </div>
  );
}
function LayersIcon() {
  return <BookOpen size={26} strokeWidth={1} />;
}
