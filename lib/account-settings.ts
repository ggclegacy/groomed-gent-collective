import { AccountError } from './account.ts';
import type { AccountDatabase } from './account-database.ts';
export interface MemberSettings {
  displayName: string;
  phone: string;
  location: string;
  business: string;
  reducedMotion: boolean;
  communication: 'none' | 'email';
}
export const defaultSettings: MemberSettings = {
  displayName: '',
  phone: '',
  location: '',
  business: '',
  reducedMotion: false,
  communication: 'none',
};
export function parseSettings(value: unknown): MemberSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new AccountError(400, 'Check your account details.');
  const data = value as Record<string, unknown>;
  const text = (key: string, max: number) => {
    if (
      typeof data[key] !== 'string' ||
      data[key].length > max ||
      Array.from(data[key]).some((char) => char.charCodeAt(0) < 32)
    )
      throw new AccountError(400, `Check the ${key} field and its length.`);
    return data[key].trim();
  };
  if (
    typeof data.reducedMotion !== 'boolean' ||
    !['none', 'email'].includes(String(data.communication))
  )
    throw new AccountError(400, 'Choose valid preferences.');
  const phone = text('phone', 40);
  if (phone && !/^[+()\d .-]{5,40}$/.test(phone))
    throw new AccountError(400, 'Enter a valid contact phone number.');
  return {
    displayName: text('displayName', 100),
    phone,
    location: text('location', 160),
    business: text('business', 200),
    reducedMotion: data.reducedMotion,
    communication: data.communication as MemberSettings['communication'],
  };
}
export async function readSettings(db: AccountDatabase, userId: string) {
  const row = await db
    .prepare('SELECT revision,document FROM account_settings WHERE owner_id=?')
    .bind(userId)
    .first<{ revision: number; document: string }>();
  return {
    revision: row?.revision ?? 0,
    settings: row
      ? parseSettings(JSON.parse(row.document))
      : { ...defaultSettings },
  };
}
export async function saveSettings(
  db: AccountDatabase,
  userId: string,
  data: Record<string, unknown>,
) {
  const settings = parseSettings(data.settings);
  if (!Number.isSafeInteger(data.revision) || Number(data.revision) < 0)
    throw new AccountError(400, 'Invalid saved revision.');
  const document = JSON.stringify(settings),
    now = new Date().toISOString();
  const row =
    Number(data.revision) === 0
      ? await db
          .prepare(
            'INSERT INTO account_settings (owner_id,revision,document,saved_at) VALUES (?,1,?,?) ON CONFLICT(owner_id) DO NOTHING RETURNING revision',
          )
          .bind(userId, document, now)
          .first<{ revision: number }>()
      : await db
          .prepare(
            'UPDATE account_settings SET document=?,saved_at=?,revision=revision+1 WHERE owner_id=? AND revision=? RETURNING revision',
          )
          .bind(document, now, userId, data.revision)
          .first<{ revision: number }>();
  if (!row)
    throw new AccountError(
      409,
      'Your settings changed in another window. Reload saved details before trying again. Your edits are still here.',
    );
  return { revision: row.revision, settings };
}
export async function exportAccount(db: AccountDatabase, userId: string) {
  // Only explicit, app-owned tables; never invitations, other members, or provider credentials.
  const tables = [
    'account_settings',
    'onboarding_drafts',
    'gentleman_memories',
    'draft_libraries',
    'product_learning',
    'intelligence_accounts',
    'intelligence_nodes',
    'intelligence_edges',
    'intelligence_events',
  ];
  const entries = await Promise.all(
    tables.map(async (table) => [
      table,
      (
        await db
          .prepare(`SELECT * FROM ${table} WHERE owner_id=?`)
          .bind(userId)
          .all()
      ).results,
    ]),
  );
  return Object.fromEntries(entries);
}
