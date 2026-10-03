// OpenPrep desktop: the live website in a locked-down window, plus test lockdown (kiosk) and local daily reminders.
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { app, BrowserWindow, Menu, Notification, Tray, dialog, ipcMain, nativeImage, screen, session, shell } = require("electron");
const { authLinkPath, isAppUrl, isTestPage, isExternalWebUrl, localDay, reminderDue } = require("./lib");

// The installed app always loads the real site; OPENPREP_URL only works when running from source (development).
const SITE = (!app.isPackaged && process.env.OPENPREP_URL) || "https://openprep-opal.vercel.app";

// Refuse debugging switches in the installed app: they would attach DevTools (and walk around test lockdown) even
// though DevTools are off. Node mode and NODE_OPTIONS are switched off in the binary itself (fuses in package.json).
const DEBUG_SWITCHES = ["remote-debugging-port", "remote-debugging-pipe", "remote-debugging-address", "remote-allow-origins", "inspect", "inspect-brk", "inspect-port", "js-flags"];
if (app.isPackaged && (DEBUG_SWITCHES.some((s) => app.commandLine.hasSwitch(s)) || process.argv.some((a) => /^--(inspect|remote-debugging|js-flags)/.test(a)))) {
  app.exit(1);
}
const ICON = path.join(__dirname, "icon.png");
const STATE_FILE = () => path.join(app.getPath("userData"), "state.json");

let win = null;
let tray = null;
let locked = null; // null | "test" (strict: only finishing or ending the test unlocks) | "focus" (student can leave)
let releaseTimer = null;
let shuttingDown = false;
let quitting = false;

/* ───────── small persisted state (reminder hour, last reminder day) ───────── */
function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE(), "utf8")); } catch { return { hour: null, lastFired: null }; }
}
function writeState(s) {
  try { fs.writeFileSync(STATE_FILE(), JSON.stringify(s)); } catch { /* non-fatal */ }
}

/** Switch page from outside the page (deep link, tray, notification). Never during a locked test: leaving the test
 * page would release the lock, so these would be ways out of it. */
function openPage(url) {
  if (!win || locked === "test") return;
  void win.loadURL(url);
}

/* ───────── deep links: openprep://auth?… finishes an email or Google sign-in started in this app ───────── */
function handleDeepLink(url) {
  const to = authLinkPath(url);
  if (!to || !win) return;
  openPage(`${SITE}${to}`);
  showWindow();
}

if (!app.requestSingleInstanceLock()) app.quit();
app.on("second-instance", (_e, argv) => {
  const link = argv.find((a) => a.startsWith("openprep://"));
  if (link) handleDeepLink(link);
  else showWindow();
});
app.on("open-url", (e, url) => { e.preventDefault(); handleDeepLink(url); }); // macOS
if (process.defaultApp) app.setAsDefaultProtocolClient("openprep", process.execPath, [path.resolve(process.argv[1] ?? ".")]);
else app.setAsDefaultProtocolClient("openprep");

/* ───────── lockdown (tests and focus sessions) ───────── */
// Releases are delayed a moment: between test modules the page remounts (unlock then lock), which must not flicker out.
function setLockdown(kind) {
  if (!win) return;
  clearTimeout(releaseTimer);
  if (kind) applyLockdown(kind);
  else releaseTimer = setTimeout(() => applyLockdown(null), 1500);
}
function applyLockdown(kind) {
  if (!win || locked === kind) return;
  const on = !!kind;
  locked = kind;
  win.setKiosk(on);
  win.setAlwaysOnTop(on, "screen-saver");
  win.setMinimizable(!on);
  // If the app is killed mid-test, it reopens straight into the test, locked again.
  const here = (() => { try { const u = new URL(win.webContents.getURL()); return u.origin + u.pathname; } catch { return null; } })();
  writeState({ ...readState(), lockedUrl: kind === "test" ? here : null });
  if (on) {
    win.webContents.navigationHistory.clear(); // nothing to go "back" to
    win.show(); win.focus();
  }
  coverOtherScreens(kind === "test");
}

/* During a locked test every other monitor is blacked out, so nothing can be read off a second screen. */
let covers = [];
function coverOtherScreens(on) {
  covers.forEach((c) => { if (!c.isDestroyed()) c.destroy(); });
  covers = [];
  if (!on || !win) return;
  const testScreen = screen.getDisplayMatching(win.getBounds()).id;
  for (const d of screen.getAllDisplays()) {
    if (d.id === testScreen) continue;
    const cover = new BrowserWindow({
      ...d.bounds, frame: false, show: false, focusable: false, skipTaskbar: true, resizable: false, movable: false,
      backgroundColor: "#000000", webPreferences: { sandbox: true, contextIsolation: true, devTools: false },
    });
    cover.setAlwaysOnTop(true, "screen-saver");
    cover.setContentProtection(true);
    cover.setBounds(d.bounds);
    // Safety: a cover must never land on the test's own screen (it would black out the test).
    if (screen.getDisplayMatching(cover.getBounds()).id === testScreen) { cover.destroy(); continue; }
    cover.showInactive(); // never takes focus from the test
    covers.push(cover);
  }
}
const recover = () => { if (locked === "test") coverOtherScreens(true); }; // a monitor plugged in or changed mid-test

/* ───────── reminders: checked every minute while the app (or its tray icon) is running ───────── */
function checkReminder() {
  const s = readState();
  const now = new Date();
  if (!reminderDue(now, s.hour, s.lastFired)) return;
  writeState({ ...s, lastFired: localDay(now) });
  if (!Notification.isSupported()) return;
  const n = new Notification({ title: "Time for SAT practice", body: "Your plan for today is ready. Keep your streak going!", icon: ICON });
  n.on("click", () => { showWindow(); openPage(`${SITE}/plan`); });
  n.show();
}

function setReminder(hour) {
  writeState({ ...readState(), hour });
  // Reminders only work while OpenPrep runs, so start it quietly at sign-in when they're on.
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: hour != null, args: ["--hidden"] });
}

/* ───────── window ───────── */
function showWindow() {
  if (!win) return createWindow();
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

// "Try again" goes back to where the student was (a locked test, if one was running). During a locked test it also
// retries by itself every few seconds, and the lock stays on (switching Wi-Fi off is not a way out of a test).
const OFFLINE = (back, inTest) => `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html><meta charset="utf-8"><title>OpenPrep</title>
${inTest ? `<script>setTimeout(() => { location.href = ${JSON.stringify(back)}; }, 5000)</script>` : ""}
<body style="font-family:system-ui;background:#fff;color:#0a0a0a;display:grid;place-items:center;height:100vh;margin:0">
<div style="text-align:center"><h1 style="font-weight:600">You're offline</h1><p style="color:#737373">${inTest ? "Your test is still running and stays locked. Reconnecting…" : "OpenPrep needs the internet to load your practice."}</p>
<button onclick="location.href='${back}'" style="height:44px;padding:0 20px;border-radius:12px;border:0;background:#0a0a0a;color:#fff;font-weight:600;cursor:pointer">Try again</button></div>`)}`;

function createWindow() {
  // Reopen where the student left it: same size and place (if that spot is still on a screen), maximized if it was.
  const saved = readState().bounds;
  const onScreen = saved && screen.getAllDisplays().some(({ workArea: a }) =>
    saved.x >= a.x - 50 && saved.y >= a.y - 50 && saved.x + 200 <= a.x + a.width && saved.y + 100 <= a.y + a.height);
  win = new BrowserWindow({
    // Shown once the first page has painted (no blank flash); white to match the site's default light theme.
    width: 1280, height: 860, minWidth: 360, minHeight: 600, show: false,
    title: "OpenPrep", icon: ICON, backgroundColor: "#ffffff", autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false, devTools: false },
  });
  if (!process.argv.includes("--hidden")) win.once("ready-to-show", () => win?.show());
  // Questions can't be screenshotted or screen recorded from the app (the window shows up black in captures).
  win.setContentProtection(true);
  win.webContents.setUserAgent(`${win.webContents.getUserAgent()} OpenPrepApp/desktop`);

  // Our site stays in the app; any other web link opens in the normal browser; nothing else is allowed.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalWebUrl(url) && !locked) void shell.openExternal(url);
    return { action: "deny" };
  });
  // Server-side redirects get the same check as links: other sites open in the normal browser, never in this window.
  win.webContents.on("will-redirect", (e, url) => {
    if (isAppUrl(url, SITE)) return;
    e.preventDefault();
    if (isExternalWebUrl(url) && !locked) void shell.openExternal(url);
  });
  // No embedded <webview>s, ever (they could load anything with their own settings).
  win.webContents.on("will-attach-webview", (e) => e.preventDefault());
  win.webContents.on("will-navigate", (e, url) => {
    if (isAppUrl(url, SITE)) return; // the offline page is loaded by the app itself, not navigated to by the page
    e.preventDefault();
    if (isExternalWebUrl(url) && !locked) void shell.openExternal(url);
  });
  win.webContents.on("did-fail-load", (_e, code, _desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3 || !isAppUrl(url, SITE)) return; // -3 = aborted (normal on redirects)
    const back = readState().lockedUrl;
    void win.loadURL(OFFLINE(back && isAppUrl(back, SITE) ? back : `${SITE}/dashboard`, locked === "test"));
  });
  // The page's renderer crashed (out of memory, a GPU hiccup): reload it; the test page re-locks itself when it loads.
  // If it keeps crashing, stop looping: release the lock and show the offline page with a way home.
  let crashes = [];
  win.webContents.on("render-process-gone", (_e, details) => {
    if (details.reason === "clean-exit") return;
    crashes = [...crashes.filter((t) => Date.now() - t < 60_000), Date.now()];
    if (crashes.length <= 3) { win.webContents.reload(); return; }
    applyLockdown(null);
    void win.loadURL(OFFLINE(`${SITE}/dashboard`, false));
  });
  // A frozen page (a stuck script) would leave a locked window with no way out: after 10 seconds of not responding,
  // restart the renderer, which the crash handling above reloads.
  let frozen = null;
  win.on("unresponsive", () => { frozen ??= setTimeout(() => { frozen = null; win?.webContents.forcefullyCrashRenderer(); }, 10_000); });
  win.on("responsive", () => { clearTimeout(frozen); frozen = null; });
  // A full page load away from a running test (a crash, a sign out) releases the lock; the test page locks again when
  // it loads. The offline page keeps it: it retries the test by itself, and Ctrl+Alt+Del or shutting down still work.
  win.webContents.on("did-navigate", (_e, url) => {
    if (locked !== "test" || isTestPage(url, SITE) || url.startsWith("data:")) return;
    applyLockdown(null);
  });

  // Never: view source, save page, print. During lockdown also: reload, back/forward, zoom tricks, closing by shortcut.
  win.webContents.on("before-input-event", (e, input) => {
    if (input.type !== "keyDown") return;
    const k = input.key.toLowerCase();
    const mod = input.control || input.meta;
    if (mod && ["u", "s", "p"].includes(k)) return e.preventDefault();
    if (!locked) return;
    const combo = mod && ["r", "w", "q", "n", "t", "-", "0", "[", "]"].includes(k);
    const nav = input.alt && ["arrowleft", "arrowright", "home", "f4"].includes(k);
    if (combo || nav || ["f5", "f11", "browserback", "browserforward", "browserhome"].includes(k)) e.preventDefault();
  });
  // Mouse back/forward buttons (Windows app commands).
  win.on("app-command", (e) => { if (locked) e.preventDefault(); });
  // Test lockdown: anything that takes focus away (Alt+Tab, the Start menu, a notification) is pushed straight back.
  // The page also counts each time it happens, on the results.
  win.on("blur", () => {
    if (locked !== "test") return;
    setTimeout(() => { if (win && locked === "test") { win.show(); win.moveTop(); win.focus(); } }, 50);
  });

  win.on("close", (e) => {
    if (quitting) return;
    if (locked === "test") return e.preventDefault(); // only finishing or ending the test unlocks
    if (locked) { // a focus session (a locked test returned above)
      e.preventDefault();
      const r = dialog.showMessageBoxSync(win, {
        type: "warning", buttons: ["Keep studying", "End focus and close"], defaultId: 0, cancelId: 0,
        message: "You're in a focus session.", detail: "Closing OpenPrep ends it.",
      });
      if (r === 1) { applyLockdown(null); win.close(); }
      return;
    }
    // Keep running in the tray while reminders are on, so they can fire.
    if (readState().hour != null) { e.preventDefault(); win.hide(); }
  });
  // Restored with the same measure it was saved in (constructor sizes drift a few pixels per launch on Windows).
  if (onScreen) win.setBounds({ x: saved.x, y: saved.y, width: saved.width, height: saved.height });
  if (saved?.maximized) win.maximize();
  // Remember size and place (never while locked: kiosk mode is full screen on purpose).
  let saveTimer = null;
  const restoredAt = Date.now(); // our own restore fires resize/move: don't save those (rounding would creep)
  const remember = () => {
    if (Date.now() - restoredAt < 2000) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (!win || win.isDestroyed() || locked || win.isMinimized()) return;
      writeState({ ...readState(), bounds: { ...win.getNormalBounds(), maximized: win.isMaximized() } });
    }, 500);
  };
  ["resize", "move", "maximize", "unmaximize"].forEach((ev) => win.on(ev, remember));
  win.on("closed", () => { win = null; });

  // `OPENPREP_SMOKE=1 npm start`: print what loaded, then exit (CI / quick check).
  if (process.env.OPENPREP_SMOKE) win.webContents.once("did-finish-load", async () => {
    const info = await win.webContents.executeJavaScript("({ url: location.href, title: document.title, bridge: typeof window.openprepDesktop })");
    await win.webContents.executeJavaScript("window.openprepDesktop.setLockdown(true)");
    await new Promise((r) => setTimeout(r, 1500));
    const lockedDown = win.isKiosk() && win.isAlwaysOnTop();
    // Strict lock: closing and quitting are both refused.
    win.close(); app.quit();
    await new Promise((r) => setTimeout(r, 500));
    const survivedClose = !!win && !win.isDestroyed() && win.isVisible();
    const resumeSaved = readState().lockedUrl === win.webContents.getURL();
    win.webContents.openDevTools();
    const devtoolsBlocked = !win.webContents.isDevToolsOpened();
    await win.webContents.executeJavaScript("window.openprepDesktop.setLockdown(false)");
    await new Promise((r) => setTimeout(r, 2000)); // release is delayed 1.5s
    console.log("SMOKE", JSON.stringify({ ...info, ua: win.webContents.getUserAgent().includes("OpenPrepApp"), lockedDown, survivedClose,
      resumeSaved, devtoolsBlocked, released: !win.isKiosk() && readState().lockedUrl == null }));
    quitting = true; app.quit();
  });
  // Back into a locked test if the app was killed during one (the page re-locks, or moves on if it already ended).
  const resume = readState().lockedUrl;
  // "?resumed=1": the test page counts the app having been closed mid-test as leaving the test window.
  void win.loadURL(resume && isAppUrl(resume, SITE) ? `${resume}?resumed=1` : `${SITE}/dashboard`);
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(ICON).resize({ width: 16, height: 16 }));
  tray.setToolTip("OpenPrep");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open OpenPrep", click: () => showWindow() },
    { label: "Today's plan", click: () => { showWindow(); openPage(`${SITE}/plan`); } },
    { type: "separator" },
    { label: "Quit", click: () => { if (locked !== "test") { quitting = true; app.quit(); } } },
  ]));
  tray.on("click", () => showWindow());
}

/* ───────── IPC: only from our own site's top frame ───────── */
const fromSite = (e) => !!e.senderFrame && e.senderFrame === e.sender.mainFrame && isAppUrl(e.senderFrame.url, SITE);
ipcMain.on("lockdown", (e, on, kind) => { if (fromSite(e)) setLockdown(on === true ? (kind === "focus" ? "focus" : "test") : null); });
ipcMain.on("reminder", (e, hour) => { if (fromSite(e)) setReminder(Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null); });

/**
 * This install's lockdown secret: an HttpOnly cookie in Electron's own cookie store (encrypted by Windows; the fuse
 * enables cookie encryption). A test locked here can only be carried on with it (see the site's server/lockdown.ts),
 * so a browser faking the app's user agent gets nothing. Never written anywhere else.
 */
async function ensureInstallCookie() {
  const ses = session.defaultSession;
  const [have] = await ses.cookies.get({ url: SITE, name: "openprep_app" });
  if (have?.httpOnly && have.sameSite === "lax") return;
  // Lax, not strict: the offline page's "reconnect" counts as coming from another site, and strict cookies aren't
  // sent then (the app would look like a browser). Re-set an existing one so older installs get fixed too.
  await ses.cookies.set({
    url: SITE, name: "openprep_app", value: have?.value || crypto.randomBytes(24).toString("base64url"), path: "/",
    httpOnly: true, secure: SITE.startsWith("https:"), sameSite: "lax", expirationDate: Math.floor(Date.now() / 1000) + 10 * 365 * 86400,
  });
  await ses.cookies.flushStore();
}

app.whenReady().then(async () => {
  ["display-added", "display-removed", "display-metrics-changed"].forEach((ev) => screen.on(ev, recover));
  Menu.setApplicationMenu(null);
  app.setAppUserModelId("com.openprep.desktop"); // Windows notifications need it
  // The site needs no camera, mic, location, etc.
  const allowed = (permission) => permission === "fullscreen" || permission === "clipboard-sanitized-write";
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => cb(allowed(permission)));
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => allowed(permission));
  // No USB, serial or HID devices.
  session.defaultSession.setDevicePermissionHandler(() => false);
  session.defaultSession.on("select-hid-device", (e, _d, cb) => { e.preventDefault(); cb(""); });
  session.defaultSession.on("select-serial-port", (e, _p, _wc, cb) => { e.preventDefault(); cb(""); });
  session.defaultSession.on("select-usb-device", (e, _d, cb) => { e.preventDefault(); cb(""); });
  await ensureInstallCookie().catch(() => {}); // without it a locked test still works, just bound by user agent
  createWindow();
  createTray();
  setInterval(checkReminder, 60_000);
  checkReminder();
  const link = process.argv.find((a) => a.startsWith("openprep://"));
  if (link) handleDeepLink(link);
});

app.on("before-quit", (e) => {
  if (locked === "test" && !shuttingDown) return e.preventDefault(); // no quitting out of a test
  quitting = true;
});
// Windows is shutting down or signing out: never block that (the test resumes, locked, next time).
app.on("session-end", () => { shuttingDown = true; quitting = true; });
app.on("window-all-closed", () => { if (readState().hour == null) app.quit(); });
