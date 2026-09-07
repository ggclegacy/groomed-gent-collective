'use client';
import { useId, type ReactNode } from 'react';
import { CassiusCore } from '@/components/cassius-core';
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowRight,
  LockKeyhole,
  Radio,
  BookOpen,
  Layers,
  Megaphone,
  Sparkles,
  PackageOpen,
  type LucideIcon,
} from 'lucide-react';
import {
  periods,
  type Period,
  type PulseItem as PulseRecord,
  type Action,
} from '@/lib/dashboard/model';
export function GlassSurface({
  children,
  className = '',
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`vd-glass ${className}`}>
      {children}
    </section>
  );
}
export function StatusChip({
  children,
  tone = 'muted',
}: {
  children: ReactNode;
  tone?: 'gold' | 'green' | 'muted';
}) {
  return (
    <span className={`vd-chip vd-chip-${tone}`}>
      <i aria-hidden="true" />
      {children}
    </span>
  );
}
export function PeriodSelector({
  value,
  onChange,
}: {
  value: Period;
  onChange: (period: Period) => void;
}) {
  return (
    <fieldset className="vd-periods" aria-label="Performance period">
      {periods.map((period) => (
        <button
          type="button"
          key={period}
          aria-pressed={value === period}
          onClick={() => onChange(period)}
        >
          {period.toUpperCase()}
        </button>
      ))}
    </fieldset>
  );
}
export function TrendIndicator({
  value,
  label = 'vs prior period',
}: {
  value: number | null;
  label?: string;
}) {
  const Icon = value !== null && value < 0 ? ArrowDownRight : ArrowUpRight;
  return (
    <span
      className={`vd-trend ${value === null ? 'vd-trend-empty' : value < 0 ? 'vd-trend-down' : ''}`}
    >
      {value !== null ? (
        <>
          <Icon size={14} />
          {value > 0 ? '+' : ''}
          {value.toFixed(1)}% <small>{label}</small>
        </>
      ) : (
        <>
          <span className="vd-dash" />
          Awaiting comparison
        </>
      )}
    </span>
  );
}
export function Sparkline({
  values,
  ghost = false,
}: {
  values: number[];
  ghost?: boolean;
}) {
  const id = useId().replaceAll(':', '');
  const data = ghost
    ? [12, 15, 13, 24, 20, 30, 27, 38, 34, 44, 41, 54]
    : values;
  if (data.length < 2)
    return <span className="vd-spark-empty" aria-hidden="true" />;
  const low = Math.min(0, ...data),
    high = Math.max(1, ...data);
  const points = data
    .map(
      (value, i) =>
        `${(i * 180) / (data.length - 1)},${55 - ((value - low) / (high - low)) * 49}`,
    )
    .join(' ');
  return (
    <svg
      className={`vd-spark ${ghost ? 'vd-ghost' : ''}`}
      viewBox="0 0 180 64"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="currentColor" stopOpacity=".24" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,64 ${points} 180,64`} fill={`url(#${id})`} />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
      {!ghost && (
        <circle
          cx="180"
          cy={55 - ((data[data.length - 1] - low) / (high - low)) * 49}
          r="3"
          fill="currentColor"
        />
      )}
    </svg>
  );
}
export function MetricTile({
  label,
  value,
  trend,
  icon: Icon,
  detail,
}: {
  label: string;
  value: string;
  trend?: number | null;
  icon: LucideIcon;
  detail?: string;
}) {
  return (
    <div className="vd-metric">
      <div className="vd-metric-label">
        <Icon size={14} />
        <span>{label}</span>
      </div>
      <strong>
        {value === '—' ? (
          <span className="vd-number-ghost">
            <i aria-hidden="true" />
            <i aria-hidden="true" />
            <span className="vd-sr">Data unavailable</span>
          </span>
        ) : (
          value
        )}
      </strong>
      {value === '—' ? (
        <span className="vd-metric-detail">Awaiting signal</span>
      ) : detail ? (
        <span className="vd-metric-detail">{detail}</span>
      ) : (
        <TrendIndicator value={trend ?? null} label="" />
      )}
    </div>
  );
}
export function ProgressRing({
  value,
  label,
  subtext,
}: {
  value: number | null;
  label: string;
  subtext: string;
}) {
  const id = useId().replaceAll(':', '');
  const progress = value === null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className={`vd-ring ${value === null ? 'vd-ring-empty' : ''}`}>
      <svg viewBox="0 0 180 180" aria-hidden="true">
        <defs>
          <linearGradient id={id}>
            <stop stopColor="var(--gold-dim)" />
            <stop offset=".5" stopColor="var(--gold)" />
            <stop offset="1" stopColor="var(--gold)" />
          </linearGradient>
        </defs>
        <circle
          cx="90"
          cy="90"
          r="77"
          fill="none"
          stroke="var(--border)"
          strokeWidth="7"
        />
        <circle
          cx="90"
          cy="90"
          r="64"
          fill="none"
          stroke="var(--border)"
          strokeWidth="1"
          strokeDasharray="1 7"
        />
        <circle
          className="vd-ring-value"
          cx="90"
          cy="90"
          r="77"
          pathLength="100"
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${progress} 100`}
          transform="rotate(-90 90 90)"
        />
      </svg>
      <div className="vd-ring-center">
        {value === null ? <LockKeyhole size={22} /> : null}
        <strong>{label}</strong>
        <small>{subtext}</small>
      </div>
      <progress
        className="vd-sr"
        max={100}
        value={value ?? undefined}
        aria-label="Monthly goal progress"
        aria-valuetext={
          value === null
            ? 'Monthly earnings not available'
            : `${progress.toFixed(0)} percent`
        }
      />
    </div>
  );
}
export function CassiusGlyph({ active = false }: { active?: boolean }) {
  return (
    <div
      className={`vd-cassius-glyph ${active ? 'vd-is-thinking' : ''}`}
      aria-hidden="true"
    >
      <CassiusCore compact />
    </div>
  );
}
export function RankedBar({
  name,
  value,
  index,
  detail,
}: {
  name: string;
  value: number | null;
  index: number;
  detail: string;
}) {
  return (
    <div className="vd-ranked">
      <span className="vd-rank">{String(index + 1).padStart(2, '0')}</span>
      <div>
        <div className="vd-ranked-label">
          <span>{name}</span>
          <strong>{value === null ? '—' : `${value.toFixed(0)}%`}</strong>
        </div>
        <div className="vd-bar" aria-hidden="true">
          <span
            style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%` }}
          />
        </div>
        <small>{detail}</small>
      </div>
    </div>
  );
}
const pulseIcons: Record<PulseRecord['kind'], LucideIcon> = {
  launch: PackageOpen,
  campaign: Radio,
  training: BookOpen,
  asset: Layers,
  announcement: Megaphone,
  opportunity: Sparkles,
};
const pulseLabels: Record<PulseRecord['kind'], string> = {
  launch: 'DROP',
  campaign: 'CAMPAIGN',
  training: 'TRAINING',
  asset: 'ASSET',
  announcement: 'COLLECTIVE',
  opportunity: 'OPPORTUNITY',
};
export function PulseItem({
  item,
  onAction,
  sample,
}: {
  item: PulseRecord;
  onAction: (action: Action) => void;
  sample: boolean;
}) {
  const Icon = pulseIcons[item.kind];
  return (
    <button className="vd-pulse-row" onClick={() => onAction(item.action)}>
      <span className="vd-pulse-icon">
        <Icon size={19} strokeWidth={1.4} />
      </span>
      <span className="vd-pulse-copy">
        <small>
          {pulseLabels[item.kind]}
          {sample ? ' / SAMPLE' : ''}
        </small>
        <strong>{item.title}</strong>
        <span>{item.detail}</span>
      </span>
      <ArrowUpRight size={17} />
    </button>
  );
}
export function CommandAction({
  title,
  subtitle,
  icon: Icon,
  onClick,
  primary = false,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      className={`vd-command ${primary ? 'vd-command-wide' : ''}`}
      onClick={onClick}
    >
      <span className="vd-command-icon">
        <Icon size={22} strokeWidth={1.4} />
      </span>
      <span>
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </span>
      <ArrowUpRight size={15} />
    </button>
  );
}
export function GhostChart({
  label = 'Reporting not connected',
}: {
  label?: string;
}) {
  return (
    <div className="vd-ghost-chart">
      <div className="vd-chart-grid" aria-hidden="true" />
      <Sparkline values={[]} ghost />
      <span className="vd-ghost-label">
        <LockKeyhole size={15} />
        {label}
      </span>
    </div>
  );
}
export function SectionTitle({
  index,
  title,
  action,
}: {
  index: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <header className="vd-section-title">
      <h2>
        <span>{index}</span>
        {title}
      </h2>
      {action ?? <ArrowRight size={15} aria-hidden="true" />}
    </header>
  );
}
