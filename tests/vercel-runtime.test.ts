import test from 'node:test';
import assert from 'node:assert/strict';
import { handleAccount } from '../lib/account-runtime.ts';

const headers = {
  'oai-authenticated-user-id': 'local_seedy',
  'oai-authenticated-user-email': 'seedy@sites.test',
  origin: 'https://collective.example',
  'content-type': 'application/json',
};

void test('Vercel runtime ignores forged Sites identity and exposes only disconnected readiness', async () => {
  const response = await handleAccount(new Request('https://collective.example/api/account', { headers }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(await response.json(), {
    configured: false, local: false, signedIn: false,
    owner: false, email: null, member: null,
  });
});

void test('Vercel runtime denies private reads and mutations without configured services', async () => {
  for (const [path, method] of [
    ['library', 'GET'], ['library', 'PUT'], ['invitations', 'POST'],
    ['members', 'GET'], ['accept', 'POST'],
  ]) {
    const response = await handleAccount(new Request(`https://collective.example/api/account/${path}`, {
      method, headers, ...(method === 'GET' ? {} : { body: '{}' }),
    }));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  }
});
