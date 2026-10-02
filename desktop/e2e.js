// End-to-end check of test lockdown against a running site (not shipped in the installer).
//   OPENPREP_URL=http://localhost:3000 npx electron e2e.js     (the app's window must already be signed in)
// Starts a real course quiz, then checks: locked for the whole test, can't close/quit, focus is taken back,
// the test can't be continued in a plain browser, the resume address is saved, and "End test" unlocks.
// STAGE=kill stops right after the test locks (like killing the app); STAGE=resume then checks the app reopens into it.
const STAGE = process.env.STAGE;
process.env.OPENPREP_URL ||= "http://localhost:3000";
const SITE = process.env.OPENPREP_URL;
const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow } = require("electron");

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

app.whenReady().then(async () => {
  const r = {};
  try {
    await until("window", () => win);
    if (STAGE !== "resume") {
      await win.loadURL(`${SITE}/course/m-alg`);
      await until("Start quiz button", () => click("Start quiz"));
    }
    const testUrl = await until("test page", () => /\/test\/[0-9a-f-]{36}$/.test(win.webContents.getURL()) && win.webContents.getURL());
    await until("End test button on the intro", () => js(`[...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "End test")`));
    await wait(1000);
    r.lockedOnIntro = win.isKiosk() && win.isAlwaysOnTop();
    r.resumeSaved = state().lockedUrl === testUrl;
    if (STAGE === "kill") { console.log("E2E", JSON.stringify(r)); app.exit(0); return; }
    if (STAGE === "resume") r.reopenedIntoTest = true;

    win.close(); app.quit();
    await wait(500);
    r.closeAndQuitRefused = !win.isDestroyed() && win.isVisible();

    const other = new BrowserWindow({ width: 300, height: 200, show: true });
    other.focus();
    await wait(800);
    r.focusTakenBack = win.isFocused();
    other.destroy();

    // The same signed-in session from a plain browser must not get the test.
    const cookies = (await win.webContents.session.cookies.get({ url: SITE })).map((c) => `${c.name}=${c.value}`).join("; ");
    const page = (ua) => fetch(testUrl, { headers: { cookie: cookies, "user-agent": ua } }).then((x) => x.text());
    r.browserBlocked = (await page("Mozilla/5.0 Chrome/140")).includes("This test is in lockdown mode");
    r.appAllowed = !(await page("Mozilla/5.0 Chrome/140 OpenPrepApp/desktop")).includes("This test is in lockdown mode");

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
  } catch (e) {
    r.error = String(e);
  }
  console.log("E2E", JSON.stringify(r));
  app.exit(0);
});
