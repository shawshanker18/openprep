// Sign-up cap: the before-user-created hook (drizzle/0008) against real Postgres (PGlite).
import fs from "node:fs";
import path from "node:path";
import { beforeAll, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/db/schema";

vi.mock('./delivery-context',()=>({deliveryContext:async()=>({ip:null,device:null})}));
const pg = new PGlite();
const db = drizzle(pg, { schema });
vi.mock("@/db", () => ({ db }));
const S = await import("./signup");

beforeAll(async () => {
  const dir = path.resolve(import.meta.dirname, "../../drizzle");
  for (const file of fs.readdirSync(dir).filter((x) => x.endsWith(".sql") && !x.startsWith("0001")).sort())
    for (const stmt of fs.readFileSync(path.join(dir, file), "utf8").split("--> statement-breakpoint")) await pg.exec(stmt);
});

/** What Supabase Auth sends the hook just before creating an account. */
const hook = async (email: string) => {
  const event = { metadata: { name: "before-user-created", ip_address: "203.0.113.9" }, user: { email } };
  const r = await pg.query<{ r: { error?: { http_code: number; message: string } } }>("select public.hook_signup_cap($1::jsonb) as r", [JSON.stringify(event)]);
  return r.rows[0]!.r;
};

it("creates an account only with a fresh ticket, at most 3 per IP per day", async () => {
  // No ticket (someone calling Supabase directly, skipping our site): refused.
  expect((await hook("direct@example.com")).error?.http_code).toBe(403);

  for (const n of [1, 2, 3]) {
    await S.issueSignupTicket(`Student${n}@Example.com`, "198.51.100.7");
    expect(await hook(`student${n}@example.com`)).toEqual({}); // emails match case-insensitively
  }
  // The same ticket can't be used twice.
  expect((await hook("student1@example.com")).error?.http_code).toBe(403);

  // A 4th new account from that IP today: refused with the cap message.
  await S.issueSignupTicket("student4@example.com", "198.51.100.7");
  const fourth = await hook("student4@example.com");
  expect(fourth.error?.http_code).toBe(429);
  expect(fourth.error?.message).toMatch(/Too many new accounts/);

  // Another network is unaffected.
  await S.issueSignupTicket("friend@example.com", "192.0.2.44");
  expect(await hook("friend@example.com")).toEqual({});

  // A ticket older than 30 minutes no longer counts.
  await S.issueSignupTicket("late@example.com", "192.0.2.45", new Date(Date.now() - 31 * 60_000));
  expect((await hook("late@example.com")).error?.http_code).toBe(403);
});

it("caps tickets per IP so the table can't be flooded, and cleans up old ones", async () => {
  const ip = "192.0.2.200";
  for (let i = 0; i < 30; i++) expect(await S.issueSignupTicket(`flood${i}@example.com`, ip)).toBe(true);
  expect(await S.issueSignupTicket("flood30@example.com", ip)).toBe(false);

  await S.issueSignupTicket("old@example.com", "192.0.2.201", new Date(Date.now() - 3 * 86_400_000));
  await S.deleteOldSignupTickets();
  const left = await pg.query("select 1 from signup_tickets where email = 'old@example.com'");
  expect(left.rows).toHaveLength(0);
});
