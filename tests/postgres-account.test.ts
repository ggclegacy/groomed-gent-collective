import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import {
  postgresDatabase,
  postgresParameters,
} from '../lib/account-database.ts';
import { accountApi, getIdentity } from '../lib/account-service.ts';
import { emptyMemory } from '../lib/gentleman/model.ts';
void test('Postgres parameters leave SQL literals alone and never interpolate user data', () => {
  assert.equal(
    postgresParameters(
      "SELECT ? AS id, 'why?' AS question, 'it''s?' AS literal, ? AS value",
    ),
    "SELECT $1 AS id, 'why?' AS question, 'it''s?' AS literal, $2 AS value",
  );
  const request = new Request('https://collective.test', {
    headers: {
      'oai-authenticated-user-id': 'forged',
      'oai-authenticated-user-email': 'fake@example.test',
    },
  });
  assert.equal(getIdentity(request, { mode: 'verified-provider' }), null);
  assert.deepEqual(
    getIdentity(request, {
      mode: 'verified-provider',
      verifiedIdentity: { id: 'verified', email: 'real@example.test' },
    }),
    { id: 'verified', email: 'real@example.test' },
  );
});
void test('production SQL migrates and supports invitations, membership, isolated memory, revision conflicts and suspension', async () => {
  const pg = new PGlite();
  try {
    const dir = new URL('../migrations/postgres/', import.meta.url);
    for (const file of readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort())
      await pg.exec(readFileSync(new URL(file, dir), 'utf8'));
    const db = postgresDatabase({
      query: async (q, v) => {
        const r = await pg.query<Record<string, unknown>>(q, v);
        return { rows: r.rows, rowCount: r.affectedRows ?? r.rows.length };
      },
      batch: (queries) =>
        pg.transaction(async (tx) => {
          const out = [];
          for (const q of queries) {
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
    const call = (
      path: string,
      method = 'GET',
      body?: unknown,
      id: string | null = 'owner',
      origin = 'https://collective.test',
    ) =>
      accountApi(
        new Request(`https://collective.test/api/account${path}`, {
          method,
          headers: {
            origin,
            'content-type': 'application/json',
            'oai-authenticated-user-id': 'forged',
            'oai-authenticated-user-email': 'forged@example.test',
          },
          ...(method === 'GET' ? {} : { body: JSON.stringify(body) }),
        }),
        db,
        {
          mode: 'verified-provider',
          ownerId: 'owner',
          verifiedIdentity: id ? { id, email: `${id}@example.test` } : null,
        },
      );
    for (const id of ['alice', 'bob']) {
      const invite = await call('/invitations', 'POST', {
        name: id,
        email: `${id}@example.test`,
        track: 'ambassador',
      });
      assert.equal(
        invite.status,
        201,
        JSON.stringify(await invite.clone().json()),
      );
      const { token } = (await invite.json()) as { token: string };
      assert.equal((await call('/accept', 'POST', { token }, id)).status, 200);
    }
    const learning = await call('/learning', 'POST', { revision: 0, command: { action: 'goal', goal: 5 } }, 'alice');
    assert.equal(learning.status, 200, JSON.stringify(await learning.clone().json()));
    assert.equal(((await learning.json()) as { revision: number }).revision, 1);
    assert.equal((await call('/learning', 'POST', { revision: 0, command: { action: 'goal', goal: 3 } }, 'alice')).status, 409);
    const bobLearning = await call('/learning', 'GET', undefined, 'bob');
    assert.equal(((await bobLearning.json()) as { revision: number }).revision, 0);
    assert.equal((await call('/learning', 'GET', undefined, null)).status, 401);
    const m = emptyMemory();
    m.profile.name = 'Only Alice';
    const saved = await call(
      '/memory',
      'PUT',
      { revision: 0, memory: m },
      'alice',
    );
    assert.equal(saved.status, 200, JSON.stringify(await saved.clone().json()));
    assert.equal(
      (await call('/memory', 'PUT', { revision: 0, memory: m }, 'alice'))
        .status,
      409,
    );
    const own = await call('/memory', 'GET', undefined, 'alice');
    assert.equal(
      ((await own.json()) as { memory: { profile: { name: string } } }).memory
        .profile.name,
      'Only Alice',
    );
    const other = await call('/memory', 'GET', undefined, 'bob');
    assert.equal(
      ((await other.json()) as { memory: { profile: { name: string } } }).memory
        .profile.name,
      '',
    );
    assert.equal((await call('/memory', 'GET', undefined, null)).status, 401);
    assert.equal(
      (
        await call(
          '/memory',
          'PUT',
          { revision: 1, memory: m },
          'alice',
          'https://evil.test',
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await call('/members/status', 'POST', {
          id: 'alice',
          status: 'suspended',
        })
      ).status,
      200,
    );
    assert.equal(
      (await call('/memory', 'GET', undefined, 'alice')).status,
      403,
    );
    assert.equal(
      (await call('/memory', 'PUT', { revision: 1, memory: m }, 'alice'))
        .status,
      403,
    );
  } finally {
    await pg.close();
  }
});
