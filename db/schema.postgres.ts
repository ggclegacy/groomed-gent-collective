import { sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  integer,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
export const invitations = pgTable(
  'invitations',
  {
    id: text('id').primaryKey(),
    tokenHash: text('token_hash').notNull(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    track: text('track').notNull(),
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at').notNull(),
    createdBy: text('created_by').notNull(),
    redeemedBy: text('redeemed_by'),
    redeemedAt: text('redeemed_at'),
    revokedAt: text('revoked_at'),
  },
  (table) => [
    uniqueIndex('invitation_token_unique').on(table.tokenHash),
    check('invitation_track', sql`${table.track} IN ('ambassador','barber')`),
  ],
);
export const members = pgTable(
  'members',
  {
    userId: text('user_id').primaryKey(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    track: text('track').notNull(),
    status: text('status').notNull(),
    wholesaleStatus: text('wholesale_status').notNull(),
    joinedAt: text('joined_at').notNull(),
    invitationId: text('invitation_id')
      .notNull()
      .references(() => invitations.id),
  },
  (table) => [
    uniqueIndex('member_email_unique').on(table.email),
    uniqueIndex('member_invitation_unique').on(table.invitationId),
    check('member_track', sql`${table.track} IN ('ambassador','barber')`),
    check('member_status', sql`${table.status} IN ('active','suspended')`),
    check(
      'wholesale_status',
      sql`${table.wholesaleStatus} IN ('not_reviewed','eligible','approved')`,
    ),
  ],
);
export const libraries = pgTable(
  'draft_libraries',
  {
    ownerId: text('owner_id')
      .primaryKey()
      .references(() => members.userId),
    revision: integer('revision').notNull().default(0),
    document: text('document').notNull(),
    savedAt: text('saved_at').notNull(),
  },
  (table) => [check('positive_revision', sql`${table.revision} >= 0`)],
);

export const gentlemanMemories = pgTable(
  'gentleman_memories',
  {
    ownerId: text('owner_id')
      .primaryKey()
      .references(() => accountProfiles.userId),
    revision: integer('revision').notNull().default(0),
    document: text('document').notNull(),
    savedAt: text('saved_at').notNull(),
  },
  (table) => [check('memory_positive_revision', sql`${table.revision} >= 0`)],
);

export const productLearning = pgTable(
  'product_learning',
  {
    ownerId: text('owner_id')
      .primaryKey()
      .references(() => members.userId),
    revision: integer('revision').notNull().default(0),
    document: text('document').notNull(),
    savedAt: text('saved_at').notNull(),
  },
  (table) => [check('learning_positive_revision', sql`${table.revision} >= 0`)],
);

export * from './intelligence.postgres';

export const accountProfiles = pgTable(
  'account_profiles',
  {
    userId: text('user_id').primaryKey(),
    email: text('email').notNull(),
    name: text('name').notNull().default(''),
    role: text('role').notNull().default('member'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    check(
      'account_role',
      sql`${t.role} IN ('member','ambassador','admin','founder')`,
    ),
  ],
);
export const onboardingDrafts = pgTable(
  'onboarding_drafts',
  {
    ownerId: text('owner_id')
      .primaryKey()
      .references(() => accountProfiles.userId, { onDelete: 'cascade' }),
    revision: integer('revision').notNull().default(0),
    document: text('document').notNull(),
    savedAt: text('saved_at').notNull(),
  },
  (t) => [check('onboarding_revision', sql`${t.revision} >= 0`)],
);
