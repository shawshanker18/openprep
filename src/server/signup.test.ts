import fs from "node:fs";
import path from "node:path";
import { beforeAll, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/db/schema";

const context = vi.hoisted(() => ({ device: null as string | null, ip: null }));
vi.mock("./delivery-context", () => ({ deliveryContext: async () => context }));
const pg = new PGlite();
const db = drizzle(pg, { schema });
vi.mock("@/db", () => ({ db }));
const S = await import("./signup");
beforeAll(async () => {
  const dir = path.resolve(import.meta.dirname, "../../drizzle");
  for (const file of fs.readdirSync(dir).filter(x => x.endsWith(".sql") && !x.startsWith("0001")).sort())
    for (const stmt of fs.readFileSync(path.join(dir, file), "utf8").split("--> statement-breakpoint")) await pg.exec(stmt);
});
const hook = async (email: string, user: Record<string, unknown> = {}) => {
  const event = { metadata: { name: "before-user-created", ip_address: "203.0.113.9" }, user: { email, ...user } };
  const r = await pg.query<{ r: { error?: { http_code: number } } }>("select public.hook_signup_cap($1::jsonb) as r", [JSON.stringify(event)]);
  return r.rows[0]!.r;
};
it("accepts new verified Google identities without an email-first reservation", async () => {
  expect(await hook("google@example.com", { app_metadata: { provider: "google" } })).toEqual({});
  expect(await hook("native@example.com", { raw_app_meta_data: { provider: "google" } })).toEqual({});
  expect((await hook("", { app_metadata: { provider: "google" } })).error?.http_code).toBe(403);
});
it("does not let user-editable metadata pretend to be Google", async () => {
  expect((await hook("spoof@example.com", { user_metadata: { provider: "google" } })).error?.http_code).toBe(403);
  expect((await hook("spoof2@example.com", { raw_user_meta_data: { provider: "google" } })).error?.http_code).toBe(403);
  expect((await hook("other@example.com", { app_metadata: { provider: "azure" } })).error?.http_code).toBe(403);
});
it("allows a classroom on shared Wi-Fi while keeping email reservations single-use", async () => {
  expect((await hook("direct@example.com")).error?.http_code).toBe(403);
  for (let i = 0; i < 20; i++) {
    await S.issueSignupTicket(`Student${i}@Example.com`, "shared-school");
    expect(await hook(`student${i}@example.com`)).toEqual({});
  }
  expect((await hook("student0@example.com")).error?.http_code).toBe(403);
  await S.issueSignupTicket("late@example.com", "late", new Date(Date.now() - 31 * 60_000));
  expect((await hook("late@example.com")).error?.http_code).toBe(403);
});
it("caps rapid requests instead of blocking normal repeated logins for a whole day", async () => {
  context.device = "same-device";
  const now = new Date();
  for (let i = 0; i < 10; i++) expect(await S.issueSignupTicket(`request${i}@example.com`, "network", now)).toBe(true);
  expect(await S.issueSignupTicket("burst@example.com", "network", now)).toBe(false);
  expect(await S.issueSignupTicket("later@example.com", "network", new Date(now.getTime() + 60_001))).toBe(true);
  context.device = null;
  await S.issueSignupTicket("old@example.com", "old-network", new Date(Date.now() - 3 * 86_400_000));
  await S.deleteOldSignupTickets();
  expect((await pg.query("select 1 from signup_tickets where email = 'old@example.com'")).rows).toHaveLength(0);
});
