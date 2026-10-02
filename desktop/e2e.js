// End-to-end check of test lockdown against a running site (not shipped in the installer).
//   OPENPREP_URL=http://localhost:3000 npx electron e2e.js     (the app's window must already be signed in)
// Starts a real course quiz, then checks: locked for the whole test, can't close/quit, focus is taken back,
// the test can't be continued in a plain browser, the resume address is saved, and "End test" unlocks.
// STAGE=offline cuts the network mid-test. STAGE=escape also checks outside page switches are ignored while locked.
// STAGE=report checks "Report question" (the dialog opens, Cancel sends nothing, Send works).
// STAGE=kill stops right after the test locks (like killing the app); STAGE=resume then checks the app reopens into it.
const STAGE = process.env.STAGE;
process.env.OPENPREP_URL ||= "http://localhost:3000";
const SITE = process.env.OPENPREP_URL;
const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow, screen } = require("electron");
// STAGE=screens pretends a second monitor exists, to check it gets covered during the test.
if (process.env.STAGE === "screens") {
  app.whenReady().then(() => {
    const real = screen.getAllDisplays.bind(screen);
    const primary = real()[0];
    const fake = { ...primary, id: 999, bounds: { x: primary.bounds.width, y: 0, width: 1280, height: 720 } };
    screen.getAllDisplays = () => [...real(), fake];
    const matching = screen.getDisplayMatching.bind(screen);
    screen.getDisplayMatching = (rect) => (rect.x >= primary.bounds.width ? fake : matching(rect));
  });
}

let win = null;
app.on("browser-window-created", (_e, w) => { win ??= w; });
require("./main.js");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const js = (code) => win.webContents.executeJavaScript(code);
async function until(what, fn, ms = 45_000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try { const v = await fn(); if (v) return v; } catch { /* page still loading */ }
    await wait(300);
  }
  throw new Error(`timed out waiting for: ${what}`);
}
const state = () => JSON.parse(fs.readFileSync(path.join(app.getPath("userData"), "state.json"), "utf8"));
const click = (text) => js(`(() => { const b = [...document.querySelectorAll("button")].filter((x) => x.textContent.trim() === ${JSON.stringify(text)}).pop(); if (!b) return false; b.click(); return true; })()`);

// STAGE=diag: the diagnostic is locked the same way, and "End test" is its only way out.
async function diagnostic(r) {
  await win.loadURL(`${SITE}/onboarding`);
  await until("Start the diagnostic", () => click("Start the diagnostic"));
  const url = await until("diagnostic page", () => /\/test\/[0-9a-f-]{36}$/.test(win.webContents.getURL()) && win.webContents.getURL());
  await until("first question", () => js(`document.body.innerText.includes("How sure are you?")`));
  await wait(1000);
  r.diagLocked = win.isKiosk() && win.isAlwaysOnTop() && state().lockedUrl === url;
  win.close(); app.quit();
  await wait(500);
  r.diagCloseRefused = !win.isDestroyed() && win.isVisible();
  const cookies = (await win.webContents.session.cookies.get({ url: SITE })).filter((c) => c.name !== "openprep_app").map((c) => `${c.name}=${c.value}`).join("; ");
  r.diagBrowserBlocked = (await fetch(url, { headers: { cookie: cookies, "user-agent": "Mozilla/5.0 Chrome/140 OpenPrepApp/desktop" } }).then((x) => x.text())).includes("This test is in lockdown mode");
  await click("I don't know"); // one answer, kept after ending
  await wait(2000);
  await click("End test");
  await until("confirm dialog", () => js(`document.body.innerText.includes("End this test?")`));
  await click("End test");
  await until("dashboard", () => /\/dashboard$/.test(win.webContents.getURL()));
  await wait(2500);
  r.diagUnlockedAfterEnd = !win.isKiosk() && state().lockedUrl == null;
  console.log("E2E", JSON.stringify(r));
  app.exit(0);
}

// STAGE=report: "Report question" works in the app (it used window.prompt, which Electron doesn't have).
async function report(r) {
  await win.loadURL(`${SITE}/practice`);
  const open = `(() => { const b = document.querySelector('button[aria-label="Report question"]'); b?.click(); return !!b; })()`;
  await until("report button", () => js(open));
  r.dialogOpens = await until("report dialog", () => js(`document.body.innerText.includes("Report this question")`));
  await click("Cancel");
  await until("dialog closed", () => js(`!!document.querySelector('[role=dialog][data-closed]') || !document.querySelector('[role=dialog]')`));
  await wait(1000);
  r.cancelSendsNothing = !(await js(`document.body.innerText.includes("Thanks, we'll take a look.")`));
  await js(open);
  await until("report dialog again", () => js(`!!document.querySelector('[role=dialog]:not([data-closed]) textarea')`));
  await js(`(() => { const t = document.querySelector('[role=dialog]:not([data-closed]) textarea');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(t, "e2e: please ignore"); t.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  await click("Send report");
  r.sent = await until("thanks toast", () => js(`document.body.innerText.includes("Thanks, we'll take a look.")`), 15_000);
  console.log("E2E", JSON.stringify(r));
  app.exit(0);
}

app.whenReady().then(async () => {
  const r = {};
  try {
    await until("window", () => win);
    if (STAGE === "diag") return await diagnostic(r);
    if (STAGE === "report") return await report(r);
    if (STAGE !== "resume") {
      await win.loadURL(`${SITE}/course/m-alg`);
      await until("Start quiz button", () => click("Start quiz"));
    }
    const testUrl = await until("test page", () => { const u = new URL(win.webContents.getURL()); return /^\/test\/[0-9a-f-]{36}$/.test(u.pathname) && u.origin + u.pathname; });
    await until("End test button on the intro", () => js(`[...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "End test")`));
    await wait(1000);
    r.lockedOnIntro = win.isKiosk() && win.isAlwaysOnTop();
    if (STAGE === "screens") {
      const others = BrowserWindow.getAllWindows().filter((w) => w !== win);
      r.secondScreenCovered = others.length === 1 && others[0].getBounds().x >= 1000 && others[0].isAlwaysOnTop() && !others[0].isFocused();
      r.testKeptFocus = win.isFocused();
    }
    r.resumeSaved = state().lockedUrl === testUrl;
    if (STAGE === "kill") { console.log("E2E", JSON.stringify(r)); app.exit(0); return; }
    if (STAGE === "escape") {
      // A sign-in link opened from outside (Win+R, another app) must not pull the window off the test.
      app.emit("second-instance", {}, [process.execPath, "openprep://auth?code=abcdefgh12345"]);
      await wait(3000);
      r.deepLinkIgnored = win.webContents.getURL().startsWith(testUrl) && win.isKiosk();
    }
    if (STAGE === "resume") {
      r.reopenedIntoTest = true;
      await wait(1500);
      r.resumeRecordedAndCleaned = !(await js("location.search")).includes("resumed");
    }
    if (STAGE === "freeze") {
      // A stuck script freezes the page mid-test: the app restarts the renderer and the test comes back, locked.
      const t0 = Date.now();
      void win.webContents.executeJavaScript("setTimeout(() => { for (;;) {} }, 0)").catch(() => {});
      await wait(3000);
      // Chromium notices a hang when the page stops handling input, so keep "clicking" like a student would.
      const poke = setInterval(() => { try { win.webContents.sendInputEvent({ type: "mouseMove", x: 200, y: 200 }); } catch { /* reloading */ } }, 1500);
      await until("test back after freeze", async () => {
        try { return await Promise.race([js(`[...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "End test")`), wait(1500).then(() => false)]); } catch { return false; }
      }, 90_000);
      clearInterval(poke);
      r.recoveredFromFreeze = win.isKiosk();
      r.freezeRecoverySeconds = Math.round((Date.now() - t0) / 1000);
    }
    if (STAGE === "crash") {
      // The page's renderer dies mid-test: the app reloads it and the test is locked again.
      win.webContents.forcefullyCrashRenderer();
      await wait(1000);
      await until("test reloaded", () => js(`[...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "End test")`), 30_000);
      await wait(1500);
      r.recoveredFromCrash = win.webContents.getURL().startsWith(testUrl) && win.isKiosk();
    }
    if (STAGE === "offline") {
      // Wi-Fi off mid-test: the lock must hold, and the app must get back to the test on its own once it's back.
      let offline = true; // every request to the site fails, like a dropped connection
      win.webContents.session.webRequest.onBeforeRequest({ urls: [`${SITE}/*`] }, (_d, cb) => cb({ cancel: offline }));
      win.webContents.reload();
      await until("offline page", () => win.webContents.getURL().startsWith("data:"), 20_000);
      await wait(1500);
      r.offlineStillLocked = win.isKiosk() && win.isAlwaysOnTop();
      offline = false;
      await until("back on the test", () => win.webContents.getURL().startsWith(testUrl), 30_000);
      await wait(2000);
      r.backOnTestAndLocked = win.isKiosk();
    }

    win.close(); app.quit();
    await wait(500);
    r.closeAndQuitRefused = !win.isDestroyed() && win.isVisible();

    const other = new BrowserWindow({ width: 300, height: 200, show: true });
    other.focus();
    await wait(800);
    r.focusTakenBack = win.isFocused();
    other.destroy();

    // The same signed-in session from a plain browser must not get the test.
    // A browser with the student's sign-in cookies, but not this install's lockdown secret.
    const all = await win.webContents.session.cookies.get({ url: SITE });
    const jar = (withSecret) => all.filter((c) => withSecret || c.name !== "openprep_app").map((c) => `${c.name}=${c.value}`).join("; ");
    const page = (ua, withSecret) => fetch(testUrl, { headers: { cookie: jar(withSecret), "user-agent": ua } }).then((x) => x.text());
    const blocked = (t) => t.includes("This test is in lockdown mode");
    r.installSecretSet = all.some((c) => c.name === "openprep_app" && c.httpOnly);
    r.browserBlocked = blocked(await page("Mozilla/5.0 Chrome/140", false));
    r.fakedAppUaBlocked = blocked(await page("Mozilla/5.0 Chrome/140 OpenPrepApp/desktop", false)); // the old bypass
    r.appAllowed = !blocked(await page("Mozilla/5.0 Chrome/140 OpenPrepApp/desktop", true));

    // Start the module: still locked while answering.
    await click("Start");
    await until("first question", () => js(`document.body.innerText.includes("Flag for review")`));
    r.lockedWhileAnswering = win.isKiosk();

    // End the test: the only way out.
    await click("End test");
    await until("confirm dialog", () => js(`document.body.innerText.includes("End this test?")`));
    await click("End test");
    await until("back on the tests page", () => /\/tests$/.test(win.webContents.getURL()));
    await wait(2500);
    r.unlockedAfterEnd = !win.isKiosk() && !win.isAlwaysOnTop() && state().lockedUrl == null;
    if (STAGE === "screens") r.coversRemoved = BrowserWindow.getAllWindows().filter((w) => w !== win && !w.isDestroyed()).length === 0;
  } catch (e) {
    r.error = String(e);
    try { r.screen = (await js("document.body.innerText")).replace(/\s+/g, " ").slice(0, 300); } catch { /* window gone */ }
  }
  console.log("E2E", JSON.stringify(r));
  app.exit(0);
});
