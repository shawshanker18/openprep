import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ ticket: vi.fn(), client: vi.fn(), ip: vi.fn(async () => "test-ip"), origin: "https://openprep.site" }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("@/server/signup", () => ({ issueSignupTicket: mocks.ticket, clientIp: mocks.ip, SIGNUP_REFUSALS: [] }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ origin: mocks.origin }) }));
const { prepareEmailSignIn, signInWithGoogle, beginGoogleOAuth } = await import("./actions");
beforeEach(() => { vi.clearAllMocks(); mocks.ticket.mockResolvedValue(true); mocks.origin = "https://openprep.site"; });
it("requires privacy acceptance and a valid email before reserving an email address", async () => {
  expect(await prepareEmailSignIn("student@example.com", false)).toMatchObject({ ok: false });
  expect(await prepareEmailSignIn("invalid", true)).toMatchObject({ ok: false });
  expect(mocks.ticket).not.toHaveBeenCalled();
  expect(await prepareEmailSignIn("student@example.com", true)).toEqual({ ok: true });
  expect(mocks.ticket).toHaveBeenCalledWith("student@example.com", "test-ip");
});
it("stops a burst of email attempts before contacting the provider", async () => {
  mocks.ticket.mockResolvedValue(false);
  expect(await prepareEmailSignIn("student@example.com", true)).toMatchObject({ ok: false });
});
it("does not contact Google without privacy acceptance", async () => {
  expect(await beginGoogleOAuth(false)).toMatchObject({ ok: false });
  expect(await signInWithGoogle({ credential: "a.b.c", nonce: "00000000-0000-4000-8000-000000000001", privacyAccepted: false } as unknown as Parameters<typeof signInWithGoogle>[0])).toEqual({ ok: false });
  expect(mocks.client).not.toHaveBeenCalled();
});
it("uses one PKCE Google flow without an email reservation or daily signup quota", async () => {
  const oauth = vi.fn(async () => ({ data: { url: "https://example.com/authorize" }, error: null }));
  mocks.client.mockResolvedValue({ auth: { signInWithOAuth: oauth } });
  mocks.ticket.mockResolvedValue(false);
  expect(await beginGoogleOAuth(true)).toEqual({ ok: true, url: "https://example.com/authorize" });
  expect(mocks.ticket).not.toHaveBeenCalled();
  expect(oauth).toHaveBeenCalledWith({ provider: "google", options: { redirectTo: "https://openprep.site/auth/callback?flow=google", skipBrowserRedirect: true, queryParams: { prompt: "select_account" } } });
});
it("rejects an unapproved callback origin before contacting Google", async () => {
  mocks.origin = "https://attacker.example";
  expect(await beginGoogleOAuth(true)).toMatchObject({ ok: false });
  expect(mocks.client).not.toHaveBeenCalled();
});
it("returns a recoverable provider failure", async () => {
  mocks.client.mockResolvedValue({ auth: { signInWithOAuth: async () => ({ data: { url: null }, error: { message: "secret" } }) } });
  expect(await beginGoogleOAuth(true)).toMatchObject({ ok: false });
});
it("keeps native nonce verification without reading unverified token emails", async () => {
  const idToken = vi.fn(async () => ({ error: null }));
  mocks.client.mockResolvedValue({ auth: { signInWithIdToken: idToken } });
  const input = { credential: "a.b.c", nonce: "00000000-0000-4000-8000-000000000001", privacyAccepted: true as const };
  expect(await signInWithGoogle(input)).toMatchObject({ ok: true });
  expect(idToken).toHaveBeenCalledWith({ provider: "google", token: input.credential, nonce: input.nonce });
  expect(mocks.ticket).not.toHaveBeenCalled();
});
