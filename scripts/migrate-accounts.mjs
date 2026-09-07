import { neon } from '@neondatabase/serverless';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { drizzle } from 'drizzle-orm/neon-http';
// Drizzle tracks already-applied migrations; use the direct URL of an isolated
// Neon branch first. Never print the connection string or raw database errors.
if (!process.env.GGC_MIGRATION_DATABASE_URL) {
  console.error(
    'Set GGC_MIGRATION_DATABASE_URL to the intended database branch.',
  );
  process.exitCode = 1;
} else {
  try {
    await migrate(drizzle(neon(process.env.GGC_MIGRATION_DATABASE_URL)), {
      migrationsFolder: './migrations/postgres',
    });
    console.log('Account migrations applied.');
  } catch {
    console.error(
      'Account migration failed. Inspect the target database and its migration history before retrying.',
    );
    process.exitCode = 1;
  }
}
