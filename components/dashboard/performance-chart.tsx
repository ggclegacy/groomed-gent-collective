'use client';
import { useId, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  currency,
  type DashboardPerformance,
  type Period,
} from '@/lib/dashboard/model';
import { GhostChart, StatusChip } from './primitives';
function dateLabel(date: string, period: Period) {
  const parsed = new Date(date);
  if (!Number.isFinite(+parsed)) return date;
  return parsed.toLocaleString(
    'en-US',
    period === 'Today'
      ? { hour: 'numeric', timeZone: 'UTC' }
      : { month: 'short', day: 'numeric', timeZone: 'UTC' },
  );
}
export function PerformanceChart({
  performance,
  period,
  sample,
}: {
  performance: DashboardPerformance | null;
  period: Period;
  sample: boolean;
}) {
  const [metric, setMetric] = useState<'earnings' | 'sales'>('earnings');
  const id = useId().replaceAll(':', '');
  const validSales =
    !!performance?.trend.length &&
    performance.trend.every((p) => p.sales !== undefined);
  const data =
    performance?.trend.map((point) => ({
      date: point.date,
      label: dateLabel(point.date, period),
      amount: (metric === 'earnings' ? point.earnings : point.sales)
        ?.minorUnits,
      previous: (metric === 'earnings'
        ? point.previousEarnings
        : point.previousSales
      )?.minorUnits,
    })) ?? [];
  const moneyCurrency =
    performance?.earnedCommission?.currency ??
    performance?.revenue.currency ??
    'USD';
  const available =
    data.length > 1 && data.every((point) => point.amount !== undefined);
  const comparison =
    available && data.every((point) => point.previous !== undefined);
  const total =
    metric === 'earnings'
      ? performance?.earnedCommission
      : performance?.revenue;
  return (
    <div className="vd-performance-chart">
      <div className="vd-chart-controls">
        <div>
          <span className="vd-overline">
            {metric === 'earnings' ? 'EARNINGS' : 'SALES'} OVER TIME
          </span>
          <strong>{currency(total)}</strong>
        </div>
        <fieldset className="vd-chart-switch" aria-label="Chart metric">
          <button
            aria-pressed={metric === 'earnings'}
            onClick={() => setMetric('earnings')}
          >
            Earnings
          </button>
          <button
            aria-pressed={metric === 'sales'}
            disabled={!!performance && !validSales}
            title={!validSales ? 'Sales history not available' : undefined}
            onClick={() => setMetric('sales')}
          >
            Sales
          </button>
        </fieldset>
      </div>
      {available ? (
        <>
          <div className="vd-chart-canvas">
            <ResponsiveContainer
              width="100%"
              height="100%"
              initialDimension={{ width: 320, height: 230 }}
            >
              <AreaChart
                data={data}
                margin={{ top: 14, right: 8, left: -8, bottom: 0 }}
                accessibilityLayer
              >
                <defs>
                  <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b38748" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#b38748" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#d9ceaa12" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  minTickGap={42}
                  tick={{ fill: '#a4a09a', fontSize: 12 }}
                  tickMargin={12}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickCount={4}
                  tick={{ fill: '#a4a09a', fontSize: 12 }}
                  tickFormatter={(value) =>
                    new Intl.NumberFormat('en-US', {
                      notation: 'compact',
                      style: 'currency',
                      currency: moneyCurrency,
                      maximumFractionDigits: 0,
                    }).format(Number(value) / 100)
                  }
                  width={58}
                />
                <Tooltip
                  cursor={{ stroke: '#b88e5e50', strokeDasharray: '3 5' }}
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <div className="vd-tooltip">
                        <span>{String(label)}</span>
                        {payload
                          .filter((p) => typeof p.value === 'number')
                          .map((p) => (
                            <div key={String(p.dataKey)}>
                              <small>
                                {p.dataKey === 'previous'
                                  ? 'Prior period'
                                  : metric === 'earnings'
                                    ? 'Earnings'
                                    : 'Sales'}
                              </small>
                              <strong>
                                {currency({
                                  minorUnits: Number(p.value),
                                  currency: moneyCurrency,
                                })}
                              </strong>
                            </div>
                          ))}
                      </div>
                    ) : null
                  }
                />
                {comparison && (
                  <Area
                    name="Prior period"
                    dataKey="previous"
                    type="monotone"
                    fill="none"
                    stroke="#856b9b"
                    strokeDasharray="4 6"
                    strokeWidth={1.4}
                    isAnimationActive={false}
                    activeDot={false}
                  />
                )}
                <Area
                  name={metric}
                  dataKey="amount"
                  type="monotone"
                  fill={`url(#${id})`}
                  stroke="#b38748"
                  strokeWidth={2.2}
                  dot={false}
                  activeDot={{
                    r: 5,
                    stroke: '#dfb56d',
                    strokeWidth: 2,
                    fill: '#b38748',
                  }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="vd-chart-legend">
            <span>
              <i />
              Current period
            </span>
            {comparison && (
              <span>
                <i />
                Prior period
              </span>
            )}
            <small>Touch or use arrow keys to inspect</small>
          </div>
          <details className="vd-data-table">
            <summary>View exact values</summary>
            <div>
              <table>
                <thead>
                  <tr>
                    <th>Time (UTC)</th>
                    <th>{metric === 'earnings' ? 'Earnings' : 'Sales'}</th>
                    {comparison && <th>Prior period</th>}
                  </tr>
                </thead>
                <tbody>
                  {data.map((point) => (
                    <tr key={point.date}>
                      <td>{point.date.replace('T', ' ').slice(0, 16)}</td>
                      <td>
                        {currency({
                          minorUnits: point.amount ?? 0,
                          currency: moneyCurrency,
                        })}
                      </td>
                      {comparison && (
                        <td>
                          {currency({
                            minorUnits: point.previous ?? 0,
                            currency: moneyCurrency,
                          })}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      ) : (
        <GhostChart
          label={
            performance
              ? 'History not available yet'
              : 'Your performance signal starts here'
          }
        />
      )}
      {sample && (
        <div className="vd-chart-sample">
          <StatusChip tone="gold">Illustrative sample · Sep 2026</StatusChip>
        </div>
      )}
    </div>
  );
}
