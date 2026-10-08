// The throttles exist to stop bots, not to be felt. These cases pin that down: a whole class on one school network
// working at a realistic pace is never slowed, a script is, and a throttle fault never blocks a student.
import { afterEach, beforeAll, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

const pg = new PGlite();
const real = drizzle(pg);
const failure = { next: null as Error | null };
vi.mock("@/db", () => ({
  db: { transaction: (fn: (tx: unknown) => Promise<unknown>) => { if (failure.next) { const e = failure.next; failure.next = null; throw e; } return real.transaction(fn as never); } },
}));
const { databaseLimit, anonymousLimited, SLOW_DOWN, LIMITS } = await import("./ratelimit");
const { DeliveryBlocked } = await import("./delivery-policy");

beforeAll(async () => { await pg.exec("create table delivery_windows(id text primary key,times jsonb not null,expires_at timestamptz not null)"); });
afterEach(() => { vi.restoreAllMocks(); failure.next = null; });

const uid = (i: number) => `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`;

it("a class of 60 students behind one school IP, each making a request every second, is never slowed", async () => {
  const ctx = { ip: "school-network", device: null as string | null };
  const base = 1_800_000_000_000;
  let blocked = 0;
  for (let second = 0; second < 8; second++) {
    vi.spyOn(Date, "now").mockReturnValue(base + second * 1000);
    for (let s = 0; s < 60; s++) {
      if (await databaseLimit(uid(s), "request", undefined, { ...ctx, device: `device-${s}` })) blocked++;
    }
  }
  expect(blocked).toBe(0);
}, 30_000);

it("one student working normally (a save every 800 ms plus answers) stays far below the limit", async () => {
  const base = 1_800_100_000_000;
  let blocked = 0;
  for (let i = 0; i < 120; i++) { // two minutes of the fastest autosave rhythm
    vi.spyOn(Date, "now").mockReturnValue(base + i * 800);
    if (await databaseLimit(uid(900), "request")) blocked++;
  }
  expect(blocked).toBe(0);
  expect(LIMITS.requests.max / 10).toBeGreaterThanOrEqual(10); // the limit allows 10+ requests per second
});

it("a script hammering one account is still stopped", async () => {
  vi.spyOn(Date, "now").mockReturnValue(1_800_200_000_000);
  const results = await Promise.all(Array.from({ length: 200 }, () => databaseLimit(uid(901))));
  expect(results.filter((r) => r === SLOW_DOWN).length).toBeGreaterThan(90);
});

it("a throttle fault (database error) never blocks the student", async () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  failure.next = new Error("connection reset");
  expect(await databaseLimit(uid(902))).toBeNull();
});

it("only an exceeded limit is a 429 for signed-out visitors, not a database error", async () => {
  failure.next = new Error("connection reset");
  expect(await anonymousLimited("203.0.113.9")).toBe(false);
  failure.next = new DeliveryBlocked();
  expect(await anonymousLimited("203.0.113.9")).toBe(true);
});
