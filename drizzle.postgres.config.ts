import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  schema: './db/schema.postgres.ts',
  out: './migrations/postgres',
  dialect: 'postgresql',
  ...(process.env.GGC_MIGRATION_DATABASE_URL
    ? { dbCredentials: { url: process.env.GGC_MIGRATION_DATABASE_URL } }
    : {}),
});
