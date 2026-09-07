import { readSettings, saveSettings, exportAccount } from './account-settings.ts';
import { ensureProfile, parseOnboarding } from './profile.ts';
import {
  readIntelligence,
  changeIntelligence,
} from './intelligence/service.ts';
import type { AccountDatabase } from './account-database.ts';
import { emptyMemory, parseMemory } from './gentleman/model.ts';
import {
  applyLearning,
  emptyLearning,
  parseCommand,
  type LearningState,
} from './product-mastery/model.ts';
import {
  AccountError,
  canonicalLibrary,
  normalizeEmail,
  type AccountAccess,
  type Member,
} from './account.ts';
export interface IdentityConfig {
  mode?: string;
  verifiedIdentity?: Identity | null;
  ownerId?: string;
}
interface Identity {
  id: string;
  email: string;
}
const memberColumns =
  'user_id, email, name, track, status, wholesale_status, joined_at';
export function getIdentity(
  request: Request,
  config: IdentityConfig,
): Identity | null {
  if (config.mode === 'verified-provider') {
    const identity = config.verifiedIdentity;
    if (
      !identity ||
      typeof identity.id !== 'string' ||
      !identity.id ||
      identity.id.length > 256
    )
      return null;
    try {
      return { id: identity.id, email: normalizeEmail(identity.email) };
    } catch {
      return null;
    }
  }
  // Header authentication is allowed only behind the configured Sites dispatcher.
  // Local Vite middleware strips client identity headers and supplies its mock user.
  if (!['sites-local', 'sites-dispatch'].includes(config.mode ?? ''))
    return null;
  if (
    config.mode === 'sites-local' &&
    !['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname)
  )
    return null;
  const id = request.headers.get('oai-authenticated-user-id');
  const email = request.headers.get('oai-authenticated-user-email');
  if (!id || id.length > 256 || !email) return null;
  try {
    return { id, email: normalizeEmail(email) };
  } catch {
    return null;
  }
}
export async function access(
  request: Request,
  db: AccountDatabase | undefined,
  config: IdentityConfig,
): Promise<AccountAccess> {
  const configured = Boolean(
    db &&
    ['sites-local', 'sites-dispatch', 'verified-provider'].includes(
      config.mode ?? '',
    ),
  );
  const user = configured ? getIdentity(request, config) : null;
  const member =
    user && db
      ? await db
          .prepare(`SELECT ${memberColumns} FROM members WHERE user_id = ?`)
          .bind(user.id)
          .first<Member>()
      : null;
  const profile =
    user && db ? await ensureProfile(db, user, config.ownerId) : null;
  return {
    ...(profile ? { profile } : {}),
    configured,
    ...(config.mode === 'verified-provider'
      ? { signInPath: '/sign-in', signOutPath: '/member-session' }
      : {}),
    local: config.mode === 'sites-local',
    signedIn: Boolean(user),
    owner:
      Boolean(user && config.ownerId && user.id === config.ownerId) ||
      Boolean(profile && ['founder', 'admin'].includes(profile.role)),
    email: user?.email ?? null,
    member,
  };
}
export async function tokenHash(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}
function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      Vary: 'Cookie',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
async function body(
  request: Request,
  maximum = 4_000_000,
): Promise<Record<string, unknown>> {
  if (
    request.headers.get('origin') !== new URL(request.url).origin ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    throw new AccountError(403, 'This action must start from the Collective.');
  if (
    !(request.headers.get('content-type') ?? '').startsWith('application/json')
  )
    throw new AccountError(415, 'Use a JSON request.');
  // Bound streamed input, including requests without a Content-Length header.
  const reader = request.body?.getReader();
  if (!reader) throw new AccountError(400, 'A request body is required.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maximum) {
      await reader.cancel();
      throw new AccountError(413, 'The request is too large.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new AccountError(400, 'The request could not be read.');
  }
}
export async function accountApi(
  request: Request,
  db: AccountDatabase | undefined,
  config: IdentityConfig,
): Promise<Response> {
  try {
    const path = new URL(request.url).pathname.replace(/\/$/, '');
    const state = await access(request, db, config);
    if (path === '/api/account' && request.method === 'GET') return json(state);
    if (!state.configured || !db)
      throw new AccountError(503, 'Member services are not configured.');
    const user = getIdentity(request, config);
    if (!user) throw new AccountError(401, 'Sign in to continue.');
    // Account ownership controls remain available even when partner privileges are suspended.
    if (path === '/api/account/settings') {
      if (request.method === 'GET') return json(await readSettings(db, user.id));
      if (request.method === 'PUT') return json(await saveSettings(db, user.id, await body(request, 8000)));
      throw new AccountError(405, 'Use GET or PUT for settings.');
    }
    if (path === '/api/account/export') {
      if (request.method !== 'POST') throw new AccountError(405, 'Use POST to export your data.');
      await body(request, 1000);
      return json({ exportedAt: new Date().toISOString(), profile: state.profile, membership: state.member, data: await exportAccount(db, user.id), scope: 'Collective account data. Sign-in records are managed separately by Clerk. Device-only drafts and external commerce records are not included.' });
    }
    if (state.member?.status === 'suspended')
      throw new AccountError(
        403,
        'Your membership is suspended. Contact the Collective for access.',
      );
    if (path === '/api/account/onboarding') {
      if (request.method === 'GET') {
        const row = await db
          .prepare(
            'SELECT revision,document FROM onboarding_drafts WHERE owner_id=?',
          )
          .bind(user.id)
          .first<{ revision: number; document: string }>();
        return json({
          revision: row?.revision ?? 0,
          draft: row ? JSON.parse(row.document) : null,
        });
      }
      if (request.method !== 'PUT')
        throw new AccountError(405, 'Use GET or PUT for onboarding.');
      const data = await body(request, 20000);
      const draft = parseOnboarding(data.draft);
      if (!Number.isSafeInteger(data.revision) || Number(data.revision) < 0)
        throw new AccountError(400, 'Invalid saved revision.');
      const now = new Date().toISOString();
      let row = await db
        .prepare(
          'INSERT INTO onboarding_drafts (owner_id,revision,document,saved_at) SELECT ?,1,?,? WHERE ?=0 AND NOT EXISTS (SELECT 1 FROM intelligence_accounts WHERE owner_id=? AND completed=1) ON CONFLICT(owner_id) DO NOTHING RETURNING revision',
        )
        .bind(user.id, JSON.stringify(draft), now, data.revision, user.id)
        .first<{ revision: number }>();
      if (!row)
        row = await db
          .prepare(
            'UPDATE onboarding_drafts SET document=?,saved_at=?,revision=revision+1 WHERE owner_id=? AND revision=? AND NOT EXISTS (SELECT 1 FROM intelligence_accounts WHERE owner_id=? AND completed=1) RETURNING revision',
          )
          .bind(JSON.stringify(draft), now, user.id, data.revision, user.id)
          .first<{ revision: number }>();
      if (!row)
        throw new AccountError(
          409,
          'Onboarding changed or was completed in another window. Reopen your saved profile before continuing.',
        );
      return json({ revision: row.revision, draft });
    }
    if (path === '/api/account/intelligence') {
      if (request.method === 'GET')
        return json(await readIntelligence(db, user.id));
      if (request.method === 'POST')
        return json(
          await changeIntelligence(db, user.id, await body(request, 120000)),
        );
      throw new AccountError(405, 'Use GET or POST for your Cassius profile.');
    }
    const owner = () => {
      if (!state.owner)
        throw new AccountError(403, 'Founder access is required.');
    };
    const active = () => {
      if (state.member?.status !== 'active')
        throw new AccountError(
          403,
          'An active Collective membership is required.',
        );
    };
    if (path === '/api/account/invitations' && request.method === 'GET') {
      owner();
      const rows = await db
        .prepare(
          'SELECT id, email, name, track, expires_at, redeemed_by, redeemed_at, revoked_at, created_at FROM invitations ORDER BY created_at DESC LIMIT 100',
        )
        .all();
      return json({ invitations: rows.results });
    }
    if (path === '/api/account/members' && request.method === 'GET') {
      owner();
      return json({
        members: (
          await db
            .prepare(
              `SELECT ${memberColumns} FROM members ORDER BY joined_at DESC LIMIT 100`,
            )
            .all()
        ).results,
      });
    }
    if (path === '/api/account/learning' && request.method === 'GET') {
      active();
      const row = await db
        .prepare(
          'SELECT revision, document FROM product_learning WHERE owner_id = ?',
        )
        .bind(user.id)
        .first<{ revision: number; document: string }>();
      return json({
        revision: row?.revision ?? 0,
        learning: row ? JSON.parse(row.document) : emptyLearning(),
      });
    }
    if (path === '/api/account/library' && request.method === 'GET') {
      active();
      const row = await db
        .prepare(
          "SELECT l.revision, l.document FROM draft_libraries l JOIN members m ON m.user_id=l.owner_id WHERE l.owner_id=? AND m.status='active'",
        )
        .bind(user.id)
        .first<{ revision: number; document: string }>();
      if (!row)
        throw new AccountError(403, 'Your member library is unavailable.');
      return json({
        revision: row.revision,
        library: canonicalLibrary(JSON.parse(row.document)),
      });
    }
    if (path === '/api/account/memory' && request.method === 'GET') {
      const row = await db
        .prepare(
          'SELECT revision,document FROM gentleman_memories WHERE owner_id=? AND EXISTS (SELECT 1 FROM account_profiles WHERE user_id=?)',
        )
        .bind(user.id, user.id)
        .first<{ revision: number; document: string }>();
      return json(
        row
          ? {
              revision: row.revision,
              memory: parseMemory(JSON.parse(row.document)),
            }
          : { revision: 0, memory: emptyMemory() },
      );
    }
    const data = await body(request);
    const now = new Date().toISOString();
    if (path === '/api/account/memory' && request.method === 'PUT') {
      if (!Number.isSafeInteger(data.revision) || (data.revision as number) < 0)
        throw new AccountError(400, 'A valid memory revision is required.');
      let memory;
      try {
        memory = parseMemory(data.memory);
        if (
          new TextEncoder().encode(JSON.stringify(memory)).byteLength >
          1_500_000
        )
          throw new Error();
      } catch {
        throw new AccountError(
          400,
          'The memory document is invalid or too large.',
        );
      }
      const document = JSON.stringify(memory);
      let result = await db
        .prepare(
          'INSERT INTO gentleman_memories (owner_id,revision,document,saved_at) SELECT ?,1,?,? WHERE ?=0 AND EXISTS (SELECT 1 FROM account_profiles WHERE user_id=?) ON CONFLICT(owner_id) DO NOTHING RETURNING revision',
        )
        .bind(user.id, document, now, data.revision, user.id)
        .first<{ revision: number }>();
      if (!result)
        result = await db
          .prepare(
            'UPDATE gentleman_memories SET document=?,revision=revision+1,saved_at=? WHERE owner_id=? AND revision=? AND EXISTS (SELECT 1 FROM account_profiles WHERE user_id=?) RETURNING revision',
          )
          .bind(document, now, user.id, data.revision, user.id)
          .first<{ revision: number }>();
      if (!result)
        throw new AccountError(
          409,
          'Memory changed or access was withdrawn. Export your working copy and reload before saving again.',
        );
      return json({ revision: result.revision, memory });
    }

    if (path === '/api/account/learning' && request.method === 'POST') {
      active();
      if (!Number.isInteger(data.revision) || Number(data.revision) < 0)
        throw new AccountError(400, 'Invalid learning revision.');
      let command;
      try {
        command = parseCommand(data.command);
      } catch {
        throw new AccountError(400, 'Invalid learning action.');
      }
      const row = await db
        .prepare(
          'SELECT revision, document FROM product_learning WHERE owner_id = ?',
        )
        .bind(user.id)
        .first<{ revision: number; document: string }>();
      const current: LearningState = row
        ? JSON.parse(row.document)
        : emptyLearning();
      // A network retry is idempotent even when the caller still has the old revision.
      if (
        command.action === 'answer' &&
        current.attempts.some((a) => a.id === command.id)
      )
        return json({ revision: row?.revision ?? 0, learning: current });
      if ((row?.revision ?? 0) !== data.revision)
        throw new AccountError(
          409,
          'Progress changed on another device. Reload your progress and try again.',
        );
      let next: LearningState;
      try {
        next = applyLearning(current, command, now);
      } catch (error) {
        throw new AccountError(
          409,
          error instanceof Error ? error.message : 'Reload this lesson.',
        );
      }
      const result = row
        ? await db
            .prepare(
              "UPDATE product_learning SET revision=revision+1, document=?, saved_at=? WHERE owner_id=? AND revision=? AND EXISTS (SELECT 1 FROM members WHERE user_id=? AND status='active')",
            )
            .bind(JSON.stringify(next), now, user.id, row.revision, user.id)
            .run()
        : await db
            .prepare(
              "INSERT INTO product_learning (owner_id,revision,document,saved_at) SELECT ?,1,?,? WHERE EXISTS (SELECT 1 FROM members WHERE user_id=? AND status='active') ON CONFLICT(owner_id) DO NOTHING",
            )
            .bind(user.id, JSON.stringify(next), now, user.id)
            .run();
      if (!result.meta.changes)
        throw new AccountError(
          409,
          'Progress changed or membership is unavailable. Reload before trying again.',
        );
      return json({ revision: (row?.revision ?? 0) + 1, learning: next });
    }

    if (path === '/api/account/invitations' && request.method === 'POST') {
      owner();
      const email = normalizeEmail(data.email);
      if (
        typeof data.name !== 'string' ||
        !data.name.trim() ||
        data.name.length > 80 ||
        !['ambassador', 'barber'].includes(String(data.track))
      )
        throw new AccountError(
          400,
          'Provide a name and ambassador or barber track.',
        );
      const token = Array.from(
        crypto.getRandomValues(new Uint8Array(32)),
        (b) => b.toString(16).padStart(2, '0'),
      ).join('');
      const id = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
      await db
        .prepare(
          'INSERT INTO invitations (id,token_hash,email,name,track,expires_at,created_at,created_by) VALUES (?,?,?,?,?,?,?,?)',
        )
        .bind(
          id,
          await tokenHash(token),
          email,
          data.name.trim(),
          data.track,
          expiresAt,
          now,
          user.id,
        )
        .run();
      return json({ id, token, expiresAt }, 201);
    }
    if (
      path === '/api/account/invitations/revoke' &&
      request.method === 'POST'
    ) {
      owner();
      if (typeof data.id !== 'string')
        throw new AccountError(400, 'Select an invitation.');
      const result = await db
        .prepare(
          'UPDATE invitations SET revoked_at=? WHERE id=? AND redeemed_by IS NULL AND revoked_at IS NULL',
        )
        .bind(now, data.id)
        .run();
      if (!result.meta.changes)
        throw new AccountError(409, 'This invitation is no longer pending.');
      return json({ revoked: true });
    }
    if (path === '/api/account/accept' && request.method === 'POST') {
      if (typeof data.token !== 'string' || !/^[a-f0-9]{64}$/.test(data.token))
        throw new AccountError(400, 'Enter a valid invitation code.');
      const hash = await tokenHash(data.token);
      // Conditional insert and redemption execute in one D1 transaction. A second
      // identity cannot consume an invitation, and replay cannot reactivate suspension.
      await db.batch([
        db
          .prepare(
            "INSERT INTO members (user_id,email,name,track,status,wholesale_status,joined_at,invitation_id) SELECT ?,email,name,track,'active','not_reviewed',?,id FROM invitations WHERE token_hash=? AND email=? AND expires_at>? AND revoked_at IS NULL AND redeemed_by IS NULL ON CONFLICT(user_id) DO NOTHING",
          )
          .bind(user.id, now, hash, user.email, now),
        db
          .prepare(
            'UPDATE invitations SET redeemed_by=?,redeemed_at=? WHERE token_hash=? AND redeemed_by IS NULL AND EXISTS (SELECT 1 FROM members WHERE user_id=? AND invitation_id=invitations.id)',
          )
          .bind(user.id, now, hash, user.id),
        db
          .prepare(
            "INSERT INTO draft_libraries (owner_id,revision,document,saved_at) SELECT user_id,0,?,? FROM members WHERE user_id=? AND status='active' ON CONFLICT(owner_id) DO NOTHING",
          )
          .bind(JSON.stringify({ version: 1, drafts: [] }), now, user.id),
      ]);
      const accepted = await db
        .prepare(
          'SELECT m.user_id FROM members m JOIN invitations i ON i.id=m.invitation_id WHERE m.user_id=? AND i.token_hash=? AND i.redeemed_by=?',
        )
        .bind(user.id, hash, user.id)
        .first();
      if (!accepted)
        throw new AccountError(
          403,
          'This invitation is unavailable or belongs to another email.',
        );
      await db
        .prepare(
          "UPDATE account_profiles SET role='ambassador',name=(SELECT name FROM members WHERE user_id=?),updated_at=? WHERE user_id=? AND role='member'",
        )
        .bind(user.id, now, user.id)
        .run();
      return json(await access(request, db, config));
    }
    if (path === '/api/account/members/status' && request.method === 'POST') {
      owner();
      if (
        typeof data.id !== 'string' ||
        !['active', 'suspended'].includes(String(data.status))
      )
        throw new AccountError(400, 'Select a valid membership state.');
      const result = await db
        .prepare('UPDATE members SET status=? WHERE user_id=?')
        .bind(data.status, data.id)
        .run();
      if (!result.meta.changes)
        throw new AccountError(404, 'Member not found.');
      return json({ updated: true });
    }
    if (path === '/api/account/library' && request.method === 'PUT') {
      active();
      if (!Number.isSafeInteger(data.revision) || (data.revision as number) < 0)
        throw new AccountError(400, 'A valid library revision is required.');
      const library = canonicalLibrary(data.library);
      const result = await db
        .prepare(
          "UPDATE draft_libraries SET document=?,revision=revision+1,saved_at=? WHERE owner_id=? AND revision=? AND EXISTS (SELECT 1 FROM members WHERE user_id=? AND status='active') RETURNING revision",
        )
        .bind(JSON.stringify(library), now, user.id, data.revision, user.id)
        .first<{ revision: number }>();
      if (!result)
        throw new AccountError(
          409,
          'The account library changed or access was withdrawn. Reload it before saving again. Your working text is unchanged.',
        );
      return json({ revision: result.revision, library });
    }
    throw new AccountError(405, 'This action is not supported.');
  } catch (error) {
    if (error instanceof AccountError)
      return json({ error: error.message }, error.status);
    // Database internals and identities must not leak through public error responses.
    return json(
      {
        error:
          'Member services are temporarily unavailable. Your work has not been confirmed saved.',
      },
      503,
    );
  }
}
