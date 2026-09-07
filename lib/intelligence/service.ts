import type { AccountDatabase, AccountStatement } from '../account-database.ts';
import { AccountError } from '../account.ts';
import {
  parseTransfer,
  proposal,
  safeText,
  type Intelligence,
  type Knowledge,
  type Connection,
} from './model.ts';
export async function readIntelligence(
  db: AccountDatabase,
  userId: string,
): Promise<Intelligence> {
  const head = await db
    .prepare(
      'SELECT revision,completed,personalization FROM intelligence_accounts WHERE owner_id=?',
    )
    .bind(userId)
    .first<{ revision: number; completed: number; personalization: number }>();
  const nodes = await db
    .prepare(
      'SELECT document FROM intelligence_nodes WHERE owner_id=? ORDER BY id',
    )
    .bind(userId)
    .all<{ document: string }>();
  const edges = await db
    .prepare(
      'SELECT id,from_id,to_id,relation FROM intelligence_edges WHERE owner_id=?',
    )
    .bind(userId)
    .all<{ id: string; from_id: string; to_id: string; relation: string }>();
  return {
    revision: head?.revision ?? 0,
    completed: Boolean(head?.completed),
    personalization: Boolean(head?.personalization),
    nodes: nodes.results.map((n) => JSON.parse(n.document) as Knowledge),
    edges: edges.results.map((e) => ({
      id: e.id,
      from: e.from_id,
      to: e.to_id,
      relation: e.relation,
    })),
  };
}
export async function changeIntelligence(
  db: AccountDatabase,
  userId: string,
  data: Record<string, unknown>,
): Promise<Intelligence | { proposals: ReturnType<typeof parseTransfer> }> {
  if (data.action === 'parse')
    return { proposals: parseTransfer(data.text, data.source) };
  const state = await readIntelligence(db, userId);
  if (!Number.isSafeInteger(data.revision) || data.revision !== state.revision)
    throw new AccountError(
      409,
      'Your profile changed in another window. Reload before saving; your current edits are still on screen.',
    );
  const now = new Date().toISOString(),
    revision = state.revision + 1;
  const statements: AccountStatement[] = [
    db
      .prepare(
        'INSERT INTO intelligence_versions (owner_id,revision) VALUES (?,?)',
      )
      .bind(userId, revision),
    db
      .prepare(
        'INSERT INTO intelligence_accounts (owner_id,revision,completed,personalization) VALUES (?,?,0,0) ON CONFLICT(owner_id) DO UPDATE SET revision=excluded.revision',
      )
      .bind(userId, revision),
  ];
  const save = (node: Knowledge) => {
    statements.push(
      db
        .prepare(
          'INSERT INTO intelligence_nodes (owner_id,id,document) VALUES (?,?,?) ON CONFLICT(owner_id,id) DO UPDATE SET document=excluded.document',
        )
        .bind(userId, node.id, JSON.stringify(node)),
    );
    statements.push(
      db
        .prepare(
          'INSERT INTO intelligence_events (owner_id,node_id,id,document,created_at) VALUES (?,?,?,?,?)',
        )
        .bind(userId, node.id, crypto.randomUUID(), JSON.stringify(node), now),
    );
  };
  if (data.action === 'approve') {
    if (
      data.approved !== true ||
      !Array.isArray(data.items) ||
      data.items.length > 160
    )
      throw new AccountError(
        400,
        'Explicitly approve up to 80 reviewed items.',
      );
    const items = data.items
      .filter((p) => !(p && typeof p === 'object' && p.decision === 'remove'))
      .map(proposal);
    if (items.length > 80)
      throw new AccountError(
        400,
        'Keep up to 80 details in this approval. Remove extra proposals, then approve again.',
      );
    if (state.nodes.length + items.length > 500)
      throw new AccountError(
        400,
        'Your profile can hold 500 items. Remove unused knowledge before adding more.',
      );
    if (!state.completed && !items.length)
      throw new AccountError(
        400,
        'Add at least one useful detail, or choose to start without a profile.',
      );
    for (const p of items)
      save({
        ...p,
        id: crypto.randomUUID(),
        status: p.decision === 'historical' ? 'historical' : 'current',
        confirmation: p.decision === 'confirm' ? 'confirmed' : 'unconfirmed',
        confirmedAt: p.decision === 'confirm' ? now : null,
        createdAt: now,
        updatedAt: now,
        revision: 1,
      });
    statements.push(
      db
        .prepare(
          'UPDATE intelligence_accounts SET completed=1 WHERE owner_id=?',
        )
        .bind(userId),
    );
  } else if (data.action === 'update') {
    const old = state.nodes.find((n) => n.id === data.id);
    if (!old)
      throw new AccountError(404, 'That knowledge item is unavailable.');
    const p = proposal(data.item);
    if (p.decision === 'remove')
      throw new AccountError(
        400,
        'Use Remove knowledge to delete this detail and its history.',
      );
    const status = data.status;
    if (!['current', 'historical', 'disputed'].includes(String(status)))
      throw new AccountError(400, 'Choose the current status.');
    // Preserve original provenance; corrections are versioned in the event history.
    save({
      ...old,
      ...p,
      source: old.source,
      status: status as Knowledge['status'],
      confirmation: p.decision === 'confirm' ? 'confirmed' : 'unconfirmed',
      confirmedAt: p.decision === 'confirm' ? now : old.confirmedAt,
      updatedAt: now,
      revision: old.revision + 1,
    });
  } else if (data.action === 'remove') {
    if (!state.nodes.some((n) => n.id === data.id))
      throw new AccountError(404, 'That knowledge item is unavailable.');
    statements.push(
      db
        .prepare(
          'DELETE FROM intelligence_edges WHERE owner_id=? AND (from_id=? OR to_id=?)',
        )
        .bind(userId, data.id, data.id),
    );
    statements.push(
      db
        .prepare(
          'DELETE FROM intelligence_events WHERE owner_id=? AND node_id=?',
        )
        .bind(userId, data.id),
    );
    statements.push(
      db
        .prepare('DELETE FROM intelligence_nodes WHERE owner_id=? AND id=?')
        .bind(userId, data.id),
    );
  } else if (data.action === 'connect') {
    if (state.edges.length >= 1000)
      throw new AccountError(400, 'Remove unused connections first.');
    if (
      data.from === data.to ||
      !state.nodes.some((n) => n.id === data.from) ||
      !state.nodes.some((n) => n.id === data.to)
    )
      throw new AccountError(
        400,
        'Choose two different items from your profile.',
      );
    if (
      ![
        'supports',
        'has_project',
        'has_milestone',
        'achieved',
        'related_to',
      ].includes(String(data.relation))
    )
      throw new AccountError(400, 'Choose a supported connection.');
    const e: Connection = {
      id: crypto.randomUUID(),
      from: String(data.from),
      to: String(data.to),
      relation: safeText(data.relation, 40),
    };
    statements.push(
      db
        .prepare(
          'INSERT INTO intelligence_edges (owner_id,id,from_id,to_id,relation) VALUES (?,?,?,?,?) ON CONFLICT(owner_id,from_id,to_id,relation) DO NOTHING',
        )
        .bind(userId, e.id, e.from, e.to, e.relation),
    );
  } else if (data.action === 'disconnect') {
    if (!state.edges.some((e) => e.id === data.id))
      throw new AccountError(404, 'Connection not found.');
    statements.push(
      db
        .prepare('DELETE FROM intelligence_edges WHERE owner_id=? AND id=?')
        .bind(userId, data.id),
    );
  } else if (data.action === 'settings') {
    if (typeof data.personalization !== 'boolean')
      throw new AccountError(
        400,
        'Choose whether Cassius may use your confirmed private context.',
      );
    statements.push(
      db
        .prepare(
          'UPDATE intelligence_accounts SET personalization=? WHERE owner_id=?',
        )
        .bind(Number(data.personalization), userId),
    );
  } else if (data.action === 'skip') {
    statements.push(
      db
        .prepare(
          'UPDATE intelligence_accounts SET completed=1 WHERE owner_id=?',
        )
        .bind(userId),
    );
  } else if (data.action === 'erase') {
    if (data.confirmation !== 'REMOVE MY KNOWLEDGE')
      throw new AccountError(400, 'Confirm removal of your knowledge.');
    for (const table of [
      'intelligence_edges',
      'intelligence_events',
      'intelligence_nodes',
    ])
      statements.push(
        db.prepare(`DELETE FROM ${table} WHERE owner_id=?`).bind(userId),
      );
    statements.push(
      db
        .prepare(
          'UPDATE intelligence_accounts SET completed=0,personalization=0 WHERE owner_id=?',
        )
        .bind(userId),
    );
  } else throw new AccountError(400, 'Unknown profile action.');
  try {
    await db.batch(statements);
  } catch (error) {
    const current = await readIntelligence(db, userId);
    if (current.revision !== state.revision)
      throw new AccountError(
        409,
        'Your profile changed in another window. Reload before saving.',
      );
    throw error;
  }
  return readIntelligence(db, userId);
}
