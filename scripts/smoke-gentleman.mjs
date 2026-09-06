import assert from 'node:assert/strict';
const base = new URL(process.argv[2] || 'http://127.0.0.1:4173');
const home = await fetch(base, { signal: AbortSignal.timeout(60000) });
assert.equal(home.status, 200);
const html = await home.text();
for (const destination of ['home','collective','intelligence','voyage','circle','life','desk','vault','logbook','profile']) assert.ok(html.includes(`href="#${destination}"`), `Missing navigation: ${destination}`);
assert.ok(html.includes('Capture now. Decide later.'), 'Logbook quick capture must render.');
assert.ok(html.includes('Make room for what matters.'), 'Desk focus must render.');
assert.ok(html.includes('YOUR RHYTHM'), 'Life readiness panel must render.');
assert.ok(html.includes('Prepare for a trip'), 'Life-to-Voyage preparation must render.');
for (const path of ['/membership','/sign-in','/member-session']) {
  const response = await fetch(new URL(path,base), { signal:AbortSignal.timeout(60000) });
  assert.equal(response.status,200,path);
}
const memory = await fetch(new URL('/api/account/memory',base));
assert.ok([401,403,503].includes(memory.status),'Anonymous memory must remain inaccessible.');
assert.equal(memory.headers.get('cache-control'),'private, no-store');
const plan = await fetch(new URL('/api/voyage/plan',base),{method:'POST',headers:{origin:base.origin,'content-type':'application/json'},body:JSON.stringify({tripId:'smoke-no-saved-trip',revision:0,surprise:false,includeProfile:false})});
assert.ok([401,403,404,503].includes(plan.status),'Planning must require a real member-owned saved trip.');
console.log('HTTP smoke passed: navigation, membership, sign-in setup, account session, private memory and planning gate.');
