import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  uniqueIndex,
  foreignKey,
  check,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
export const intelligenceAccounts = sqliteTable(
  'intelligence_accounts',
  {
    ownerId: text('owner_id').primaryKey(),
    revision: integer('revision').notNull(),
    completed: integer('completed').notNull().default(0),
    personalization: integer('personalization').notNull().default(0),
  },
  (t) => [
    check('intelligence_revision', sql`${t.revision} > 0`),
    check('intelligence_completed', sql`${t.completed} IN (0,1)`),
    check('intelligence_personalization', sql`${t.personalization} IN (0,1)`),
  ],
);
export const intelligenceVersions = sqliteTable(
  'intelligence_versions',
  {
    ownerId: text('owner_id').notNull(),
    revision: integer('revision').notNull(),
  },
  (t) => [primaryKey({ columns: [t.ownerId, t.revision] })],
);
export const intelligenceNodes = sqliteTable(
  'intelligence_nodes',
  {
    ownerId: text('owner_id')
      .notNull()
      .references(() => intelligenceAccounts.ownerId, { onDelete: 'cascade' }),
    id: text('id').notNull(),
    document: text('document').notNull(),
  },
  (t) => [primaryKey({ columns: [t.ownerId, t.id] })],
);
export const intelligenceEvents = sqliteTable(
  'intelligence_events',
  {
    ownerId: text('owner_id').notNull(),
    nodeId: text('node_id').notNull(),
    id: text('id').notNull(),
    document: text('document').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.ownerId, t.id] }),
    foreignKey({
      columns: [t.ownerId, t.nodeId],
      foreignColumns: [intelligenceNodes.ownerId, intelligenceNodes.id],
    }).onDelete('cascade'),
  ],
);
export const intelligenceEdges = sqliteTable(
  'intelligence_edges',
  {
    ownerId: text('owner_id').notNull(),
    id: text('id').notNull(),
    fromId: text('from_id').notNull(),
    toId: text('to_id').notNull(),
    relation: text('relation').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.ownerId, t.id] }),
    uniqueIndex('intelligence_edge_unique').on(
      t.ownerId,
      t.fromId,
      t.toId,
      t.relation,
    ),
    foreignKey({
      columns: [t.ownerId, t.fromId],
      foreignColumns: [intelligenceNodes.ownerId, intelligenceNodes.id],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.ownerId, t.toId],
      foreignColumns: [intelligenceNodes.ownerId, intelligenceNodes.id],
    }).onDelete('cascade'),
  ],
);
