import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDashboard } from '../lib/dashboard/service.ts';
import { sampleDashboard } from '../lib/dashboard/sample.ts';
import {
  bestMove,
  change,
  currency,
  visiblePulse,
  periods,
} from '../lib/dashboard/model.ts';
import { parseDashboard } from '../lib/dashboard/validate.ts';
import { createCassiusHandler } from '../lib/cassius/server.ts';
void test('disconnected data stays unavailable, without invented tiers or campaigns', async () => {
  const d = await loadDashboard('Month');
  assert.equal(d.performance.state, 'disconnected');
  assert.equal(d.membership.next, null);
  assert.equal(currency(null), '—');
  assert.equal(bestMove(d).id, 'foundation');
  assert.ok(parseDashboard(d));
});
void test('sample is explicit in every period and recommendations use canonical product ids', async () => {
  const base = await loadDashboard('Month');
  for (const period of periods) {
    const d = sampleDashboard(base, period);
    assert.equal(d.mode, 'sample');
    assert.ok(parseDashboard(d));
    assert.equal(bestMove(d).action.productId, 'ggc-barbers-blend-grooming-oil');
  }
  assert.equal(base.performance.state, 'disconnected');
});
void test('money comparisons handle zero, missing, negative and mixed currencies', () => {
  const usd = (minorUnits: number) => ({ minorUnits, currency: 'USD' });
  assert.equal(change(usd(100), usd(0)), 'First earnings this period');
  assert.equal(change(usd(0), usd(0)), 'No change from prior period');
  assert.equal(change(usd(100), null), 'Prior period unavailable');
  assert.equal(
    change(usd(100), { minorUnits: 50, currency: 'EUR' }),
    'Prior period unavailable',
  );
  assert.equal(currency(usd(-250)), '-$2.50');
});
void test('pulse excludes expired, future, and ineligible items and prioritizes without mutation', async () => {
  const d = await loadDashboard('Month');
  const item = d.pulse[0];
  const items = [
    { ...item, id: 'expired', endsAt: '2020-01-01' },
    { ...item, id: 'future', startsAt: '2099-01-01' },
    { ...item, id: 'tier', tierIds: ['gold'] },
    { ...item, id: 'segment', segments: ['Barber'] },
    { ...item, id: 'eligible', priority: 99 },
  ];
  assert.deepEqual(
    visiblePulse(items, null, null, new Date('2026-09-05')).map((i) => i.id),
    ['eligible'],
  );
  assert.equal(items.length, 5);
});
void test('malformed financial payloads and arbitrary destinations are rejected', async () => {
  const base = await loadDashboard('Month');
  const d = sampleDashboard(base, 'Month');
  assert.equal(
    parseDashboard({
      ...base,
      pulse: [
        {
          ...base.pulse[0],
          action: { label: 'bad', destination: 'https://evil.test' },
        },
      ],
    }),
    null,
  );
  if (d.performance.state !== 'ready') throw new Error();
  assert.equal(
    parseDashboard({
      ...d,
      performance: {
        ...d.performance,
        data: { ...d.performance.data, orders: -1 },
      },
    }),
    null,
  );
  assert.equal(
    parseDashboard({
      ...d,
      performance: {
        ...d.performance,
        data: {
          ...d.performance.data,
          earnedCommission: { minorUnits: NaN, currency: 'USD' },
        },
      },
    }),
    null,
  );
});
void test('no sales and partial performance do not manufacture a product winner', async () => {
  const d = sampleDashboard(await loadDashboard('Month'), 'Month');
  if (d.performance.state !== 'ready') throw new Error();
  d.performance.data.orders = 0;
  d.performance.data.products = [];
  d.pulse = [];
  d.performance.data.earnedCommission = null;
  assert.equal(bestMove(d).id, 'foundation');
  assert.ok(parseDashboard(d));
});
void test('growth uses existing Cassius model configuration and server context', async () => {
  let body: Record<string, unknown> | undefined;
  const handler = createCassiusHandler({
    config: () => ({ apiKey: 'test-only', model: 'gpt-4.1-mini' }),
    referenceContext: async () => ({ serverSignal: 'reporting-disconnected' }),
    fetcher: async (_input, init) => {
      if (typeof init?.body !== 'string') throw new Error();
      body = JSON.parse(init.body);
      return Response.json({
        status: 'completed',
        output: [
          {
            type: 'message',
            role: 'assistant',
            content: [
              { type: 'output_text', text: 'Prepare one product question.' },
            ],
          },
        ],
      });
    },
  });
  const result = await handler(
    new Request('http://localhost/api/dashboard/move', {
      method: 'POST',
      headers: {
        origin: 'http://localhost',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        question: 'Help me tell the Groomed Gent brand story.',
      }),
    }),
  );
  assert.equal(result.status, 200);
  assert.equal(body?.model, 'gpt-4.1-mini');
  assert.match(JSON.stringify(body), /reporting-disconnected/);
  assert.equal(body?.store, false);
});
