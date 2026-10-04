import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
export const r2Files = pgTable("r2_files", {
  id: uuid("id").primaryKey(),
  ownerId: uuid("owner_id").notNull(),
  objectKey: text("object_key").notNull().unique(),
  contentType: text("content_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("r2_files_owner_created_idx").on(table.ownerId, table.createdAt)]);
