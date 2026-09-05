import { periods, type Dashboard } from './model.ts';
import { sections } from '../collective.ts';
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown) => typeof v === 'string';
const count = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0;
const money = (v: unknown): boolean =>
  record(v) &&
  Number.isSafeInteger(v.minorUnits) &&
  typeof v.currency === 'string' &&
  /^[A-Z]{3}$/.test(v.currency);
const optionalMoney = (v: unknown) => v === null || money(v);
const list = (v: unknown, check: (item: unknown) => boolean): boolean =>
  Array.isArray(v) && v.length <= 1000 && v.every(check);
function action(v: unknown): boolean {
  return (
    record(v) &&
    str(v.label) &&
    sections.includes(v.destination as (typeof sections)[number]) &&
    (v.brief === undefined || str(v.brief))
  );
}
/** Reject malformed provider responses before rendering financial values or action destinations. */
export function parseDashboard(value: unknown): Dashboard | null {
  if (
    !record(value) ||
    value.version !== 1 ||
    !['preview', 'sample', 'live'].includes(String(value.mode)) ||
    !periods.includes(value.period as (typeof periods)[number])
  )
    return null;
  if (
    !record(value.membership) ||
    !str(value.membership.label) ||
    !(value.membership.tierId === null || str(value.membership.tierId)) ||
    !optionalMoney(value.goal)
  )
    return null;
  const next = value.membership.next;
  if (
    next !== null &&
    (!record(next) ||
      !str(next.label) ||
      !money(next.threshold) ||
      !str(next.benefit))
  )
    return null;
  if (
    !(
      value.ambassador === null ||
      (record(value.ambassador) &&
        str(value.ambassador.name) &&
        str(value.ambassador.kind))
    )
  )
    return null;
  if (
    typeof value.feedConnected !== 'boolean' ||
    !list(
      value.pulse,
      (item) =>
        record(item) &&
        str(item.id) &&
        str(item.title) &&
        str(item.detail) &&
        typeof item.priority === 'number' &&
        Number.isFinite(item.priority) &&
        [
          'launch',
          'campaign',
          'training',
          'asset',
          'announcement',
          'opportunity',
        ].includes(String(item.kind)) &&
        action(item.action) &&
        ['tierIds', 'segments', 'productIds'].every(
          (key) => item[key] === undefined || list(item[key], str),
        ) &&
        ['startsAt', 'endsAt'].every(
          (key) =>
            item[key] === undefined ||
            (typeof item[key] === 'string' &&
              Number.isFinite(Date.parse(item[key]))),
        ),
    )
  )
    return null;
  const result = value.performance;
  if (!record(result)) return null;
  if (result.state !== 'ready')
    return ['disconnected', 'pending', 'error'].includes(
      String(result.state),
    ) && str(result.message)
      ? (value as unknown as Dashboard)
      : null;
  const p = result.data;
  if (
    !record(p) ||
    !count(p.orders) ||
    !count(p.clicks) ||
    ![
      'revenue',
      'pendingCommission',
      'approvedCommission',
      'paidCommission',
    ].every((key) => money(p[key])) ||
    !['earnedCommission', 'previousEarnings', 'availableCommission'].every(
      (key) => optionalMoney(p[key]),
    )
  )
    return null;
  if (
    !(
      p.conversionRate === null ||
      (typeof p.conversionRate === 'number' &&
        Number.isFinite(p.conversionRate) &&
        p.conversionRate >= 0)
    ) ||
    !(
      p.nextPayout === null ||
      (typeof p.nextPayout === 'string' &&
        Number.isFinite(Date.parse(p.nextPayout)))
    )
  )
    return null;
  if (
    !record(p.period) ||
    !str(p.period.from) ||
    !str(p.period.to) ||
    !list(
      p.trend,
      (point) => record(point) && str(point.date) && money(point.earnings),
    ) ||
    !list(
      p.products,
      (product) =>
        record(product) &&
        str(product.productId) &&
        str(product.name) &&
        count(product.orders) &&
        money(product.revenue),
    ) ||
    !list(
      p.channels,
      (channel) =>
        record(channel) &&
        str(channel.id) &&
        str(channel.name) &&
        count(channel.orders) &&
        count(channel.clicks),
    )
  )
    return null;
  return value as unknown as Dashboard;
}
