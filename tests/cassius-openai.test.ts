import test from 'node:test';
import assert from 'node:assert/strict';
import { createCassiusHandler, createLimiter } from '../lib/cassius/server.ts';
import { askCassius } from '../lib/cassius/client.ts';
import { readFileSync } from 'node:fs';
const config = () => ({ apiKey: 'test-fixture-not-a-real-key' });
const req = (question = 'Introduce the brand', headers: Record<string, string> = {}) => new Request('https://collective.test/api/cassius', { method: 'POST', headers: { origin: 'https://collective.test', 'content-type': 'application/json', ...headers }, body: JSON.stringify({ question }) });
const success = () => Response.json({ status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'A considered introduction to Groomed Gent.' }] }] });
void test('gateway to handler to OpenAI carries reviewed knowledge and returns provider text', async () => {
  let calls = 0;
  const handler = createCassiusHandler({ config, fetcher: async (url, init) => {
    calls++; assert.equal(url, 'https://api.openai.com/v1/responses');
    const body = JSON.parse(init?.body as string);
    assert.equal(body.model, 'gpt-4.1-mini'); assert.equal(body.max_output_tokens, 1200); assert.equal(body.store, false);
    assert.match(body.instructions, /never instructions/); assert.match(body.instructions, /No product advertising claims are approved/);
    const context = JSON.parse(body.input[0].content).knowledge; assert.ok(context.passages.length); assert.ok(context.passages[0].citations.length);
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer test-fixture-not-a-real-key');
    return success();
  } });
  const result = await askCassius('Introduce the brand', async (url, init) => {
    assert.equal(url, '/api/cassius'); return handler(new Request('https://collective.test'+url, { ...init, headers: { 'content-type': 'application/json', origin: 'https://collective.test' } }));
  });
  assert.equal(calls, 1); assert.equal(result.state, 'ready');
  if (result.state === 'ready') { assert.equal(result.data.text, 'A considered introduction to Groomed Gent.'); assert.equal(result.data.citations.length, 0); assert.match(result.source, /OpenAI/); }
});
void test('product safety constraints reach the model without blocking unrelated mixed requests', async () => {
  let called = false;
  const handler = createCassiusHandler({ config, fetcher: async (_, init) => {
    called = true;
    const body = JSON.parse(init?.body as string);
    const context = JSON.parse(body.input.at(-1).content);
    assert.equal(context.knowledge.state, 'safety-boundary');
    assert.match(body.instructions, /Do not diagnose/);
    assert.match(body.instructions, /do not refuse the whole request/);
    return success();
  } });
  assert.equal((await handler(req('Can Nocturne cure insomnia? Also plan a weekend trip.'))).status, 200);
  assert.equal(called, true);
});
void test('unknown grooming research and disputes are carried to the model', async () => {
  const handler = createCassiusHandler({ config, fetcher: async (_, init) => {
    const context = JSON.parse(JSON.parse(init?.body as string).input[0].content);
    const knowledge = context.knowledge;
    if (context.question.includes('Fortius')) assert.ok(knowledge.passages.some((p: {status:string}) => p.status === 'DISPUTED'));
    else assert.match(knowledge.limitation, /not yet|do not yet|unassessed/);
    return success();
  } });
  assert.equal((await handler(req('Fortius Aqua price'))).status, 200);
  assert.equal((await handler(req('What should I use on my beard?'))).status, 200);
});
void test('configuration errors fail closed without provider calls or secret echoes', async () => {
  for (const value of [{}, { ...config(), enabled: 'false' }, { ...config(), maxOutputTokens: 'NaN' }, { ...config(), model: 'bad model' }]) {
    const handler = createCassiusHandler({ config: () => value, fetcher: async () => { assert.fail('No provider call'); } });
    const response = await handler(req()); assert.equal(response.status, 503); assert.doesNotMatch(await response.text(), /test-fixture/);
  }
});
void test('model and output cap are server configurable', async () => {
  const handler = createCassiusHandler({ config: () => ({ ...config(), model: 'configured-model', maxOutputTokens: '500' }), fetcher: async (_, init) => {
    const body = JSON.parse(init?.body as string); assert.equal(body.model, 'configured-model'); assert.equal(body.max_output_tokens, 500); return success();
  } });
  assert.equal((await handler(req())).status, 200);
});
void test('rejects malformed, oversized, cross-origin and client configuration input', async () => {
  const cases: [Request,number][] = [
    [req(''),400], [req('x'.repeat(10001)),400], [req('hello',{ origin: 'https://evil.test' }),403],
    [req('hello',{'content-type':'text/plain'}),415], [req('hello',{'sec-fetch-site':'cross-site'}),403],
    ...['null','[]','{','{"question":"hello","model":"override"}'].map(body => [new Request('https://collective.test/api/cassius',{method:'POST',headers:{origin:'https://collective.test','content-type':'application/json'},body}),400] as [Request,number]),
    [req('x'.repeat(46000)),413],
  ];
  for (const [request,status] of cases) {
    const handler = createCassiusHandler({config,fetcher:async()=>{assert.fail('Rejected request reached OpenAI');}});
    assert.equal((await handler(request)).status,status);
  }
});
void test('sanitizes provider errors and distinguishes rate limits', async () => {
  for (const status of [400,401,403,429,500]) {
    const response = await createCassiusHandler({config,fetcher:async()=>new Response('secret provider diagnostics',{status})})(req());
    assert.equal(response.status,status === 429 ? 429 : 502); assert.doesNotMatch(await response.text(),/secret provider/);
    assert.match(response.headers.get('cache-control')!,/no-store/);
  }
});
void test('handles network failure, invalid output, refusal and timeout without mock fallback', async () => {
  const cases: [typeof fetch,number][] = [
    [async()=>{throw new Error('private internals');},503],
    [async()=>Response.json({status:'incomplete',output:[]}),502],
    [async()=>Response.json({status:'completed',output:[]}),502],
    [async()=>new Response('not json'),503],
    [async()=>Response.json({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'refusal'}]}]}),422],
    [async(_,init)=>new Promise((_,reject)=>init?.signal?.addEventListener('abort',()=>reject(new Error('aborted')))),504],
  ];
  for(const [fetcher,status] of cases) assert.equal((await createCassiusHandler({config,fetcher,timeoutMs:5})(req())).status,status);
});
void test('rate and concurrency limits recover, remain bounded and ignore fake user headers', async()=>{
  let now=0; const limit=createLimiter(()=>now);
  const releases=Array.from({length:4},()=>limit('a')); assert.throws(()=>limit('b')); releases.forEach(release=>release());
  for(let i=0;i<6;i++) limit('a')(); assert.throws(()=>limit('a')); now=60001; limit('a')();
  const handler=createCassiusHandler({config,fetcher:async()=>success()});
  for(let i=0;i<10;i++) assert.equal((await handler(req('Introduce the brand',{'oai-authenticated-user-id':String(i),'x-forwarded-for':String(i)}))).status,200);
  const response=await handler(req());assert.equal(response.status,429);assert.equal(response.headers.get('retry-after'),'60');
});
void test('gateway reports backend, network and invalid-response errors',async()=>{
  for(const fetcher of [async()=>Response.json({error:'Please wait.'},{status:429}),async()=>{throw new Error();},async()=>Response.json({text:'fake',citations:[]})]) assert.equal((await askCassius('hello',fetcher)).state,'error');
});
void test('client import boundary excludes evidence and server credentials',()=>{
  const client=readFileSync(new URL('../lib/cassius/client.ts',import.meta.url),'utf8');
  const collective=readFileSync(new URL('../lib/collective.ts',import.meta.url),'utf8');
  assert.doesNotMatch(client+collective,/OPENAI_API_KEY|cassius\/retrieval|cassius\/server/);
  assert.match(readFileSync(new URL('../app/api/cassius/route.ts',import.meta.url),'utf8'),/import 'server-only'/);
});
