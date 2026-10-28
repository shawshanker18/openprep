import fs from "node:fs";
import path from "node:path";
import { beforeAll, beforeEach, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/db/schema";

const pg = new PGlite(), db = drizzle(pg, { schema });
vi.mock("@/db", () => ({ db }));
const send = vi.fn(async () => ({}));
vi.mock("web-push", () => ({ default: { setVapidDetails: vi.fn(), sendNotification: send } }));
process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "pub"; process.env.VAPID_PRIVATE_KEY = "priv"; process.env.VAPID_SUBJECT = "mailto:a@b.co";
const { sendExpiryReminders } = await import("./push");

const A = "00000000-0000-0000-0000-0000000000a1", B = "00000000-0000-0000-0000-0000000000b2", C = "00000000-0000-0000-0000-0000000000c3";
const now = new Date("2026-03-01T00:00:00Z");
const day = 86_400_000;
const sub = (userId: string) => ({ endpoint: `https://fcm.googleapis.com/${userId}`, userId, p256dh: "p", auth: "a" });

beforeAll(async () => {
  const dir = path.resolve(import.meta.dirname, "../../drizzle");
  for (const file of fs.readdirSync(dir).filter((x) => x.endsWith(".sql") && !x.startsWith("0001")).sort())
    for (const stmt of fs.readFileSync(path.join(dir, file), "utf8").split("--> statement-breakpoint")) await pg.exec(stmt);
  await db.insert(schema.profiles).values([{ id: A }, { id: B }, { id: C }]);
});
beforeEach(async () => {
  send.mockClear();
  await db.delete(schema.membershipReminders); await db.delete(schema.membershipBlocks); await db.delete(schema.pushSubscriptions);
  await db.insert(schema.pushSubscriptions).values([sub(A), sub(B)]);
  await db.insert(schema.membershipBlocks).values([
    { userId: A, tier: "plus", startsAt: now, endsAt: new Date(now.getTime() + 2 * day) }, // ends soon, has a device
    { userId: B, tier: "pro", startsAt: now, endsAt: new Date(now.getTime() + 20 * day) }, // plenty left
    { userId: C, tier: "plus", startsAt: now, endsAt: new Date(now.getTime() + 2 * day) }, // ends soon, no device
  ]);
});

it("reminds only students whose paid time ends within 3 days and who have a device", async () => {
  expect(await sendExpiryReminders(now)).toEqual({ sent: 1 });
  expect(send).toHaveBeenCalledTimes(1);
  expect(String((send.mock.calls[0] as unknown[])[1])).toContain("Plus plan ends in 1 day");
});

it("sends once per end date", async () => {
  await sendExpiryReminders(now);
  expect(await sendExpiryReminders(new Date(now.getTime() + 3_600_000))).toEqual({ sent: 0 });
});
