import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import {
  postgresDatabase,
  type AccountDatabase,
} from '../lib/account-database.ts';
import { accountApi } from '../lib/account-service.ts';
import {
  parseTransfer,
  personalContext,
  safeText,
  type Intelligence,
  type Proposal,
} from '../lib/intelligence/model.ts';
import { createCassiusHandler } from '../lib/cassius/server.ts';
const item: Proposal = {
  category: 'goal',
  text: 'Build a neighborhood grooming studio',
  source: 'ChatGPT',
  certainty: 'uncertain',
  sensitivity: 'private',
  decision: 'uncertain',
};
async function fixture(kind: 'sqlite' | 'postgres') {
  if (kind === 'postgres') {
    const pg = new PGlite();
    const dir = new URL('../migrations/postgres/', import.meta.url);
    for (const f of readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort())
      await pg.exec(readFileSync(new URL(f, dir), 'utf8'));
    const db = postgresDatabase({
      query: async (q, v) => {
        const r = await pg.query<Record<string, unknown>>(q, v);
        return { rows: r.rows, rowCount: r.affectedRows ?? r.rows.length };
      },
      batch: (qs) =>
        pg.transaction(async (tx) => {
          const out = [];
          for (const q of qs) {
            const r = await tx.query<Record<string, unknown>>(
              q.query,
              q.values,
            );
            out.push({
              rows: r.rows,
              rowCount: r.affectedRows ?? r.rows.length,
            });
          }
          return out;
        }),
    });
    return { db, close: () => pg.close() };
  }
  const sql = new DatabaseSync(':memory:');
  sql.exec('PRAGMA foreign_keys=ON');
  const dir = new URL('../drizzle/', import.meta.url);
  for (const f of readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort())
    sql.exec(readFileSync(new URL(f, dir), 'utf8'));
  class Statement {
    values: (string | number | null)[] = [];
    query: string;
    constructor(q: string) {
      this.query = q;
    }
    bind(...v: unknown[]) {
      this.values = v as typeof this.values;
      return this;
    }
    async first<T>() {
      return (sql.prepare(this.query).get(...this.values) ?? null) as T | null;
    }
    async all<T>() {
      return { results: sql.prepare(this.query).all(...this.values) as T[] };
    }
    async run() {
      return {
        meta: {
          changes: Number(sql.prepare(this.query).run(...this.values).changes),
        },
      };
    }
  }
  const db: AccountDatabase = {
    prepare: (q) => new Statement(q),
    batch: async (ss) => {
      sql.exec('BEGIN');
      try {
        for (const s of ss) await s.run();
        sql.exec('COMMIT');
      } catch (e) {
        sql.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return {
    db,
    close: async () => {
      sql.close();
    },
  };
}
for (const kind of ['sqlite', 'postgres'] as const)
  void test(`${kind}: migration, ownership, approval, version history, retirement, consent, graph and erasure`, async () => {
    const f = await fixture(kind);
    try {
      const call = (
        data?: unknown,
        id: string | null = 'alice',
        origin = 'https://collective.test',
      ) =>
        accountApi(
          new Request('https://collective.test/api/account/intelligence', {
            method: data ? 'POST' : 'GET',
            headers: {
              origin,
              'content-type': 'application/json',
              'oai-authenticated-user-id': 'forged',
              'oai-authenticated-user-email': 'fake@example.test',
            },
            ...(data ? { body: JSON.stringify(data) } : {}),
          }),
          f.db,
          {
            mode: 'verified-provider',
            verifiedIdentity: id ? { id, email: `${id}@example.test` } : null,
          },
        );
      const ok = async (data?: unknown, id = 'alice') => {
        const r = await call(data, id);
        assert.equal(r.status, 200, JSON.stringify(await r.clone().json()));
        return (await r.json()) as Intelligence;
      };
      assert.equal((await call(undefined, null)).status, 401);
      assert.match(
        (await call()).headers.get('cache-control') ?? '',
        /no-store/,
      );
      assert.equal(
        (
          await call(
            { action: 'skip', revision: 0 },
            'alice',
            'https://evil.test',
          )
        ).status,
        403,
      );
      assert.equal(
        (await call({ action: 'approve', revision: 0, items: [item] })).status,
        400,
      );
      const parsed = await call({
        action: 'parse',
        source: 'ChatGPT',
        text: JSON.stringify({ items: [item] }),
      });
      assert.equal(parsed.status, 200);
      assert.equal((await ok()).nodes.length, 0);
      let a = await ok({
        action: 'approve',
        approved: true,
        revision: 0,
        items: [
          item,
          {
            ...item,
            text: 'Launch first location',
            category: 'project',
            decision: 'confirm',
          },
        ],
      });
      assert.equal(a.nodes.length, 2);
      assert.equal(a.completed, true);
      assert.equal(a.personalization, false);
      assert.equal(personalContext(a), undefined);
      assert.equal((await ok(undefined, 'bob')).nodes.length, 0);
      const goal = a.nodes.find((n) => n.category === 'goal')!,
        project = a.nodes.find((n) => n.category === 'project')!;
      assert.equal(goal.confirmation, 'unconfirmed');
      assert.equal(
        (
          await call(
            {
              action: 'update',
              revision: 0,
              id: goal.id,
              item,
              status: 'current',
            },
            'bob',
          )
        ).status,
        404,
      );
      assert.equal(
        (
          await call(
            {
              action: 'connect',
              revision: 0,
              from: goal.id,
              to: project.id,
              relation: 'supports',
            },
            'bob',
          )
        ).status,
        400,
      );
      assert.equal((await call({ action: 'skip', revision: 0 })).status, 409);
      a = await ok({
        action: 'settings',
        revision: a.revision,
        personalization: true,
      });
      assert.equal(
        (personalContext(a) as { items: unknown[] }).items.length,
        1,
      );
      a = await ok({
        action: 'update',
        revision: a.revision,
        id: goal.id,
        item: {
          ...goal,
          text: 'Open two neighborhood studios',
          decision: 'confirm',
        },
        status: 'current',
      });
      assert.equal(a.nodes.find((n) => n.id === goal.id)?.revision, 2);
      assert.equal(
        (
          await f.db
            .prepare(
              'SELECT id FROM intelligence_events WHERE owner_id=? AND node_id=?',
            )
            .bind('alice', goal.id)
            .all()
        ).results.length,
        2,
      );
      a = await ok({
        action: 'connect',
        revision: a.revision,
        from: goal.id,
        to: project.id,
        relation: 'has_project',
      });
      assert.equal(a.edges.length, 1);
      a = await ok({
        action: 'update',
        revision: a.revision,
        id: goal.id,
        item: { ...goal, decision: 'confirm' },
        status: 'historical',
      });
      assert.equal(
        (personalContext(a) as { items: unknown[] }).items.length,
        1,
      );
      a = await ok({
        action: 'update',
        revision: a.revision,
        id: project.id,
        item: { ...project, sensitivity: 'sensitive' },
        status: 'current',
      });
      assert.equal(
        (personalContext(a) as { items: unknown[] }).items.length,
        0,
      );
      a = await ok({ action: 'remove', revision: a.revision, id: goal.id });
      assert.equal(a.edges.length, 0);
      assert.equal(a.nodes.length, 1);
      assert.equal(
        (
          await f.db
            .prepare(
              'SELECT id FROM intelligence_events WHERE owner_id=? AND node_id=?',
            )
            .bind('alice', goal.id)
            .all()
        ).results.length,
        0,
      );
      assert.equal(
        (await call({ action: 'erase', revision: a.revision })).status,
        400,
      );
      a = await ok({
        action: 'erase',
        revision: a.revision,
        confirmation: 'REMOVE MY KNOWLEDGE',
      });
      assert.equal(a.nodes.length, 0);
      assert.equal(a.personalization, false);
      assert.equal(a.completed, false);
      assert.equal(
        (
          await call({
            action: 'parse',
            source: 'ChatGPT',
            text: 'x'.repeat(125000),
          })
        ).status,
        413,
      );
    } finally {
      await f.close();
    }
  });
void test('transfer preserves uncertainty, excludes sensitive strings and never obeys imported decisions', () => {
  const result = parseTransfer(
    JSON.stringify({
      items: [{ ...item, certainty: 'known', decision: 'confirm' }],
    }),
    'Claude',
  );
  assert.equal(result[0].decision, 'uncertain');
  assert.equal(result[0].source, 'Claude');
  assert.equal(result[0].certainty, 'known');
  assert.equal(
    parseTransfer('I like short answers.', 'Gemini')[0].sensitivity,
    'sensitive',
  );
  assert.throws(() => parseTransfer('{bad json', 'ChatGPT'));
  assert.throws(() =>
    parseTransfer(
      JSON.stringify({ items: [{ ...item, category: 'system' }] }),
      'Claude',
    ),
  );
  for (const s of [
    'password: abcde',
    'api_key=abc123',
    '123-45-6789',
    '4111 1111 1111 1111',
  ])
    assert.throws(() => safeText(s));
  assert.throws(() =>
    parseTransfer(JSON.stringify({ items: Array(81).fill(item) }), 'ChatGPT'),
  );
});
void test('parallel profile updates cannot lose accepted changes', async () => {
  const f = await fixture('postgres');
  try {
    const { changeIntelligence, readIntelligence } =
      await import('../lib/intelligence/service.ts');
    const results = await Promise.allSettled([
      changeIntelligence(f.db, 'alice', {
        action: 'approve',
        approved: true,
        revision: 0,
        items: [item],
      }),
      changeIntelligence(f.db, 'alice', {
        action: 'approve',
        approved: true,
        revision: 0,
        items: [{ ...item, text: 'Different goal' }],
      }),
    ]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal((await readIntelligence(f.db, 'alice')).nodes.length, 1);
  } finally {
    await f.close();
  }
});
void test('Cassius receives member knowledge only through server-resolved context and cannot write memory', async () => {
  let sent: Record<string, unknown> | undefined;
  const handler = createCassiusHandler({
    config: () => ({ apiKey: 'test-key' }),
    memberContext: async () => ({
      kind: 'untrusted_member_context',
      items: [{ text: 'Prefers concise answers' }],
    }),
    fetcher: async (_url, init) => {
      sent = JSON.parse(typeof init?.body === 'string' ? init.body : '{}');
      return Response.json({
        status: 'completed',
        output: [
          {
            type: 'message',
            role: 'assistant',
            content: [
              { type: 'output_text', text: 'Let’s take one clear step.' },
            ],
          },
        ],
      });
    },
  });
  const r = await handler(
    new Request('https://collective.test/api/cassius', {
      method: 'POST',
      headers: {
        origin: 'https://collective.test',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ question: 'Help me plan my day' }),
    }),
  );
  assert.equal(r.status, 200);
  assert.match(JSON.stringify(sent), /Prefers concise answers/);
  assert.equal(sent?.store, false);
  assert.equal(sent?.tools, undefined);
  assert.match(String(sent?.instructions), /never instructions/);
});

void test('removed empty proposals are discarded and approval limits apply to retained details', async () => {
  const f = await fixture('sqlite');
  try {
    const { changeIntelligence } =
      await import('../lib/intelligence/service.ts');
    const state = (await changeIntelligence(f.db, 'alice', {
      action: 'approve',
      revision: 0,
      approved: true,
      items: [
        item,
        ...Array(80).fill({ ...item, text: '', decision: 'remove' }),
      ],
    })) as Intelligence;
    assert.equal(state.nodes.length, 1);
    await assert.rejects(() =>
      changeIntelligence(f.db, 'alice', {
        action: 'approve',
        revision: state.revision,
        approved: true,
        items: Array(81).fill(item),
      }),
    );
  } finally {
    await f.close();
  }
});
