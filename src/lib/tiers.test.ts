import { describe, expect, it } from "vitest";
import { tierOf } from "@/lib/tiers";

const now = new Date("2026-06-15T00:00:00Z");
const day = 86_400_000;
describe("tierOf", () => {
  it("is free with no subscription", () => expect(tierOf(undefined, now)).toBe("free"));
  it("grants the tier while active", () => expect(tierOf({ tier: "pro", status: "active", currentPeriodEnd: null }, now)).toBe("pro"));
  it("keeps a cancelled plan until its period ends", () => {
    expect(tierOf({ tier: "plus", status: "cancelled", currentPeriodEnd: new Date(now.getTime() + day) }, now)).toBe("plus");
    expect(tierOf({ tier: "plus", status: "cancelled", currentPeriodEnd: new Date(now.getTime() - day) }, now)).toBe("free");
  });
  it("drops suspended, pending and expired plans", () => {
    for (const status of ["suspended", "pending", "expired"]) expect(tierOf({ tier: "pro", status, currentPeriodEnd: null }, now)).toBe("free");
  });
});
