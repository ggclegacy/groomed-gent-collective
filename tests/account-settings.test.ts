import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { postgresDatabase } from '../lib/account-database.ts';
import { accountApi } from '../lib/account-service.ts';
import { defaultSettings } from '../lib/account-settings.ts';
void test('Account settings persist, isolate users, reject stale/forged writes, and export only owned data', async () => {
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
        pg.transaction(async (tx) =>
          Promise.all(
            queries.map(async (q) => {
              const r = await tx.query<Record<string, unknown>>(
                q.query,
                q.values,
              );
              return {
                rows: r.rows,
                rowCount: r.affectedRows ?? r.rows.length,
              };
            }),
          ),
        ),
    });
    async function call(
      user: string | null,
      path: string,
      data?: unknown,
      method = 'PUT',
      origin = 'https://collective.test',
    ) {
      return accountApi(
        new Request(`https://collective.test/api/account${path}`, {
          method: data === undefined ? 'GET' : method,
          headers: {
            origin,
            'content-type': 'application/json',
            'oai-authenticated-user-id': 'victim',
          },
          ...(data === undefined ? {} : { body: JSON.stringify(data) }),
        }),
        db,
        {
          mode: 'verified-provider',
          verifiedIdentity: user
            ? { id: user, email: `${user}@example.test` }
            : null,
        },
      );
    }
    assert.equal((await call(null, '/settings')).status, 401);
    assert.equal(
      (
        await call(null, '/settings', {
          revision: 0,
          settings: defaultSettings,
        })
      ).status,
      401,
    );
    assert.deepEqual(await (await call('one', '/settings')).json(), {
      revision: 0,
      settings: defaultSettings,
    });
    const settings = {
      ...defaultSettings,
      displayName: 'Morgan Reed',
      phone: '+1 (312) 555-0123',
      business: 'Reed Studio',
      reducedMotion: true,
      communication: 'email',
    };
    const first = await call('one', '/settings', {
      revision: 0,
      settings: { ...settings, role: 'founder', owner_id: 'victim' },
    });
    assert.equal(first.status, 200);
    assert.deepEqual(await first.json(), { revision: 1, settings });
    assert.deepEqual(await (await call('one', '/settings')).json(), {
      revision: 1,
      settings,
    });
    assert.deepEqual(await (await call('two', '/settings')).json(), {
      revision: 0,
      settings: defaultSettings,
    });
    assert.equal(
      (await call('one', '/settings', { revision: 0, settings })).status,
      409,
    );
    assert.equal(
      (
        await call(
          'one',
          '/settings',
          { revision: 1, settings },
          'PUT',
          'https://evil.test',
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await call('one', '/settings', {
          revision: 1,
          settings: { ...settings, displayName: 'x'.repeat(101) },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await call('one', '/settings', {
          revision: 1,
          settings: { ...settings, reducedMotion: 'true' },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await call('one', '/settings', {
          revision: 1,
          settings: { ...settings, phone: 'invalid' },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await call('one', '/settings', {
          revision: 1,
          settings: { ...settings, displayName: 'Reed' },
        })
      ).status,
      200,
    );
    const own = (await (await call('one', '')).json()) as {
      profile: { role: string };
    };
    assert.equal(own.profile.role, 'member');
    const exported = await (await call('one', '/export', {}, 'POST')).json();
    assert.match(JSON.stringify(exported), /Reed Studio/);
    assert.doesNotMatch(JSON.stringify(exported), /two@example/);
    const other = await (await call('two', '/export', {}, 'POST')).json();
    assert.doesNotMatch(JSON.stringify(other), /Reed Studio/);
    assert.equal((await call('one', '/export')).status, 405);
    // Two simultaneous editors: one wins, the other cannot overwrite it.
    const writes = await Promise.all(
      ['A', 'B'].map((displayName) =>
        call('one', '/settings', {
          revision: 2,
          settings: { ...settings, displayName },
        }),
      ),
    );
    assert.deepEqual(
      writes.map((r) => r.status).sort((a, b) => a - b),
      [200, 409],
    );
  } finally {
    await pg.close();
  }
});
