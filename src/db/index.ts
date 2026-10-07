import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { healthyPool } from "@/lib/healthy-pool";

// Supabase transaction pooler does not support prepared statements → prepare: false.
const create = () => {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false, max: 5, idle_timeout: 5, connect_timeout: 5, max_lifetime: 60 });
  return { client, database: drizzle(client, { schema, logger: process.env.DB_LOG === "1" }) };
};
const g = globalThis as unknown as { openprepPool?: ReturnType<typeof makePool> };
const makePool = () => healthyPool(create, ({ client }) => client`select 1`, ({ client }) => client.end({ timeout: 0 }));
const pool = g.openprepPool ??= makePool();
export const ensureDatabase = () => pool.ready();
/** A request stalled on the pool: replace it so one stuck connection can never take pages down. */
export const recycleDatabase = () => pool.recycle();
// Resolve methods against the current client after a failed liveness check replaces the pool.
export const db = new Proxy({} as ReturnType<typeof create>["database"], {
  get(_target, key) {
    const database = pool.current.database;
    const value = Reflect.get(database, key);
    return typeof value === "function" ? value.bind(database) : value;
  },
});
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

