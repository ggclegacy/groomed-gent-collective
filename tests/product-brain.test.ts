import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  emptyDossier,
  unknown,
  validateSubmission,
  coverage,
  type Submission,
} from '../lib/product-brain/schema.ts';
import { ingest, release, validateStore } from '../lib/product-brain/store.ts';
import {
  answerProductBrain,
  productBrain,
  mergeProductCorpus,
} from '../lib/product-brain/runtime.ts';
import {
  buildKnowledgeContext,
  answerKnowledge,
} from '../lib/cassius/retrieval.ts';
import {
  conversationContext,
  conversationInstructions,
} from '../lib/cassius/conversation.ts';
import { knowledge, approvedFacts } from '../lib/product-knowledge.ts';
const now = '2026-09-06T12:00:00.000Z';
function fixture(): Submission {
  const d = emptyDossier('test-product');
  d.sections.identity.officialName = {
    ...unknown(),
    value: 'TEST PRODUCT',
    status: 'verified',
    evidence: [
      {
        sourceId: 'test-source',
        quote: 'TEST PRODUCT',
        locator: 'test fixture',
      },
    ],
    verifiedBy: 'Test reviewer',
    verifiedAt: now,
  };
  return {
    idempotencyKey: 'test-intake',
    expectedRevision: null,
    intelligence: [],
    sources: [
      {
        id: 'test-source',
        kind: 'founder',
        locator: 'test-only',
        capturedAt: now,
        raw: 'TEST PRODUCT',
      },
    ],
    dossier: d,
  };
}
const empty = () => ({ schemaVersion: 1 as const, submissions: [] });
void test('required fields, unknown nulls and exact source quotation validation', () => {
  const s = fixture();
  validateSubmission(s);
  assert.ok(
    coverage(s.dossier).unknown.includes('formula.completeDeclaration'),
  );
  const bad = structuredClone(s);
  bad.dossier.sections.use.amount.value = '5';
  assert.throws(() => validateSubmission(bad), /unknown/);
  const wrong = structuredClone(s);
  wrong.dossier.sections.identity.officialName.evidence[0].quote =
    'NOT IN SOURCE';
  assert.throws(() => validateSubmission(wrong), /quote/);
  const missing = structuredClone(s);
  delete missing.dossier.sections.identity.sku;
  assert.throws(() => validateSubmission(missing), /missing/);
});
void test('website and research cannot masquerade as verified GGC truth', () => {
  for (const kind of ['website', 'research', 'competitor'] as const) {
    const s = fixture();
    s.sources[0].kind = kind;
    assert.throws(() => validateSubmission(s));
  }
  const s = fixture();
  s.dossier.sections.identity.officialName.layer = 'model-reasoning';
  assert.throws(() => validateSubmission(s));
});
void test('ingestion is idempotent and rejects conflicting keys and stale corrections', () => {
  const s = fixture(),
    first = ingest(empty(), s);
  assert.equal(ingest(first, s), first);
  const conflict = structuredClone(s);
  conflict.dossier.reason = 'changed';
  assert.throws(() => ingest(first, conflict), /Idempotency/);
  conflict.idempotencyKey = 'other-key';
  assert.throws(() => ingest(first, conflict), /Stale/);
});
void test('corrections preserve history; unknowns do not borrow old facts', () => {
  const s = fixture();
  const a = ingest(empty(), s);
  const next = structuredClone(s);
  next.idempotencyKey = 'test-correction';
  next.expectedRevision = 1;
  next.dossier.previousRevision = 1;
  next.dossier.revision = 2;
  next.dossier.change = 'correction';
  next.dossier.sections.identity.officialName.status = 'unverified';
  next.dossier.sections.identity.officialName.verifiedBy = null;
  next.dossier.sections.identity.officialName.verifiedAt = null;
  const b = ingest(a, next);
  assert.equal(
    b.submissions[0].dossier.sections.identity.officialName.status,
    'verified',
  );
  assert.equal(release(b).products[0].dossier.revision, 2);
  assert.equal(a.submissions.length, 1);
  const answer = answerProductBrain('TEST PRODUCT ingredients', [], release(b));
  assert.match(answer!.text, /Unknown: not supplied/);
  assert.equal(answer!.state, 'unknown');
});
void test('source records are immutable and reformulations require distinct formula versions', () => {
  const s = fixture();
  const a = ingest(empty(), s);
  const n = structuredClone(s);
  n.expectedRevision = 1;
  n.dossier.previousRevision = 1;
  n.dossier.revision = 2;
  n.idempotencyKey = 'next';
  n.dossier.change = 'reformulation';
  assert.throws(() => ingest(a, n), /formula version/);
  n.dossier.change = 'correction';
  n.sources[0].raw += ' changed';
  assert.throws(() => ingest(a, n), /immutable/);
});
void test('release strips raw sources and exactly matches immutable store', () => {
  const store = JSON.parse(
    readFileSync(
      new URL('../knowledge/ggc/product-brain/store.json', import.meta.url),
      'utf8',
    ),
  );
  validateStore(store);
  assert.deepEqual(release(store), productBrain);
  assert.ok(!JSON.stringify(productBrain).includes('"raw":'));
});
void test('Barber intake keeps conflicting lists, pricing and all amounts unverified', () => {
  const d = productBrain.products[0].dossier;
  assert.equal(d.ingredients.length, 12);
  assert.equal(d.sections.formula.completeDeclaration.status, 'disputed');
  assert.equal(d.sections.identity.price.status, 'disputed');
  assert.equal(coverage(d).verified.length, 0);
  assert.ok(d.ingredients.every((r) => r.fields.concentration.value === null));
  assert.equal(d.sections.claims.approvedMarketing.value, null);
});
void test('Cassius and Creator retrieval prefer current dossier over old website passages', () => {
  const answer = answerKnowledge("Barber's Blend ingredients");
  assert.ok(answer.passages.every((p) => p.id.includes('.r1.')));
  assert.match(answer.text, /broccoli/i);
  assert.match(answer.text, /disputed/i);
  const c = buildKnowledgeContext("Barber's Blend price");
  assert.ok(c.passages.some((p) => p.id.endsWith('identity.price')));
  assert.ok(c.passages.every((p) => p.id.includes('.r1.')));
});
void test('conversation follow-ups carry canonical context and layer policy', () => {
  const c = conversationContext('What does it contain?', [
    { role: 'user', content: "Barber's Blend" },
  ]);
  assert.ok(c.knowledge?.passages.some((p) => p.id.includes('.r1.')));
  assert.match(
    conversationInstructions,
    /Model reasoning is interpretation only/,
  );
});
void test('Product Studio uses shared product identity without promoting observations', () => {
  const p = knowledge.products.find(
    (p) => p.id === 'ggc-barbers-blend-grooming-oil',
  )!;
  assert.ok(p);
  assert.equal(p.concept, false);
  assert.deepEqual(approvedFacts(p, knowledge), []);
});
void test('safety and context overflow fail closed', () => {
  assert.equal(
    answerKnowledge("Is Barber's Blend safe with medication?").state,
    'safety-boundary',
  );
  const context = buildKnowledgeContext("Barber's Blend ingredients", 20);
  assert.equal(context.state, 'clarify');
  assert.deepEqual(context.passages, []);
});
void test('new canonical identity can enter shared catalog without fabricated category', () => {
  const r = release(ingest(empty(), fixture()));
  const c = mergeProductCorpus(
    {
      version: 'test',
      reviewedAt: now,
      products: [],
      topics: [],
      sources: [],
      issues: [],
    },
    r,
  );
  assert.equal(c.products.length, 1);
  assert.equal(c.products[0].kind, 'unknown');
  assert.equal(c.products[0].ingredients.value, null);
});
