import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadDashboard } from '../lib/dashboard/service.ts';
import { sampleDashboard } from '../lib/dashboard/sample.ts';
import { periods } from '../lib/dashboard/model.ts';
import { parseDashboard } from '../lib/dashboard/validate.ts';
void test('sample chart series reconcile with earnings, sales and comparison totals in every period', async () => {
  const base = await loadDashboard('Month');
  for (const period of periods) {
    const sample = sampleDashboard(base, period);
    assert.ok(parseDashboard(sample));
    if (sample.performance.state !== 'ready') throw new Error();
    const p = sample.performance.data;
    assert.equal(
      p.trend.reduce((n, t) => n + t.earnings.minorUnits, 0),
      p.earnedCommission?.minorUnits,
    );
    assert.equal(
      p.trend.reduce((n, t) => n + (t.sales?.minorUnits ?? 0), 0),
      p.revenue.minorUnits,
    );
    assert.equal(
      p.trend.reduce((n, t) => n + (t.previousEarnings?.minorUnits ?? 0), 0),
      p.previousEarnings?.minorUnits,
    );
    assert.equal(
      p.trend.reduce((n, t) => n + (t.previousSales?.minorUnits ?? 0), 0),
      p.previous?.revenue.minorUnits,
    );
    assert.equal(
      p.products.reduce((n, t) => n + t.revenue.minorUnits, 0),
      p.revenue.minorUnits,
    );
    assert.equal(
      p.channels.reduce((n, t) => n + t.orders, 0),
      p.orders,
    );
    assert.equal(
      p.channels.reduce((n, t) => n + t.clicks, 0),
      p.clicks,
    );
    assert.ok(
      p.trend.every(
        (t) =>
          Date.parse(t.date) >= Date.parse(p.period.from) &&
          Date.parse(t.date) <= Date.parse(p.period.to),
      ),
    );
  }
  assert.equal(base.mode, 'preview');
  assert.equal(base.membership.next, null);
  assert.equal(base.performance.state, 'disconnected');
});
void test('sample rankings use canonical product records, not new product identities', async () => {
  const d = sampleDashboard(await loadDashboard('Month'), 'Month');
  if (d.performance.state !== 'ready') throw new Error();
  for (const p of d.performance.data.products) {
    const source = JSON.parse(
      readFileSync(
        new URL(
          `../knowledge/ggc/products/${p.productId.replace(/^ggc-/, '')}.json`,
          import.meta.url,
        ),
        'utf8',
      ),
    );
    assert.equal(source.id, p.productId);
  }
});
void test('optional sales history and comparison fields reject malformed financial input', async () => {
  const d = sampleDashboard(await loadDashboard('Month'), 'Month');
  if (d.performance.state !== 'ready') throw new Error();
  d.performance.data.trend[0].sales = { minorUnits: NaN, currency: 'USD' };
  assert.equal(parseDashboard(d), null);
  const second = sampleDashboard(await loadDashboard('Month'), 'Month');
  if (second.performance.state !== 'ready' || !second.performance.data.previous)
    throw new Error();
  second.performance.data.previous.orders = -1;
  assert.equal(parseDashboard(second), null);
});
