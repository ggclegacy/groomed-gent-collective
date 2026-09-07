import test from 'node:test';
import assert from 'node:assert/strict';
import { accountsConfigured, protectedPage } from '../lib/auth-config.ts';
import { parseOnboarding } from '../lib/profile.ts';
void test('private page routes include nested routes and never match a public lookalike', () => {
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
    '/auth/continue',
  ])
    assert.equal(protectedPage(path), true, path);
  for (const path of [
    '/account-public',
    '/sign-in',
    '/sign-up',
    '/my-cassius-public',
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
