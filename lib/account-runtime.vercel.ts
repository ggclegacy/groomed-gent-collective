import { auth, currentUser } from '@clerk/nextjs/server';
import { neon } from '@neondatabase/serverless';
import { accountApi } from './account-service.ts';
import { postgresDatabase } from './account-database.ts';

export async function handleVercelAccount(request: Request) {
  const { userId } = await auth();
  const user = userId ? await currentUser() : null;
  const email = user?.emailAddresses.find(
    (e) =>
      e.id === user.primaryEmailAddressId &&
      e.verification?.status === 'verified',
  );
  // Identity comes exclusively from the verified SDK session and verified primary email.
  const verifiedIdentity =
    user && userId === user.id && email
      ? { id: user.id, email: email.emailAddress }
      : null;
  const sql = neon(process.env.DATABASE_URL!);
  const db = postgresDatabase({
    query: async (query, values) => {
      const r = await sql.query(query, values, { fullResults: true });
      return { rows: r.rows, rowCount: r.rowCount ?? 0 };
    },
    batch: async (statements) => {
      const results = await sql.transaction(
        statements.map((s) => sql.query(s.query, s.values)),
        { fullResults: true },
      );
      return results.map((r) => ({ rows: r.rows, rowCount: r.rowCount ?? 0 }));
    },
  });
  return accountApi(request, db, {
    mode: 'verified-provider',
    ownerId: process.env.GGC_OWNER_ID,
    verifiedIdentity,
  });
}
