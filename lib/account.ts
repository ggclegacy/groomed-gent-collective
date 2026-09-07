import { readLibrary, type DraftLibrary } from './studio.ts';
export type MemberState = 'active' | 'suspended';
export type PartnerTrack = 'ambassador' | 'barber';
export interface Member {
  user_id: string;
  email: string;
  name: string;
  track: PartnerTrack;
  status: MemberState;
  wholesale_status: 'not_reviewed' | 'eligible' | 'approved';
  joined_at: string;
}
export interface AccountAccess {
  profile?: import('./profile.ts').Profile;
  signInPath?: string;
  signOutPath?: string;
  configured: boolean;
  local: boolean;
  signedIn: boolean;
  owner: boolean;
  email: string | null;
  member: Member | null;
}
export interface AccountLibrary {
  revision: number;
  library: DraftLibrary;
}
export class AccountError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export function canonicalLibrary(value: unknown): DraftLibrary {
  try {
    const encoded = JSON.stringify(value);
    if (new TextEncoder().encode(encoded).byteLength > 1_500_000)
      throw new Error();
    const parsed = readLibrary(encoded);
    if (parsed.drafts.some((d) => !d.title.trim() || !d.body.trim()))
      throw new Error();
    return {
      version: 1,
      drafts: parsed.drafts.map((d) => ({
        id: d.id,
        title: d.title.trim(),
        body: d.body,
        context: d.context,
        format: d.format,
        updatedAt: d.updatedAt,
        review: {
          personal: d.review.personal,
          claims: d.review.claims,
          relationship: d.review.relationship,
        },
      })),
    };
  } catch {
    throw new AccountError(
      400,
      'The draft library is invalid. Your saved account copy has not changed.',
    );
  }
}
export function normalizeEmail(value: unknown): string {
  if (
    typeof value !== 'string' ||
    value.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  )
    throw new AccountError(400, 'Enter a valid invitation email.');
  return value.trim().toLowerCase();
}
