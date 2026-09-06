/** Shared prepared-query contract; Sites D1 and Neon use the same authorization service. */
export interface AccountStatement {
  bind(...values: unknown[]): AccountStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes: number } }>;
}
export interface AccountDatabase {
  prepare(query: string): AccountStatement;
  batch(statements: AccountStatement[]): Promise<unknown>;
}
export type QueryResult = { rows: Record<string, unknown>[]; rowCount: number };
export type PostgresExecutor = {
  query: (query: string, values: unknown[]) => Promise<QueryResult>;
  batch: (
    queries: { query: string; values: unknown[] }[],
  ) => Promise<QueryResult[]>;
};
/** Translate only positional placeholders in our static SQL, never interpolate values. */
export function postgresParameters(query: string): string {
  let quoted = false,
    index = 0,
    result = '';
  for (let i = 0; i < query.length; i++) {
    const c = query[i];
    if (c === "'") {
      if (quoted && query[i + 1] === "'") {
        result += "''";
        i++;
        continue;
      }
      quoted = !quoted;
    }
    result += c === '?' && !quoted ? `$${++index}` : c;
  }
  if (quoted) throw new Error('Unterminated SQL literal.');
  return result;
}
export function postgresDatabase(executor: PostgresExecutor): AccountDatabase {
  class Statement implements AccountStatement {
    query: string;
    values: unknown[] = [];
    constructor(query: string) {
      this.query = postgresParameters(query);
    }
    bind(...values: unknown[]) {
      this.values = values;
      return this;
    }
    async first<T>() {
      const result = await executor.query(this.query, this.values);
      return (result.rows[0] ?? null) as T | null;
    }
    async all<T>() {
      const result = await executor.query(this.query, this.values);
      return { results: result.rows as T[] };
    }
    async run() {
      const result = await executor.query(this.query, this.values);
      return { meta: { changes: result.rowCount } };
    }
  }
  return {
    prepare: (query) => new Statement(query),
    batch: async (statements) => {
      if (!statements.every((s) => s instanceof Statement))
        throw new Error('Statements must belong to this database.');
      return executor.batch(
        statements.map((s) => ({
          query: (s as Statement).query,
          values: (s as Statement).values,
        })),
      );
    },
  };
}
