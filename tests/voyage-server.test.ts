import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoyageHandler, VoyageError } from '../lib/voyage/server.ts';
import { emptyMemory } from '../lib/gentleman/model.ts';
import { emptyPlan } from '../lib/voyage/model.ts';
function fixture() {
  const memory = emptyMemory();
  memory.profile.travel = 'PRIVATE PREFERENCE';
  memory.profile.business = 'NEVER SEND';
  memory.records = [
    {
      id: 'trip',
      kind: 'trip',
      title: 'London',
      detail: 'Quiet restaurants',
      date: '2026-09-05',
      endDate: '2026-09-07',
      mode: 'business',
      shareWithCassius: false,
      completed: false,
      createdAt: '2026-09-01T00:00:00Z',
      tripPlan: emptyPlan('Europe/London'),
    },
  ];
  return { memberId: 'alice', revision: 1, memory };
}
const request = (
  body: unknown = {
    tripId: 'trip',
    revision: 1,
    surprise: false,
    includeProfile: false,
  },
  origin = 'https://collective.test',
) =>
  new Request('https://collective.test/api/voyage/plan', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
const payload = (plan: unknown) =>
  Response.json({
    status: 'completed',
    output: [
      {
        type: 'message',
        role: 'assistant',
        content: [{ type: 'output_text', text: JSON.stringify(plan) }],
      },
    ],
  });
void test('structured generation uses server-owned trip, explicit preference consent and no automatic save', async () => {
  const state = fixture();
  let sent = '';
  const handler = createVoyageHandler({
    config: () => ({ apiKey: 'test' }),
    authorize: async () => state,
    fetcher: async (_url, options) => {
      sent = typeof options?.body === 'string' ? options.body : '';
      return payload(emptyPlan('Europe/London'));
    },
  });
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.ok(sent.includes('Quiet restaurants'));
  assert.ok(!sent.includes('PRIVATE PREFERENCE'));
  assert.ok(!sent.includes('NEVER SEND'));
  assert.ok(sent.includes('json_schema'));
  assert.ok(sent.includes('"store":false'));
  state.memory.shareProfile = true;
  assert.equal(
    (
      await handler(
        request({
          tripId: 'trip',
          revision: 1,
          surprise: false,
          includeProfile: true,
        }),
      )
    ).status,
    200,
  );
  assert.ok(sent.includes('PRIVATE PREFERENCE'));
  assert.ok(!sent.includes('NEVER SEND'));
  assert.equal(state.revision, 1);
});
void test('anonymous, cross-origin, stale, other-member IDs and client-injected trip data never call AI', async () => {
  let calls = 0;
  const options = {
    config: () => ({ apiKey: 'test' }),
    authorize: async () => fixture(),
    fetcher: async () => {
      calls++;
      return payload(emptyPlan());
    },
  };
  const handler = createVoyageHandler(options);
  assert.equal(
    (await handler(request(undefined, 'https://evil.test'))).status,
    403,
  );
  assert.equal(
    (
      await handler(
        request({
          tripId: 'other',
          revision: 1,
          surprise: false,
          includeProfile: false,
        }),
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await handler(
        request({
          tripId: 'trip',
          revision: 0,
          surprise: false,
          includeProfile: false,
        }),
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await handler(
        request({
          tripId: 'trip',
          revision: 1,
          surprise: false,
          includeProfile: false,
          trip: { title: 'injected' },
        }),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await createVoyageHandler({
        ...options,
        authorize: async () => {
          throw new VoyageError(401, 'Sign in.');
        },
      })(request())
    ).status,
    401,
  );
  assert.equal(calls, 0);
});
void test('missing config, malformed provider dates and unexpected timezone fail without mock output', async () => {
  const options = {
    authorize: async () => fixture(),
    fetcher: async () => payload(emptyPlan('America/Chicago')),
  };
  assert.equal(
    (await createVoyageHandler({ ...options, config: () => ({}) })(request()))
      .status,
    503,
  );
  assert.equal(
    (
      await createVoyageHandler({
        ...options,
        config: () => ({ apiKey: 'test' }),
      })(request())
    ).status,
    502,
  );
});
