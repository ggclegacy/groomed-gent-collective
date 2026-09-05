import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDraft,
  demoAmbassador,
  demoGateway,
  disconnectedPerformance,
  metricLabel,
  parseProfile,
  type IntegrationResult,
  type Performance,
} from '../lib/collective.ts';
void test('disconnected reporting never presents fabricated zero activity', () => {
  assert.equal(metricLabel(disconnectedPerformance, 'clicks'), '—');
  assert.equal(metricLabel(disconnectedPerformance, 'orders'), '—');
});
void test('an actual connected zero is distinguishable from unavailable data', () => {
  const result: IntegrationResult<Performance> = {
    state: 'ready',
    source: 'test',
    updatedAt: '2026-09-05T00:00:00Z',
    data: {
      clicks: 0,
      orders: 0,
      revenue: { minorUnits: 0, currency: 'USD' },
      pendingCommission: { minorUnits: 0, currency: 'USD' },
      approvedCommission: { minorUnits: 0, currency: 'USD' },
      paidCommission: { minorUnits: 0, currency: 'USD' },
      period: { from: '2026-09-01', to: '2026-09-05' },
    },
  };
  assert.equal(metricLabel(result, 'clicks'), '0');
});
void test('all commerce, knowledge and AI adapters explicitly report disconnected', async () => {
  for (const result of await Promise.all([
    demoGateway.getPerformance('demo-member'),
    demoGateway.getProducts(),
    demoGateway.askIntelligence('Recommend a product'),
  ]))
    assert.equal(result.state, 'disconnected');
});
void test('the fixture cannot impersonate a working referral destination', () => {
  assert.equal(demoAmbassador.mode, 'demo');
  assert.equal(new URL(demoAmbassador.referralUrl).hostname, 'example.com');
});
void test('profile storage validates malformed and unexpected input', () => {
  for (const input of [
    null,
    'broken',
    'null',
    '[]',
    '{}',
    '{"name":"","kind":"Barber"}',
    '{"name":"A","kind":"Administrator"}',
    JSON.stringify({ name: 'A'.repeat(81), kind: 'Barber' }),
    JSON.stringify({ name: 44, kind: 'Barber' }),
  ])
    assert.equal(parseProfile(input), null);
});
void test('profile storage trims names and preserves the accepted partner type', () =>
  assert.deepEqual(parseProfile('{"name":"  Alex  ","kind":"Barber"}'), {
    name: 'Alex',
    kind: 'Barber',
  }));
void test('every creator context preserves explicit unfinished product and disclosure prompts', () => {
  for (const context of ['At the chair', 'After training', 'On the road'])
    for (const format of ['Short caption', 'Conversation starter']) {
      const draft = createDraft(context, format);
      assert.match(draft, /\[Add an approved product detail/);
      assert.match(draft, /disclose your relationship/);
      assert.doesNotMatch(draft, /GENT-DEMO|20%|commission|clinically/i);
    }
});
void test('creator formats and contexts produce meaningfully different drafts', () => {
  assert.notEqual(
    createDraft('At the chair', 'Short caption'),
    createDraft('On the road', 'Short caption'),
  );
  assert.notEqual(
    createDraft('At the chair', 'Short caption'),
    createDraft('At the chair', 'Conversation starter'),
  );
});
