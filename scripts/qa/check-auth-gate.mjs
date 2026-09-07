// Read-only acceptance checks against an actual Next.js server or deployment.
// Run without cookies: node scripts/qa/check-auth-gate.mjs https://example.vercel.app
import assert from 'node:assert/strict';
const base = process.argv[2];
if (!base) throw new Error('Provide the deployment URL.');
const results = [];
for (const path of ['/', '/account', '/account/security', '/account/security/session.js', '/onboarding', '/my-cassius', '/membership', '/members/studio', '/voyage', '/auth/continue', '/field']) {
  const response = await fetch(new URL(path, base), { redirect: 'manual' });
  assert.ok([302, 303, 307, 308].includes(response.status), `${path} must redirect, got ${response.status}`);
  assert.equal(new URL(response.headers.get('location'), base).pathname, '/sign-in', path);
  results.push({ path, status: response.status, destination: '/sign-in' });
}
for (const [path, method] of [['/api/account/settings', 'GET'], ['/api/account/memory', 'GET'], ['/api/account/onboarding', 'GET'], ['/api/dashboard', 'GET'], ['/api/cassius', 'POST'], ['/api/creative', 'POST'], ['/api/voyage/plan', 'POST']]) {
  const response = await fetch(new URL(path, base), { method, redirect: 'manual', headers: { 'oai-authenticated-user-id': 'forged-user', 'oai-authenticated-user-email': 'forged@example.com' } });
  assert.ok([401, 503].includes(response.status), `${method} ${path} must deny access, got ${response.status}`);
  assert.match(response.headers.get('cache-control'), /no-store/);
  results.push({ path, method, status: response.status });
}
for (const path of ['/sign-in', '/sign-up', '/manifest.webmanifest', '/icons/icon-192.png']) {
  const response = await fetch(new URL(path, base));
  assert.equal(response.status, 200, path);
  results.push({ path, status: response.status });
}
const readiness = await fetch(new URL('/api/account', base));
assert.match(readiness.headers.get('cache-control'), /no-store/);
const account = await readiness.json();
assert.equal(account.signedIn, false);
console.log(JSON.stringify({ base, checkedAt: new Date().toISOString(), account, results }, null, 2));
