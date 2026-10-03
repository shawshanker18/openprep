const { test } = require("node:test");
const assert = require("node:assert/strict");
const { authLinkPath, isAppUrl, isTestPage, isExternalWebUrl, reminderDue, localDay } = require("./lib");

const SITE = "https://openprep-opal.vercel.app";

test("auth deep link", () => {
  assert.equal(authLinkPath("openprep://auth?code=abc123def"), "/auth/callback?code=abc123def");
  assert.equal(authLinkPath("openprep://auth?code=a%22b%3Cscript"), null); // not a plain token
  assert.equal(authLinkPath("openprep://evil?code=abc123def"), null);
  assert.equal(authLinkPath("https://x.com/auth?code=abc123def"), null);
  assert.equal(authLinkPath("not a url"), null);
  assert.equal(authLinkPath("openprep://auth?google=eyJh.eyJz.c2ln_-"), "/auth/google/finish#t=eyJh.eyJz.c2ln_-");
  assert.equal(authLinkPath("openprep://auth?google=a.b.c%23x"), null); // not a JWT
  assert.equal(authLinkPath("openprep://auth?google=a.b"), null);
  assert.equal(authLinkPath(`openprep://auth?google=a.b.${"c".repeat(9000)}`), null);
});

test("navigation policy", () => {
  assert.ok(isAppUrl(`${SITE}/dashboard`, SITE));
  assert.ok(!isAppUrl("https://openprep-opal.vercel.app.evil.com/", SITE));
  assert.ok(!isAppUrl("https://www.desmos.com/calculator", SITE));
  assert.ok(isExternalWebUrl("https://www.desmos.com/calculator"));
  assert.ok(!isExternalWebUrl("file:///C:/Windows/System32/calc.exe"));
  assert.ok(!isExternalWebUrl("javascript:alert(1)"));
});

test("reminder fires once in the chosen hour", () => {
  const at = new Date(2026, 9, 2, 18, 5);
  assert.ok(reminderDue(at, 18, null));
  assert.ok(!reminderDue(at, 18, localDay(at))); // already fired today
  assert.ok(!reminderDue(at, 19, null));
  assert.ok(!reminderDue(at, null, null)); // off
});

test("test pages (the lock is kept only on these)", () => {
  assert.equal(isTestPage(`${SITE}/test/0b8c3f5e-1d2a-4c7b-9e6f-123456789abc`, SITE), true);
  assert.equal(isTestPage(`${SITE}/test/0b8c3f5e-1d2a-4c7b-9e6f-123456789abc/results`, SITE), false);
  assert.equal(isTestPage(`${SITE}/dashboard`, SITE), false);
  assert.equal(isTestPage("https://evil.example/test/0b8c3f5e-1d2a-4c7b-9e6f-123456789abc", SITE), false);
  assert.equal(isTestPage("data:text/html,hi", SITE), false);
});
