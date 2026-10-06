import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Supabase transaction pooler does not support prepared statements → prepare: false.
const g = globalThis as unknown as { pg?: ReturnType<typeof postgres> };
const client = g.pg ?? postgres(process.env.DATABASE_URL!, { prepare: false, max: 5, idle_timeout: 20, connect_timeout: 10 });
g.pg = client; // reuse the bounded pool across route bundles and dev hot reload in this process

export const db = drizzle(client, { schema, logger: process.env.DB_LOG === "1" });
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
