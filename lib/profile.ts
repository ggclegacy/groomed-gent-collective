import type { AccountDatabase } from './account-database.ts';
import { AccountError } from './account.ts';
export interface Profile {
  user_id: string;
  email: string;
  name: string;
  role: 'member' | 'ambassador' | 'admin' | 'founder';
  created_at: string;
  updated_at: string;
}
export async function ensureProfile(
  db: AccountDatabase,
  user: { id: string; email: string },
  ownerId?: string,
) {
  const now = new Date().toISOString();
  await db
    .prepare(
      "INSERT INTO account_profiles (user_id,email,name,role,created_at,updated_at) VALUES (?,?,'',?,?,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email",
    )
    .bind(
      user.id,
      user.email,
      user.id === ownerId ? 'founder' : 'member',
      now,
      now,
    )
    .run();
  return await db
    .prepare(
      'SELECT user_id,email,name,role,created_at,updated_at FROM account_profiles WHERE user_id=?',
    )
    .bind(user.id)
    .first<Profile>();
}
export interface OnboardingDraft {
  step: number;
  name: string;
  role: string[];
  improve: string[];
  style: string[];
  goal: string;
  business: string;
  other: string;
}
export function parseOnboarding(value: unknown): OnboardingDraft {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new AccountError(400, 'Invalid onboarding answers.');
  const d = value as Record<string, unknown>;
  const text = (key: string, max: number) => {
    if (typeof d[key] !== 'string' || d[key].length > max)
      throw new AccountError(400, 'Keep your answers within the field limits.');
    return d[key] as string;
  };
  const list = (key: string) => {
    if (
      !Array.isArray(d[key]) ||
      d[key].length > 20 ||
      d[key].some((v) => typeof v !== 'string' || v.length > 100)
    )
      throw new AccountError(400, 'Invalid onboarding selection.');
    return d[key] as string[];
  };
  if (!Number.isInteger(d.step) || Number(d.step) < 0 || Number(d.step) > 6)
    throw new AccountError(400, 'Invalid onboarding step.');
  return {
    step: Number(d.step),
    name: text('name', 100),
    goal: text('goal', 1200),
    business: text('business', 1200),
    other: text('other', 1200),
    role: list('role'),
    improve: list('improve'),
    style: list('style'),
  };
}
