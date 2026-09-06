import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  validateSubmission,
  type Submission,
} from '../lib/product-brain/schema.ts';
import {
  productBrain,
  getDossier,
  answerProductBrain,
} from '../lib/product-brain/runtime.ts';
import {
  answerKnowledge,
  buildKnowledgeContext,
} from '../lib/cassius/retrieval.ts';
import { corpus } from '../lib/cassius/corpus.ts';
import { knowledge } from '../lib/product-knowledge.ts';
const store = JSON.parse(
  readFileSync(
    new URL('../knowledge/ggc/product-brain/store.json', import.meta.url),
    'utf8',
  ),
);
const auditRoot = new URL(
  '../knowledge/ggc/product-brain/audits/2026-09-06/',
  import.meta.url,
);
const members = JSON.parse(
  readFileSync(new URL('raw/collection-members.json', auditRoot), 'utf8'),
).products as { handle: string }[];
const sub = (h: string): Submission =>
  structuredClone(
    store.submissions.find(
      (s: Submission) => s.dossier.productId === 'ggc-' + h,
    ),
  );
void test('all eleven live collection members audited, final membership page empty, broken link explicit', () => {
  assert.equal(members.length, 11);
  assert.deepEqual(
    JSON.parse(
      readFileSync(
        new URL('raw/collection-members-page2.json', auditRoot),
        'utf8',
      ),
    ).products,
    [],
  );
  for (const m of members) {
    const d = getDossier('ggc-' + m.handle)!;
    assert.ok(d);
    assert.ok(d.supplement!.rows.length);
    assert.ok(d.supplement!.fields.otherIngredients.value);
    assert.ok(d.supplement!.fields.directions.value);
    assert.ok(d.supplement!.fields.warnings.value);
    assert.equal(d.sections.claims.approvedMarketing.value, null);
  }
  assert.equal(
    getDossier('ggc-hydration-powder-lemonade')!.supplement!.fields.facts.value,
    null,
  );
});
void test('label row amount and DV cannot be invented or borrowed from another row', () => {
  for (const [key, value] of [
    ['amount', '999 mg'],
    ['dailyValue', '900% DV'],
    ['name', 'Invented Ingredient'],
  ] as const) {
    const s = sub('focus-powder-sour-candy');
    s.dossier.supplement!.rows[2][key].value = value;
    assert.throws(() => validateSubmission(s), /same source row/);
  }
  const s = sub('focus-powder-sour-candy');
  s.dossier.supplement!.rows[2].amount = s.dossier.supplement!.rows[3].amount;
  assert.throws(() => validateSubmission(s), /same source row/);
});
void test('ingredient projection rejects invented amount and nonexistent ingredient', () => {
  const s = sub('nmn');
  s.dossier.ingredients[0].fields.concentration.value = '750 mg';
  assert.throws(() => validateSubmission(s), /amount/);
  const n = sub('nmn');
  n.dossier.ingredients[0].fields.name.value = 'Testosterone';
  assert.throws(() => validateSubmission(n), /name/);
});
void test('serving amounts cannot be silently changed or converted', () => {
  const s = sub('magnesium-glycinate');
  s.dossier.supplement!.fields.servingSize.value = '1 capsule';
  assert.throws(() => validateSubmission(s), /Serving/);
  const d = getDossier('ggc-magnesium-glycinate')!;
  assert.equal(d.supplement!.fields.servingSize.value, '3 capsules');
  assert.equal(d.supplement!.rows[0].amount.status, 'disputed');
});
void test('Nocturne blend total never populates its fourteen individual member amounts', () => {
  const d = getDossier('ggc-sleep-support')!;
  const members = d.ingredients.filter((x) => x.id.startsWith('blend-member-'));
  assert.equal(members.length, 14);
  assert.ok(members.every((x) => x.fields.concentration.value === null));
  assert.equal(
    d.supplement!.rows.find(
      (r) => r.name.value === 'Sleep Formula Proprietary Blend',
    )!.amount.value,
    '905 mg',
  );
  assert.match(
    answerKnowledge('Nocturne ingredients').text,
    /Individual amounts.*unknown/,
  );
});
void test('Cassius retrieves all current label tables within context budget', () => {
  for (const m of members) {
    const d = getDossier('ggc-' + m.handle)!;
    const a = answerProductBrain('Supplement Facts ingredients', [
      d.productId,
    ])!;
    assert.ok(a.passages.some((p) => p.id.endsWith('supplement.facts')));
    assert.ok(a.citations.every((c) => c.retrievedAt.startsWith('2026-09-06')));
  }
  for (const name of [
    'Ascend',
    'Nocturne',
    'Restoria',
    'Nexus',
    'Vitalis',
    'Solaris',
    'Genesis',
    'Fortius Aqua',
    'Hydros Peach Mango',
    'Hydros Passion Fruit',
    'Hydros Golden Lychee',
  ]) {
    const c = buildKnowledgeContext(name + ' Supplement Facts');
    assert.notEqual(c.state, 'clarify', name);
    assert.ok(
      c.passages.some((p) => p.id.endsWith('supplement.facts')),
      name,
    );
  }
});
void test('Hydros requires flavor; Lemonade cannot borrow any live formula', () => {
  assert.equal(answerKnowledge('Hydros ingredients').state, 'clarify');
  const a = answerKnowledge('Hydros Lemonade ingredients');
  assert.match(a.text, /404/);
  assert.ok(!a.text.includes('0.56 mg'));
  assert.deepEqual(a.productIds, ['ggc-hydration-powder-lemonade']);
});
void test('conflicts and source-only claims survive shared Product Studio and corpus projections', () => {
  for (const m of members) {
    const id = 'ggc-' + m.handle;
    assert.ok(knowledge.products.some((p) => p.id === id));
    const p = corpus.products.find((p) => p.id === id)!;
    assert.ok(p.supplementFacts.value);
    assert.deepEqual(p.approvedClaims, []);
  }
  assert.match(answerKnowledge('Nexus ingredients').text, /96%/);
  assert.match(
    answerKnowledge('Hydros Peach Mango ingredients').text,
    /Beta Carotene/,
  );
  assert.ok(!JSON.stringify(productBrain).includes('"raw":'));
});
void test('supplement medication safety remains a deterministic boundary', () => {
  assert.equal(answerKnowledge('Nocturne with SSRIs').state, 'safety-boundary');
  assert.match(answerKnowledge('Ascend caffeine').text, /200 mg/);
});
void test('archived HTML, membership pages, product data and images match their integrity manifest', async()=>{
 const {createHash}=await import('node:crypto');
 const manifest=JSON.parse(readFileSync(new URL('integrity.json',auditRoot),'utf8')) as {path:string;sha256:string}[];
 for(const entry of manifest)assert.equal(createHash('sha256').update(readFileSync(new URL(entry.path,auditRoot))).digest('hex'),entry.sha256,entry.path);
 const links=JSON.parse(readFileSync(new URL('discovery-links.json',auditRoot),'utf8')) as string[];
 const handled=new Set([...members.map(m=>'/products/'+m.handle),'/products/hydration-powder-lemonade','/products/barbers-blend-grooming-oil']);
 assert.ok(links.every(link=>handled.has(link)),'Every collection product link must have a disposition');
});
