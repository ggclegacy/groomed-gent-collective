import test from 'node:test';
import assert from 'node:assert/strict';
import {
  accountsConfigured,
  protectedPage,
  protectedApi,
  localDemoEnabled,
} from '../lib/auth-config.ts';
import { parseOnboarding } from '../lib/profile.ts';
void test('all app pages are private by default, including future routes and auth lookalikes', () => {
  for (const path of [
    '/',
    '/my-cassius',
    '/my-cassius/export',
    '/membership',
    '/onboarding',
    '/members/studio',
    '/voyage',
    '/member-session',
    '/account',
    '/account/security',
    '/account/security/security',
    '/account/security/session.json',
    '/account/security/session.js',
    '/onboarding.csv',
    '/auth/continue',
    '/field',
    '/future-workspace',
    '/account-public',
    '/my-cassius-public',
    '/sign-in-lookalike',
  ])
    assert.equal(protectedPage(path), true, path);
  for (const path of [
    '/sign-in',
    '/sign-up',
    '/sign-in/factor-one',
    '/sign-up/verify-email-address',
    '/manifest.webmanifest',
    '/icons/icon-192.png',
  ])
    assert.equal(protectedPage(path), false, path);
});
void test('auth needs the identity provider AND durable database', () => {
  const env = {
    GGC_ACCOUNT_PROVIDER: 'clerk-neon',
    CLERK_SECRET_KEY: 'test',
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'test',
    DATABASE_URL: 'test',
  };
  assert.equal(accountsConfigured(env), true);
  for (const key of Object.keys(env))
    assert.equal(accountsConfigured({ ...env, [key]: '' }), false);
});
void test('onboarding validates bounds and discards injected identity and role privilege fields', () => {
  const input = {
    step: 2,
    name: 'Tester',
    role: ['Professional'],
    improve: ['Fitness'],
    style: [],
    goal: 'Build confidence',
    business: '',
    other: '',
  };
  assert.deepEqual(
    parseOnboarding({ ...input, user_id: 'victim', account_role: 'founder' }),
    input,
  );
  for (const bad of [
    { step: 7 },
    { step: -1 },
    { name: 'a'.repeat(101) },
    { role: ['a'.repeat(101)] },
    { style: {} },
    { goal: null },
  ])
    assert.throws(() => parseOnboarding({ ...input, ...bad }));
});

void test('missing configuration never enables a production or preview demo', () => {
  for (const env of [
    {},
    { NODE_ENV: 'production' },
    { NODE_ENV: 'production', GGC_DEMO_MODE: 'true' },
    { NODE_ENV: 'development', VERCEL: '1', GGC_DEMO_MODE: 'true' },
    {
      NODE_ENV: 'development',
      GGC_ACCOUNT_PROVIDER: 'typo',
      GGC_DEMO_MODE: 'true',
    },
  ]) {
    assert.equal(accountsConfigured(env), false);
    assert.equal(localDemoEnabled(env), false);
  }
  assert.equal(
    localDemoEnabled({ NODE_ENV: 'development', GGC_DEMO_MODE: 'true' }),
    true,
  );
  assert.equal(localDemoEnabled({ NODE_ENV: 'development' }), false);
});
void test('every app API is protected except read-only account readiness', () => {
  for (const path of [
    '/api/account/memory',
    '/api/account/settings',
    '/api/dashboard',
    '/api/cassius',
    '/api/creative',
    '/api/voyage/plan',
    '/api/future.json',
  ]) {
    for (const method of ['GET', 'POST', 'PUT', 'DELETE'])
      assert.equal(protectedApi(path, method), true);
  }
  assert.equal(protectedApi('/api/account', 'GET'), false);
  assert.equal(protectedApi('/api/account/', 'GET'), false);
  assert.equal(protectedApi('/api/account', 'POST'), true);
  assert.equal(protectedApi('/sign-in', 'GET'), false);
});
