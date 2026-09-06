import test from 'node:test';
import assert from 'node:assert/strict';
import { productBrain } from '../lib/product-brain/runtime.ts';
import {
  applyLearning,
  cardsFor,
  catalogCards,
  creatorBrief,
  customerCard,
  emptyLearning,
  mastery,
  parseCommand,
  reviewQueue,
  type AnswerCommand,
} from '../lib/product-mastery/model.ts';
import { resolveProductHandoff } from '../lib/product-mastery/handoff.ts';
import { coachPrompt } from '../lib/product-mastery/coaching.ts';
const cards = catalogCards();
const card = cards.find((c) => c.id.includes('/amount-'))!;
const command = (patch: Partial<AnswerCommand> = {}): AnswerCommand => ({
  action: 'answer',
  id: 'attempt-000001',
  cardId: card.id,
  version: card.version,
  answer: card.answer,
  confidence: 3,
  mode: 'recall',
  ...patch,
});

void test('every canonical product has traceable lessons; no disputed value is a recall answer', () => {
  assert.equal(new Set(cards.map((c) => c.id)).size, cards.length);
  for (const p of productBrain.products) {
    assert.ok(cardsFor(p.dossier).length > 0);
  }
  for (const c of cards) {
    assert.ok(c.question && c.version && c.explanation);
    if (c.options.length) assert.ok(c.options.includes(c.answer));
    if (c.id.includes('/amount-') || c.id.endsWith('/serving')) {
      assert.ok(
        c.fields.every(
          (f) =>
            !['unknown', 'disputed'].includes(f.field.status) &&
            f.field.evidence.length,
        ),
      );
      assert.ok(c.fields.some((f) => f.field.value === c.answer));
    }
  }
  const no = cards.filter(
    (c) => c.productId === 'ggc-hydration-powder-lemonade',
  );
  assert.equal(no.filter((c) => c.id.includes('/amount-')).length, 0);
});
void test('unknown blend member amounts cannot become formula exercises', () => {
  const d = productBrain.products.find(
    (p) => p.dossier.productId === 'ggc-sleep-support',
  )!.dossier;
  for (const r of d.supplement!.rows.filter((r) => !r.amount.value))
    assert.ok(!cardsFor(d).some((c) => c.id.endsWith('/amount-' + r.id)));
  const disputed = structuredClone(
    productBrain.products.find((p) => p.dossier.productId === card.productId)!
      .dossier,
  );
  const row = disputed.supplement!.rows.find((r) =>
    card.id.endsWith('/amount-' + r.id),
  )!;
  row.amount.status = 'disputed';
  assert.ok(!cardsFor(disputed).some((c) => c.id === card.id));
});
void test('server grading ignores supplied scores and rejects stale facts', () => {
  const parsed = parseCommand({
    ...command({ answer: 'invented 9999mg' }),
    correct: true,
    successes: 999,
  });
  const s = applyLearning(emptyLearning(), parsed, '2026-09-06T10:00:00Z');
  assert.equal(s.attempts[0].correct, false);
  assert.equal(s.records[card.id].successes, 0);
  assert.throws(
    () => applyLearning(s, command({ id: 'attempt-000002', version: 'stale' })),
    /changed/,
  );
  assert.throws(() => parseCommand(command({ confidence: 7 })), /Invalid/);
});
void test('delayed recall earns mastery; immediate retries and revealed answers do not', () => {
  let s = applyLearning(emptyLearning(), command(), '2026-09-06T10:00:00Z');
  assert.equal(s.records[card.id].delayed, 0);
  s = applyLearning(
    s,
    command({ id: 'attempt-000002' }),
    '2026-09-06T10:01:00Z',
  );
  assert.equal(s.attempts[1].assessed, false);
  assert.equal(s.records[card.id].successes, 1);
  s = applyLearning(
    s,
    command({ id: 'attempt-000003', mode: 'guided' }),
    '2026-09-07T10:02:00Z',
  );
  assert.equal(s.records[card.id].delayed, 0);
  s = applyLearning(
    s,
    command({ id: 'attempt-000004' }),
    '2026-09-08T10:03:00Z',
  );
  assert.equal(s.records[card.id].delayed, 1);
  assert.equal(
    mastery(s, [card]).find((r) => r.skill === card.skill)!.learned,
    1,
  );
  assert.equal(applyLearning(s, command({ id: 'attempt-000004' })), s);
});
void test('confidence and errors affect review timing and stale facts get targeted refreshers', () => {
  const time = '2026-09-06T10:00:00Z';
  const high = applyLearning(emptyLearning(), command(), time);
  const low = applyLearning(emptyLearning(), command({ confidence: 1 }), time);
  const wrong = applyLearning(
    emptyLearning(),
    command({ answer: 'wrong' }),
    time,
  );
  assert.ok(
    Date.parse(wrong.records[card.id].dueAt) <
      Date.parse(low.records[card.id].dueAt),
  );
  assert.ok(
    Date.parse(low.records[card.id].dueAt) <
      Date.parse(high.records[card.id].dueAt),
  );
  const changed = { ...card, version: 'new-field-version' };
  assert.equal(
    reviewQueue(high, [cards.find((c) => c.id !== card.id)!, changed])[0]
      .version,
    'new-field-version',
  );
  assert.equal(
    mastery(high, [changed]).find((r) => r.skill === card.skill)!.learned,
    0,
  );
});
void test('a changed fact invalidates only exercises that depend on it', () => {
  const d = structuredClone(
    productBrain.products.find((p) => p.dossier.productId === card.productId)!
      .dossier,
  );
  const before = cardsFor(d);
  d.sections.identity.price.value = 'price updated';
  assert.deepEqual(
    cardsFor(d).map((c) => c.version),
    before.map((c) => c.version),
  );
  const row = d.supplement!.rows.find((r) =>
    card.id.endsWith('/amount-' + r.id),
  )!;
  row.amount.value = 'TEST CHANGE';
  const after = cardsFor(d);
  assert.notEqual(after.find((c) => c.id === card.id)!.version, card.version);
  assert.equal(
    after.find((c) => c.id.endsWith('/claims'))!.version,
    before.find((c) => c.id.endsWith('/claims'))!.version,
  );
});
void test('website claims cannot unlock promotional copy; handoff resolves current facts', () => {
  const d = productBrain.products.find(
    (p) => p.dossier.productId === card.productId,
  )!.dossier;
  assert.equal(customerCard(d, 'Commission disclosure'), null);
  assert.match(
    creatorBrief(d, 'Commission disclosure'),
    /No reviewed marketing copy/,
  );
  const draft = resolveProductHandoff(
    '?productBrief=' + encodeURIComponent(d.productId),
    'draft-0001',
    '2026-09-06T00:00:00Z',
  );
  assert.ok(draft);
  assert.equal(draft.review.claims, false);
  assert.match(draft.body, new RegExp('Revision: ' + d.revision));
  assert.equal(
    resolveProductHandoff(
      '?productBrief=unknown',
      'draft-0001',
      '2026-09-06T00:00:00Z',
    ),
    null,
  );
  assert.ok(!draft.body.includes('9999mg'));
});
void test('coaching binds current product and learning gaps with formative feedback boundaries', () => {
  const d = productBrain.products[0].dossier;
  const prompt = coachPrompt(
    d,
    emptyLearning(),
    'Barber',
    'Check my explanation',
    'feedback',
  );
  assert.ok(prompt.includes(d.productId));
  assert.match(prompt, /factual accuracy/);
  assert.match(prompt, /No numeric grades/);
  assert.match(prompt, /untrusted conversation/);
  assert.match(prompt, /exact current product fact IDs/);
});

void test('product coaching reaches the real transport contract and keeps provider failure explicit', async () => {
  const { askCassius } = await import('../lib/cassius/client.ts');
  const { createCassiusHandler } = await import('../lib/cassius/server.ts');
  const d = productBrain.products.find(
    (p) => p.dossier.productId === card.productId,
  )!.dossier;
  let sent = '';
  const handler = createCassiusHandler({
    config: () => ({ apiKey: 'test-only' }),
    fetcher: async (_url, init) => {
      sent = typeof init?.body === 'string' ? init.body : '';
      return Response.json({
        status: 'completed',
        output: [
          {
            type: 'message',
            role: 'assistant',
            content: [
              {
                type: 'output_text',
                text: 'What matters most in your current routine?',
              },
            ],
          },
        ],
      });
    },
  });
  const fetcher: typeof fetch = async (_url, init) =>
    handler(
      new Request('https://collective.test/api/cassius', {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          origin: 'https://collective.test',
        },
      }),
    );
  const result = await askCassius(
    coachPrompt(
      d,
      emptyLearning(),
      'Barber',
      'Begin the fictional customer scenario.',
      'practice',
    ),
    fetcher,
  );
  assert.equal(result.state, 'ready');
  assert.ok(sent.includes(d.productId));
  assert.ok(sent.includes('never invent product facts'));
  assert.ok(sent.includes('KNOWLEDGE LAYERS'));
  const offline = createCassiusHandler({ config: () => ({}) });
  const unavailable = await askCassius('practice', async (_url, init) =>
    offline(
      new Request('https://collective.test/api/cassius', {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          origin: 'https://collective.test',
        },
      }),
    ),
  );
  assert.equal(unavailable.state, 'error');
});
