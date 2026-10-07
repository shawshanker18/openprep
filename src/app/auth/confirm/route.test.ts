import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ verify: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { verifyOtp: mocks.verify } }) }));
const { GET } = await import("./route");
const request = (query: string) => new NextRequest(`https://www.openprep.site/auth/confirm?${query}`);
beforeEach(() => { vi.clearAllMocks(); mocks.verify.mockResolvedValue({ error: null }); });
it("signs in email links without a browser PKCE verifier and ignores external destinations", async () => {
  const r = await GET(request("type=email&token_hash=0123456789abcdef&next=https://attacker.example"));
  expect(mocks.verify).toHaveBeenCalledWith({ token_hash: "0123456789abcdef", type: "email" });
  expect(r.headers.get("location")).toBe("https://www.openprep.site/dashboard");
});
it("rejects invalid tokens and non-email verification types", async () => {
  for (const query of ["type=email", "type=recovery&token_hash=0123456789abcdef", "type=email&token_hash=invalid"])
    expect((await GET(request(query))).headers.get("location")).toBe("https://www.openprep.site/login?error=auth");
  expect(mocks.verify).not.toHaveBeenCalled();
});
it("returns an expired-link error when verification fails", async () => {
  mocks.verify.mockResolvedValue({ error: { message: "expired" } });
  expect((await GET(request("type=email&token_hash=0123456789abcdef"))).headers.get("location")).toBe("https://www.openprep.site/login?error=auth");
});
