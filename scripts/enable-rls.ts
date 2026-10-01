// RLS with no policies on every public table: deny-all backstop for the public anon key (spec 01 §4.2).
// Our server connects as the postgres role, which bypasses RLS. Idempotent; runs after every migrate.
import postgres from "postgres";

const sql = postgres(process.env.MIGRATE_DATABASE_URL ?? process.env.DATABASE_URL!, { prepare: false });
const tables = await sql<{ tablename: string }[]>`select tablename from pg_tables where schemaname = 'public'`;
for (const { tablename } of tables) {
  await sql.unsafe(`alter table public."${tablename}" enable row level security`);
}
console.log(`RLS enabled on ${tables.length} tables`);
await sql.end();
