import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { accountApi, getIdentity } from '../lib/account-service.ts';
import { blankDraft } from '../lib/studio.ts';
const config = { mode: 'sites-dispatch', ownerId: 'founder' };
function fixture() {
  const sql = new DatabaseSync(':memory:');
  sql.exec('PRAGMA foreign_keys=ON');
  const dir = new URL('../drizzle/', import.meta.url);
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort())
    sql.exec(readFileSync(new URL(file, dir), 'utf8'));
  class Statement {
    values: (string | number | null)[] = [];
    readonly query: string;
    constructor(query: string) {
      this.query = query;
    }
    bind(...values: (string | number | null)[]) {
      this.values = values;
      return this;
    }
    async first() {
      return sql.prepare(this.query).get(...this.values) ?? null;
    }
    async all() {
      return { results: sql.prepare(this.query).all(...this.values) };
    }
    async run() {
      const result = sql.prepare(this.query).run(...this.values);
      return { meta: { changes: Number(result.changes) } };
    }
  }
  const db = {
    prepare: (query: string) => new Statement(query),
    batch: async (statements: Statement[]) => {
      sql.exec('BEGIN');
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        sql.exec('COMMIT');
        return results;
      } catch (error) {
        sql.exec('ROLLBACK');
        throw error;
      }
    },
  } as unknown as D1Database;
  const call = (
    path: string,
    method = 'GET',
    data?: unknown,
    id: string | null = 'founder',
    email = 'founder@example.test',
    origin = 'https://collective.test',
  ) =>
    accountApi(
      new Request(`https://collective.test/api/account${path}`, {
        method,
        headers: {
          ...(id
            ? {
                'oai-authenticated-user-id': id,
                'oai-authenticated-user-email': email,
              }
            : {}),
          Origin: origin,
          'Content-Type': 'application/json',
        },
        ...(method === 'GET' ? {} : { body: JSON.stringify(data) }),
      }),
      db,
      config,
    );
  async function invite(email: string, track = 'ambassador') {
    const result = await call('/invitations', 'POST', {
      email,
      name: 'Test member',
      track,
    });
    assert.equal(result.status, 201);
    return (await result.json()) as { id: string; token: string };
  }
  async function join(id: string, email: string) {
    const issued = await invite(email);
    assert.equal(
      (await call('/accept', 'POST', { token: issued.token }, id, email))
        .status,
      200,
    );
    return issued;
  }
  return { sql, call, invite, join };
}
void test('authentication fails closed until explicitly configured; anonymous/non-owner/cross-origin requests are denied', async () => {
  const f = fixture();
  try {
    assert.equal(
      getIdentity(
        new Request('https://collective.test', {
          headers: {
            'oai-authenticated-user-id': 'founder',
            'oai-authenticated-user-email': 'founder@example.test',
          },
        }),
        {},
      ),
      null,
    );
    assert.equal(
      (await f.call('/library', 'GET', undefined, null)).status,
      401,
    );
    assert.equal(
      (await f.call('/invitations', 'GET', undefined, 'outsider')).status,
      403,
    );
    assert.equal(
      (
        await f.call(
          '/invitations',
          'POST',
          { email: 'test@example.test', name: 'Test', track: 'barber' },
          'founder',
          'founder@example.test',
          'https://attacker.test',
        )
      ).status,
      403,
    );
  } finally {
    f.sql.close();
  }
});
void test('invitation tokens are hashed, bound to email, single-use and idempotent for their member', async () => {
  const f = fixture();
  try {
    const invite = await f.invite(' A@EXAMPLE.TEST ', 'barber');
    const stored = f.sql
      .prepare('SELECT token_hash FROM invitations WHERE id=?')
      .get(invite.id);
    assert.notEqual(stored?.token_hash, invite.token);
    assert.equal(
      (
        await f.call(
          '/accept',
          'POST',
          { token: invite.token },
          'wrong',
          'other@example.test',
        )
      ).status,
      403,
    );
    const accepted = await f.call(
      '/accept',
      'POST',
      { token: invite.token },
      'a',
      'a@example.test',
    );
    assert.equal(accepted.status, 200);
    const state = (await accepted.json()) as {
      member: { track: string; wholesale_status: string };
    };
    assert.equal(state.member.track, 'barber');
    assert.equal(state.member.wholesale_status, 'not_reviewed');
    assert.equal(
      (
        await f.call(
          '/accept',
          'POST',
          { token: invite.token },
          'b',
          'a@example.test',
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await f.call(
          '/accept',
          'POST',
          { token: invite.token },
          'a',
          'a@example.test',
        )
      ).status,
      200,
    );
    assert.equal(
      f.sql.prepare('SELECT COUNT(*) AS n FROM members').get()?.n,
      1,
    );
    assert.equal(
      f.sql.prepare('SELECT COUNT(*) AS n FROM draft_libraries').get()?.n,
      1,
    );
    assert.doesNotMatch(
      JSON.stringify(await (await f.call('/invitations')).json()),
      /token_hash|"token"/,
    );
  } finally {
    f.sql.close();
  }
});
void test('expired and revoked invitations cannot create memberships', async () => {
  const f = fixture();
  try {
    const expired = await f.invite('old@example.test');
    f.sql
      .prepare('UPDATE invitations SET expires_at=? WHERE id=?')
      .run('2000-01-01T00:00:00.000Z', expired.id);
    assert.equal(
      (
        await f.call(
          '/accept',
          'POST',
          { token: expired.token },
          'old',
          'old@example.test',
        )
      ).status,
      403,
    );
    const revoked = await f.invite('revoked@example.test');
    assert.equal(
      (await f.call('/invitations/revoke', 'POST', { id: revoked.id })).status,
      200,
    );
    assert.equal(
      (
        await f.call(
          '/accept',
          'POST',
          { token: revoked.token },
          'revoked',
          'revoked@example.test',
        )
      ).status,
      403,
    );
    assert.equal(
      f.sql.prepare('SELECT COUNT(*) AS n FROM members').get()?.n,
      0,
    );
  } finally {
    f.sql.close();
  }
});
void test('account libraries are isolated, persist, and reject stale revisions without losing newer work', async () => {
  const f = fixture();
  try {
    await f.join('a', 'a@example.test');
    await f.join('b', 'b@example.test');
    const draft = {
      ...blankDraft('draft-1', new Date().toISOString()),
      title: 'Private draft',
      body: 'Private member work',
    };
    const data = {
      revision: 0,
      library: { version: 1, drafts: [draft] },
      ownerId: 'b',
    };
    assert.equal(
      (await f.call('/library', 'PUT', data, 'a', 'a@example.test')).status,
      200,
    );
    const a = (await (
      await f.call('/library', 'GET', undefined, 'a', 'a@example.test')
    ).json()) as { revision: number; library: { drafts: unknown[] } };
    assert.equal(a.revision, 1);
    assert.equal(a.library.drafts.length, 1);
    const b = (await (
      await f.call('/library', 'GET', undefined, 'b', 'b@example.test')
    ).json()) as { library: { drafts: unknown[] } };
    assert.equal(b.library.drafts.length, 0);
    assert.equal(
      (
        await f.call(
          '/library',
          'PUT',
          { revision: 0, library: { version: 1, drafts: [] } },
          'a',
          'a@example.test',
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await f.call(
          '/library',
          'PUT',
          {
            revision: 1,
            library: { version: 1, drafts: [{ ...draft, body: 12 }] },
          },
          'a',
          'a@example.test',
        )
      ).status,
      400,
    );
    const after = (await (
      await f.call('/library', 'GET', undefined, 'a', 'a@example.test')
    ).json()) as { revision: number; library: { drafts: { body: string }[] } };
    assert.equal(after.revision, 1);
    assert.equal(after.library.drafts[0].body, 'Private member work');
  } finally {
    f.sql.close();
  }
});
void test('suspension blocks reads/writes and invitation replay cannot restore access', async () => {
  const f = fixture();
  try {
    const invite = await f.join('a', 'a@example.test');
    assert.equal(
      (
        await f.call('/members/status', 'POST', {
          id: 'a',
          status: 'suspended',
        })
      ).status,
      200,
    );
    assert.equal(
      (await f.call('/library', 'GET', undefined, 'a', 'a@example.test'))
        .status,
      403,
    );
    assert.equal(
      (
        await f.call(
          '/library',
          'PUT',
          { revision: 0, library: { version: 1, drafts: [] } },
          'a',
          'a@example.test',
        )
      ).status,
      403,
    );
    const replay = (await (
      await f.call(
        '/accept',
        'POST',
        { token: invite.token },
        'a',
        'a@example.test',
      )
    ).json()) as { member: { status: string } };
    assert.equal(replay.member.status, 'suspended');
    assert.equal(
      (
        await f.call(
          '/members/status',
          'POST',
          { id: 'a', status: 'active' },
          'a',
          'a@example.test',
        )
      ).status,
      403,
    );
    assert.equal(
      (await f.call('/members/status', 'POST', { id: 'a', status: 'active' }))
        .status,
      200,
    );
    assert.equal(
      (await f.call('/library', 'GET', undefined, 'a', 'a@example.test'))
        .status,
      200,
    );
  } finally {
    f.sql.close();
  }
});

void test('private memory is isolated, revision protected, clearable and denied after suspension', async () => {
  const { emptyMemory } = await import('../lib/gentleman/model.ts');
  const f = fixture();
  try {
    await f.join('alice-memory', 'alice-memory@example.test');
    await f.join('bob-memory', 'bob-memory@example.test');
    const call = (method = 'GET', data?: unknown) =>
      f.call(
        '/memory',
        method,
        data,
        'alice-memory',
        'alice-memory@example.test',
      );
    assert.equal((await call()).status, 200);
    const memory = emptyMemory();
    memory.records.push({
      id: 'ritual-account',
      kind: 'ritual',
      title: 'My morning',
      detail: '',
      date: '2026-09-05',
      endDate: '',
      mode: 'leisure',
      completed: false,
      shareWithCassius: false,
      createdAt: '2026-09-05T12:00:00.000Z',
      ritual: {
        cadenceDays: 1,
        timeOfDay: 'morning',
        steps: [{ id: 'step-account', text: 'My own grooming step' }],
        completions: ['2026-09-05'],
      },
    });
    const saved = await call('PUT', { revision: 0, memory });
    assert.equal(saved.status, 200);
    assert.equal(((await saved.json()) as { revision: number }).revision, 1);
    const loaded = (await (await call()).json()) as { memory: typeof memory };
    assert.deepEqual(loaded.memory, memory);
    assert.equal((await call('PUT', { revision: 0, memory })).status, 409);
    const bob = await f.call(
      '/memory',
      'GET',
      undefined,
      'bob-memory',
      'bob-memory@example.test',
    );
    assert.equal(((await bob.json()) as { revision: number }).revision, 0);
    assert.equal(
      (await call('PUT', { revision: 1, memory: emptyMemory() })).status,
      200,
    );
    await f.call('/members/status', 'POST', {
      id: 'alice-memory',
      status: 'suspended',
    });
    assert.equal((await call()).status, 403);
    assert.equal((await call('PUT', { revision: 2, memory })).status, 403);
  } finally {
    f.sql.close();
  }
});
