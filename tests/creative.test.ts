import { runCreativeJobs } from '../lib/creative/jobs.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createCreativeHandler,
  validateBrief,
  creativeLimiter,
} from '../lib/creative/server.ts';
import {
  openAIProvider,
  routeGeneration,
  futureProvider,
} from '../lib/creative/providers.ts';
import {
  defaultKit,
  CreativeError,
  type CreativeBrief,
  type CreativeProvider,
} from '../lib/creative/types.ts';
const brief: CreativeBrief = {
  prompt: 'A sculptural editorial portrait',
  mode: 'Editorial',
  ratio: '4:5',
  platform: 'Instagram',
  operation: 'generate',
  productId: '',
  brand: defaultKit,
  direction: 0,
  conversation: [],
  lockup: false,
};
const req = (data: unknown = brief, origin = 'https://collective.test') =>
  new Request('https://collective.test/api/creative', {
    method: 'POST',
    headers: { origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
const plan = {
  reply: 'A refined studio direction.',
  enhancedPrompt: 'Sculptural light and dark stone.',
  caption: 'A ritual, considered.',
  cta: 'Discover the Collective.',
};
const planResponse = () =>
  Response.json({
    status: 'completed',
    output: [
      {
        type: 'message',
        content: [{ type: 'output_text', text: JSON.stringify(plan) }],
      },
    ],
  });
const png =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const fake = 'not-a-real-api-key';
void test('validates schema and rejects provider injection, inherited enums, invalid brand, oversized uploads', () => {
  assert.equal(validateBrief(brief), brief);
  for (const bad of [
    { ...brief, provider: 'evil' },
    { ...brief, ratio: 'toString' },
    { ...brief, brand: null },
    { ...brief, direction: 3 },
    { ...brief, reference: 'https://internal' },
    { ...brief, reference: 'data:image/png;base64,' + 'A'.repeat(1800000) },
    { ...brief, operation: 'edit' },
    {
      ...brief,
      operation: 'inpaint',
      reference: 'data:image/jpeg;base64,YQ==',
      mask: 'data:image/png;base64,YQ==',
    },
    { ...brief, mask: 'data:image/png;base64,YQ==' },
  ])
    assert.throws(() => validateBrief(bad), CreativeError);
});
void test('missing configuration and wrong origin make no provider calls', async () => {
  let calls = 0;
  const f = (async () => {
    calls++;
    return planResponse();
  }) as typeof fetch;
  assert.equal(
    (await createCreativeHandler({ config: () => ({}), fetcher: f })(req()))
      .status,
    503,
  );
  assert.equal(
    (
      await createCreativeHandler({
        config: () => ({ key: fake }),
        fetcher: f,
      })(req(brief, 'https://other.test'))
    ).status,
    403,
  );
  assert.equal(calls, 0);
});
void test('medical promise blocked before text or image calls', async () => {
  const handler = createCreativeHandler({
    config: () => ({ key: fake }),
    fetcher: (async () => {
      throw new Error('Must not call provider');
    }) as typeof fetch,
  });
  assert.equal(
    (
      await handler(
        req({ ...brief, prompt: 'Cure diabetes with this product' }),
      )
    ).status,
    422,
  );
});
void test('Cassius receives knowledge and generates a paired image without exposing key', async () => {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const handler = createCreativeHandler({
    config: () => ({ key: fake }),
    fetcher: (async (url, init) => {
      calls.push({
        url:
          typeof url === 'string'
            ? url
            : url instanceof URL
              ? url.href
              : url.url,
        body: JSON.parse(init?.body as string),
      });
      return (typeof url === 'string'
        ? url
        : url instanceof URL
          ? url.href
          : url.url
      ).endsWith('/responses')
        ? planResponse()
        : Response.json({
            data: [{ b64_json: 'YQ==' }],
            usage: { total_tokens: 123 },
          });
    }) as typeof fetch,
  });
  const response = await handler(req());
  assert.equal(response.status, 200);
  const result = await response.text();
  assert.ok(!result.includes(fake));
  assert.match(result, /data:image\/jpeg;base64/);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body.store, false);
  assert.match(String(calls[0].body.input), /knowledge/);
  assert.equal(calls[1].body.size, '1024x1280');
  assert.equal(calls[1].body.n, 1);
});
void test('edit provider uses multipart; lockup does not send original product to provider', async () => {
  const provider = openAIProvider(fake, undefined, (async (url, init) => {
    assert.match(
      typeof url === 'string' ? url : url instanceof URL ? url.href : url.url,
      /edits$/,
    );
    assert.ok(init?.body instanceof FormData);
    assert.ok(init.body.get('image') instanceof Blob);
    return Response.json({ data: [{ b64_json: 'YQ==' }] });
  }) as typeof fetch);
  await provider.generate({
    prompt: 'Edit background',
    ratio: '1:1',
    operation: 'edit',
    reference: 'data:image/png;base64,YQ==',
    signal: new AbortController().signal,
  });
  const handler = createCreativeHandler({
    config: () => ({ key: fake }),
    fetcher: (async (url, init) => {
      if (
        (typeof url === 'string'
          ? url
          : url instanceof URL
            ? url.href
            : url.url
        ).endsWith('/responses')
      ) {
        assert.ok(
          !(typeof init?.body === 'string' ? init.body : '').includes('base64'),
        );
        return planResponse();
      }
      assert.match(
        typeof url === 'string' ? url : url instanceof URL ? url.href : url.url,
        /generations$/,
      );
      assert.match(init?.body as string, /backdrop ONLY/);
      return Response.json({ data: [{ b64_json: 'YQ==' }] });
    }) as typeof fetch,
  });
  assert.equal(
    (
      await handler(
        req({
          ...brief,
          reference: png,
          lockup: true,
        }),
      )
    ).status,
    200,
  );
});
void test('provider failures are sanitized and never automatically retry ambiguous failures', async () => {
  let fallback = 0;
  const a: CreativeProvider = {
    id: 'a',
    ready: () => true,
    capabilities: ['generate'],
    generate: async () => {
      throw new CreativeError(502, 'Failed');
    },
  };
  const b: CreativeProvider = {
    ...a,
    id: 'b',
    generate: async () => {
      fallback++;
      return { image: 'x', usage: null };
    },
  };
  const input = {
    prompt: 'x',
    ratio: '1:1' as const,
    operation: 'generate' as const,
    signal: new AbortController().signal,
  };
  await assert.rejects(() => routeGeneration([a, b], input));
  assert.equal(fallback, 0);
  a.generate = async () => {
    throw new CreativeError(502, 'Unavailable model', true);
  };
  assert.equal((await routeGeneration([a, b], input)).image, 'x');
  assert.equal(fallback, 1);
  assert.equal(futureProvider('video').ready(), false);
  const handler = createCreativeHandler({
    config: () => ({ key: fake }),
    fetcher: (async () =>
      new Response('secret upstream error', { status: 500 })) as typeof fetch,
  });
  const r = await handler(req());
  assert.equal(r.status, 502);
  assert.ok(!(await r.text()).includes('secret'));
});
void test('limits concurrent and hourly jobs, releases once and resets after an hour', () => {
  let time = 0;
  const limit = creativeLimiter(() => time);
  const a = limit('a', 3);
  const b = limit('b', 3);
  assert.throws(() => limit('c', 3));
  a();
  a();
  const c = limit('c', 3);
  b();
  c();
  assert.throws(() => limit('d', 3));
  time = 3600001;
  limit('a', 3)();
});
void test('invalid JSON, large bodies and malformed plans fail safely', async () => {
  const handler = createCreativeHandler({
    config: () => ({ key: fake }),
    fetcher: (async () =>
      Response.json({
        status: 'completed',
        output: [
          { type: 'message', content: [{ type: 'output_text', text: '{}' }] },
        ],
      })) as typeof fetch,
  });
  assert.equal((await handler(req())).status, 502);
  assert.equal(
    (
      await handler(
        new Request('https://collective.test/api/creative', {
          method: 'POST',
          headers: {
            origin: 'https://collective.test',
            'Content-Type': 'application/json',
          },
          body: '{',
        }),
      )
    ).status,
    400,
  );
  assert.equal(
    (await handler(req({ prompt: 'a'.repeat(3900000) }))).status,
    413,
  );
});
void test('provider deadline aborts and releases slot', async () => {
  const handler = createCreativeHandler({
    config: () => ({ key: fake }),
    timeoutMs: 20,
    fetcher: ((_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new Error('aborted')),
        );
      })) as typeof fetch,
  });
  assert.equal((await handler(req())).status, 504);
});

void test('brief refinement does not call the image provider', async () => {
  let calls = 0;
  const handler = createCreativeHandler({
    planOnly: true,
    config: () => ({ key: fake }),
    fetcher: (async () => {
      calls++;
      return planResponse();
    }) as typeof fetch,
  });
  const r = await handler(req());
  assert.equal(r.status, 200);
  assert.equal(calls, 1);
  assert.deepEqual(((await r.json()) as { plan: unknown }).plan, plan);
});
void test('rejects disguised files and mismatched inpainting masks', () => {
  assert.throws(() =>
    validateBrief({ ...brief, reference: 'data:image/png;base64,YQ==' }),
  );
  const b = Buffer.from(png.split(',')[1], 'base64');
  b.writeUInt32BE(20, 16);
  assert.throws(() =>
    validateBrief({
      ...brief,
      operation: 'inpaint',
      reference: png,
      mask: 'data:image/png;base64,' + b.toString('base64'),
    }),
  );
});

void test('campaign saves completed assets sequentially and stops after a failure', async () => {
  const saved: number[] = [];
  let running = 0;
  await assert.rejects(() =>
    runCreativeJobs([1, 2, 3], new AbortController().signal, async (n) => {
      assert.equal(running, 0);
      running++;
      await Promise.resolve();
      if (n === 2) throw new Error('provider failed');
      saved.push(n);
      running--;
    }),
  );
  assert.deepEqual(saved, [1]);
});
void test('campaign cancellation prevents remaining provider calls', async () => {
  const controller = new AbortController();
  const saved: number[] = [];
  await runCreativeJobs([1, 2, 3], controller.signal, async (n) => {
    saved.push(n);
    controller.abort();
  });
  assert.deepEqual(saved, [1]);
});
