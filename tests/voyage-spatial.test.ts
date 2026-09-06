import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultTaste,
  demoPlaces,
  distance,
  intent,
  lafayette,
  navigation,
  parseTaste,
  rankPlaces,
  territoryContext,
  validCoordinates,
  type DiscoveryResult,
} from '../lib/voyage/spatial/model.ts';
import {
  createDiscoveryHandler,
  DiscoveryError,
  mapboxPlaces,
} from '../lib/voyage/spatial/discovery.ts';
const input = {
  query: 'somewhere quiet to work',
  location: lafayette,
  taste: defaultTaste,
};
function request(body: unknown = input, origin = 'https://collective.test') {
  return new Request('https://collective.test/api/voyage/discover', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
void test('coordinates reject strings, NaN and out-of-world positions', () => {
  assert.equal(validCoordinates({ latitude: NaN, longitude: 0 }), false);
  assert.equal(validCoordinates({ latitude: 91, longitude: 0 }), false);
  assert.equal(validCoordinates({ latitude: '30', longitude: 0 }), false);
  assert.equal(validCoordinates(lafayette), true);
});
void test('home territory requires explicit home and transforms when away', () => {
  assert.equal(territoryContext(lafayette, null), 'EXPLORING');
  assert.equal(territoryContext(lafayette, lafayette), 'HOME TERRITORY');
  assert.equal(
    territoryContext({ latitude: 40, longitude: -74 }, lafayette),
    'AWAY',
  );
  assert.equal(distance(lafayette, lafayette), 0);
});
void test('corrupt device preferences recover without trusting invalid values', () => {
  assert.deepEqual(parseTaste(null), defaultTaste);
  const t = parseTaste({
    version: 1,
    quiet: 'yes',
    maxPrice: 99,
    categories: ['coffee', 3],
    home: { ...lafayette, timeZone: 'garbage' },
  });
  assert.equal(t.quiet, false);
  assert.equal(t.maxPrice, 3);
  assert.equal(t.home, null);
  assert.deepEqual(t.categories, ['coffee']);
});
void test('natural-language intent maps everyday requests to categories', () => {
  assert.equal(intent('somewhere quiet to work'), 'coffee');
  assert.equal(intent('premium but not pretentious'), 'restaurant');
  assert.equal(intent('find a gym'), 'gym');
  assert.equal(intent('barbers'), 'barber');
  assert.equal(intent('recovery / wellness'), 'spa');
  assert.equal(intent('after-hours'), 'cocktail bar');
});
void test('ranking returns a curated shortlist with transparent provenance', () => {
  const p = rankPlaces(demoPlaces(lafayette), input);
  assert.equal(p.length, 3);
  assert.equal(p[0].category, 'coffee');
  assert.equal(p[0].scoring, 'heuristic-v1');
  assert.ok(
    p.every((x) => x.match >= 0 && x.match <= 99 && x.rationale.length),
  );
});
void test('distant places are excluded and closed/over-budget places lose rank', () => {
  const p = demoPlaces(lafayette)[0];
  assert.equal(
    rankPlaces([{ ...p, location: { latitude: 0, longitude: 0 } }], input)
      .length,
    0,
  );
  const normal = rankPlaces([p], input)[0].match;
  const penalized = rankPlaces([{ ...p, open: false, price: 4 }], input)[0]
    .match;
  assert.ok(penalized < normal);
});
void test('fictional destinations can never generate navigation links', () => {
  const p = demoPlaces(lafayette)[0];
  assert.equal(navigation('apple').destination(p), null);
  assert.equal(navigation('google').destination(p), null);
  assert.match(
    navigation('google').destination({ ...p, source: 'mapbox' })!,
    /^https:\/\/www.google.com\/maps\/dir\//,
  );
});
void test('missing credentials return labeled demo without authorization or provider calls', async () => {
  const handler = createDiscoveryHandler({
    token: () => undefined,
    authorize: async () => {
      throw Error('must not call');
    },
  });
  const r = await handler(request());
  assert.equal(r.status, 200);
  const d = (await r.json()) as DiscoveryResult;
  assert.equal(d.source, 'demo');
  assert.ok(d.places.every((p: { source: string }) => p.source === 'demo'));
  assert.equal(r.headers.get('cache-control'), 'private, no-store');
});
void test('cross-origin requests are rejected before provider access', async () => {
  const handler = createDiscoveryHandler({
    token: () => undefined,
    authorize: async () => '',
  });
  assert.equal(
    (await handler(request(input, 'https://evil.test'))).status,
    403,
  );
});
void test('invalid and oversized input never reaches paid discovery', async () => {
  const handler = createDiscoveryHandler({
    token: () => undefined,
    authorize: async () => '',
  });
  assert.equal(
    (
      await handler(
        request({ ...input, location: { latitude: 999, longitude: 0 } }),
      )
    ).status,
    400,
  );
  assert.equal(
    (await handler(request({ ...input, query: 'x'.repeat(7000) }))).status,
    413,
  );
  assert.equal(
    (await handler(request({ ...input, query: 'x'.repeat(257) }))).status,
    400,
  );
});
void test('live discovery requires existing account authorization', async () => {
  let called = false;
  const handler = createDiscoveryHandler({
    token: () => 'test-token',
    authorize: async () => {
      throw new DiscoveryError(401, 'Sign in');
    },
    provider: () => ({
      discover: async () => {
        called = true;
        return [];
      },
    }),
  });
  assert.equal((await handler(request())).status, 401);
  assert.equal(called, false);
});
void test('live provider output is ranked without fictional enrichment', async () => {
  const handler = createDiscoveryHandler({
    token: () => 'test-token',
    authorize: async () => 'member',
    provider: () => ({
      discover: async () =>
        demoPlaces(lafayette).map((p) => ({
          ...p,
          source: 'mapbox',
          price: undefined,
          tags: [],
        })),
    }),
  });
  const r = await handler(request());
  const d = (await r.json()) as DiscoveryResult;
  assert.equal(r.status, 200);
  assert.equal(d.source, 'mapbox');
  assert.equal(d.places[0].rating, undefined);
  assert.equal(d.places[0].open, undefined);
});
void test('Mapbox request only sends normalized category and proximity', async () => {
  const provider = mapboxPlaces('fake', async (url) => {
    const u = new URL(url instanceof Request ? url.url : url);
    assert.equal(u.searchParams.get('q'), 'coffee');
    assert.equal(u.searchParams.has('taste'), false);
    assert.equal(u.searchParams.has('home'), false);
    return Response.json({
      features: [
        {
          geometry: { coordinates: [lafayette.longitude, lafayette.latitude] },
          properties: {
            mapbox_id: 'real-id',
            name: 'Provider supplied name',
            poi_category: ['coffee'],
          },
        },
      ],
    });
  });
  const p = await provider.discover(input, new AbortController().signal);
  assert.equal(p[0].source, 'mapbox');
  assert.equal(p[0].rating, undefined);
  assert.deepEqual(p[0].tags, []);
});
void test('provider rejects upstream failures and malformed coordinates', async () => {
  await assert.rejects(
    mapboxPlaces(
      'fake',
      async () => new Response('', { status: 429 }),
    ).discover(input, new AbortController().signal),
  );
  assert.deepEqual(
    await mapboxPlaces('fake', async () =>
      Response.json({
        features: [
          {
            properties: { mapbox_id: 'x', name: 'x' },
            geometry: { coordinates: [0, 999] },
          },
        ],
      }),
    ).discover(input, new AbortController().signal),
    [],
  );
});

void test('reverse lookup is credential-gated and keeps a missing city explicit', async () => {
  const { createAreaHandler } = await import('../lib/voyage/spatial/area.ts');
  const demo = createAreaHandler({
    token: () => undefined,
    authorize: async () => {
      throw Error('no auth for offline fallback');
    },
  });
  assert.deepEqual(await (await demo(request({ ...input, query: 'area' }))).json(), { name: null });
  const denied = createAreaHandler({
    token: () => 'fake',
    authorize: async () => {
      throw new DiscoveryError(401, 'Sign in');
    },
  });
  assert.equal((await denied(request({ ...input, query: 'area' }))).status, 401);
  const live = createAreaHandler({
    token: () => 'fake',
    authorize: async () => 'member',
    fetcher: async () =>
      Response.json({
        features: [
          { properties: { feature_type: 'place', name: 'Provider City' } },
        ],
      }),
  });
  assert.deepEqual(await (await live(request({ ...input, query: 'area' }))).json(), {
    name: 'Provider City',
  });
});
