import fs from "node:fs";
import path from "node:path";
import { beforeAll, beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";

const pg = new PGlite(), db = drizzle(pg, { schema });
const A = "00000000-0000-0000-0000-0000000000a1";
const B = "00000000-0000-0000-0000-0000000000b1";
const { capture } = vi.hoisted(() => ({ capture: vi.fn() }));
vi.mock("@/db", () => ({ db }));
vi.mock("@/server/auth", () => ({ requireUser: async () => ({ userId: A }) }));
vi.mock("@/server/paypal", () => ({ captureOrder: capture }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }), redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
const { default: Page } = await import("./page");
const render = async (order?: string) => renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ order }) }));
const purchase = async (status: string, tier = "plus", userId = A) => db.insert(schema.membershipPurchases).values({ userId, tier, status, billing: "monthly", days: 30, amountCents: 700, paypalOrderId: "ORDER-1" });

beforeAll(async () => {
  const dir = path.resolve(process.cwd(), "drizzle");
  for (const file of fs.readdirSync(dir).filter((x) => x.endsWith(".sql") && !x.startsWith("0001")).sort())
    for (const stmt of fs.readFileSync(path.join(dir, file), "utf8").split("--> statement-breakpoint")) await pg.exec(stmt);
  await db.insert(schema.profiles).values([{ id: A }, { id: B }]);
});
beforeEach(async () => { await db.delete(schema.membershipPurchases); capture.mockReset(); });

it("redirects missing and unknown orders without calling PayPal", async () => {
  await expect(render()).rejects.toThrow("redirect:/pricing");
  await expect(render("unknown")).rejects.toThrow("redirect:/pricing");
  expect(capture).not.toHaveBeenCalled();
});
it("never shows or captures someone else's purchase", async () => {
  await purchase("created", "pro", B);
  await expect(render("ORDER-1")).rejects.toThrow("redirect:/pricing");
  expect(capture).not.toHaveBeenCalled();
});
it.each(["plus", "pro"])("celebrates the purchased %s tier", async (tier) => {
  await purchase("completed", tier);
  const html = await render("ORDER-1");
  expect(html).toContain(`Congratulations! You’ve got ${tier === "plus" ? "Plus" : "Pro"}.`);
  expect(html).toContain("30 days");
  expect(html).toContain("upgrade-confetti");
  expect(capture).not.toHaveBeenCalled();
});
it("rechecks pending payments and celebrates only after the database confirms completion", async () => {
  await purchase("created", "pro");
  capture.mockImplementation(async () => { await db.update(schema.membershipPurchases).set({ status: "completed" }).where(eq(schema.membershipPurchases.paypalOrderId, "ORDER-1")); return true; });
  expect(await render("ORDER-1")).toContain("Congratulations! You’ve got Pro.");
  expect(capture).toHaveBeenCalledWith("ORDER-1", A);
});
it("keeps an unconfirmed payment pending when PayPal is unavailable", async () => {
  await purchase("created");
  capture.mockRejectedValue(new Error("unavailable"));
  const html = await render("ORDER-1");
  expect(html).toContain("Confirming your upgrade");
  expect(html).toContain("Check payment status");
  expect(html).not.toContain("Congratulations");
});
it("does not celebrate or retry a refunded purchase", async () => {
  await purchase("refunded");
  const html = await render("ORDER-1");
  expect(html).toContain("This purchase was refunded.");
  expect(html).not.toContain("Congratulations");
  expect(capture).not.toHaveBeenCalled();
});
