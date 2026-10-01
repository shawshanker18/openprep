import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  // Session pooler (5432) for migrations if set; transaction pooler otherwise.
  dbCredentials: { url: process.env.MIGRATE_DATABASE_URL || process.env.DATABASE_URL! },
});
