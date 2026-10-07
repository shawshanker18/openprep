import { expect, it } from "vitest";
import nextConfig from "../next.config";

it("sends the old vercel.app address to the real domain, except the timer endpoint", async () => {
  const rules = await nextConfig.redirects!();
  const rule = rules.find((r) => r.has?.some((h) => h.type === "host" && h.value === "openprep-opal.vercel.app"))!;
  expect(rule.destination).toBe("https://www.openprep.site/:path");
  expect(rule.permanent).toBe(true);
  // "/:path(<regex>)" matches a leading slash followed by <regex>.
  const matches = (path: string) => new RegExp(`^/${rule.source.slice("/:path".length)}$`).test(path);
  for (const path of ["/", "/dashboard", "/practice", "/login", "/auth/callback", "/skills/m-alg-lin1"]) expect(matches(path), path).toBe(true);
  for (const path of ["/api/cron/tick", "/api/cron/"]) expect(matches(path), path).toBe(false);
});
