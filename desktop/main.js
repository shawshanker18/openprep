// OpenPrep desktop: the live website in a locked-down window, plus test lockdown (kiosk) and local daily reminders.
const path = require("node:path");
const fs = require("node:fs");
const { app, BrowserWindow, Menu, Notification, Tray, dialog, ipcMain, nativeImage, session, shell } = require("electron");
const { parseAuthLink, isAppUrl, isExternalWebUrl, localDay, reminderDue } = require("./lib");

const SITE = process.env.OPENPREP_URL || "https://openprep-opal.vercel.app";
const ICON = path.join(__dirname, "icon.png");
const STATE_FILE = () => path.join(app.getPath("userData"), "state.json");

let win = null;
let tray = null;
let locked = false;
let quitting = false;

/* ───────── small persisted state (reminder hour, last reminder day) ───────── */
function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE(), "utf8")); } catch { return { hour: null, lastFired: null }; }
}
function writeState(s) {
  try { fs.writeFileSync(STATE_FILE(), JSON.stringify(s)); } catch { /* non-fatal */ }
}

/* ───────── deep links: openprep://auth?code=… finishes an email sign-in started in this app ───────── */
function handleDeepLink(url) {
  const code = parseAuthLink(url);
  if (!code || !win) return;
  win.loadURL(`${SITE}/auth/callback?code=${encodeURIComponent(code)}`);
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
function setLockdown(on) {
  if (!win || locked === on) return;
  locked = on;
  win.setKiosk(on);
  win.setAlwaysOnTop(on, "screen-saver");
  win.setMinimizable(!on);
  if (on) win.focus();
}

/* ───────── reminders: checked every minute while the app (or its tray icon) is running ───────── */
function checkReminder() {
  const s = readState();
  const now = new Date();
  if (!reminderDue(now, s.hour, s.lastFired)) return;
  writeState({ ...s, lastFired: localDay(now) });
  if (!Notification.isSupported()) return;
  const n = new Notification({ title: "Time for SAT practice", body: "Your plan for today is ready — keep your streak going.", icon: ICON });
  n.on("click", () => { showWindow(); win?.loadURL(`${SITE}/plan`); });
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

const OFFLINE = `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html><meta charset="utf-8"><title>OpenPrep</title>
<body style="font-family:system-ui;background:#0a0a0a;color:#fafafa;display:grid;place-items:center;height:100vh;margin:0">
<div style="text-align:center"><h1 style="font-weight:600">You're offline</h1><p style="color:#a3a3a3">OpenPrep needs the internet to load your practice.</p>
<button onclick="location.href='${SITE}/dashboard'" style="height:44px;padding:0 20px;border-radius:12px;border:0;background:#fafafa;color:#0a0a0a;font-weight:600;cursor:pointer">Try again</button></div>`)}`;

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 860, minWidth: 360, minHeight: 600, show: !process.argv.includes("--hidden"),
    title: "OpenPrep", icon: ICON, backgroundColor: "#0a0a0a", autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false },
  });
  win.webContents.setUserAgent(`${win.webContents.getUserAgent()} OpenPrepApp/desktop`);

  // Our site stays in the app; any other web link opens in the normal browser; nothing else is allowed.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalWebUrl(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    if (isAppUrl(url, SITE) || url.startsWith("data:text/html")) return;
    e.preventDefault();
    if (isExternalWebUrl(url)) void shell.openExternal(url);
  });
  win.webContents.on("did-fail-load", (_e, code, _desc, url, isMainFrame) => {
    if (isMainFrame && code !== -3 && isAppUrl(url, SITE)) void win.loadURL(OFFLINE); // -3 = aborted (normal on redirects)
  });

  // During lockdown: no reload, devtools, zoom-out tricks, or closing the window by shortcut.
  win.webContents.on("before-input-event", (e, input) => {
    if (!locked || input.type !== "keyDown") return;
    const k = input.key.toLowerCase();
    const combo = (input.control || input.meta) && ["r", "w", "q", "n", "t", "p", "-", "0"].includes(k);
    if (combo || k === "f5" || k === "f11" || k === "f12" || (input.alt && k === "f4") || (input.control && input.shift && k === "i")) e.preventDefault();
  });

  win.on("close", (e) => {
    if (quitting) return;
    if (locked) {
      e.preventDefault();
      const r = dialog.showMessageBoxSync(win, {
        type: "warning", buttons: ["Stay in the test", "Leave anyway"], defaultId: 0, cancelId: 0,
        message: "You're in a locked test or focus session.", detail: "Leaving now counts as leaving the test window.",
      });
      if (r === 1) { setLockdown(false); win.close(); }
      return;
    }
    // Keep running in the tray while reminders are on, so they can fire.
    if (readState().hour != null) { e.preventDefault(); win.hide(); }
  });
  win.on("closed", () => { win = null; });

  // `OPENPREP_SMOKE=1 npm start`: print what loaded, then exit (CI / quick check).
  if (process.env.OPENPREP_SMOKE) win.webContents.once("did-finish-load", async () => {
    const info = await win.webContents.executeJavaScript("({ url: location.href, title: document.title, bridge: typeof window.openprepDesktop })");
    await win.webContents.executeJavaScript("window.openprepDesktop.setLockdown(true)");
    await new Promise((r) => setTimeout(r, 1500));
    const lockedDown = win.isKiosk() && win.isAlwaysOnTop();
    await win.webContents.executeJavaScript("window.openprepDesktop.setLockdown(false)");
    await new Promise((r) => setTimeout(r, 1000));
    console.log("SMOKE", JSON.stringify({ ...info, ua: win.webContents.getUserAgent().includes("OpenPrepApp"), lockedDown, released: !win.isKiosk() }));
    quitting = true; app.quit();
  });
  void win.loadURL(`${SITE}/dashboard`);
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(ICON).resize({ width: 16, height: 16 }));
  tray.setToolTip("OpenPrep");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open OpenPrep", click: () => showWindow() },
    { label: "Today's plan", click: () => { showWindow(); win?.loadURL(`${SITE}/plan`); } },
    { type: "separator" },
    { label: "Quit", click: () => { quitting = true; app.quit(); } },
  ]));
  tray.on("click", () => showWindow());
}

/* ───────── IPC: only from our own site's top frame ───────── */
const fromSite = (e) => !!e.senderFrame && e.senderFrame === e.sender.mainFrame && isAppUrl(e.senderFrame.url, SITE);
ipcMain.on("lockdown", (e, on) => { if (fromSite(e)) setLockdown(on === true); });
ipcMain.on("reminder", (e, hour) => { if (fromSite(e)) setReminder(Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null); });

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  app.setAppUserModelId("com.openprep.desktop"); // Windows notifications need it
  // The site needs no camera, mic, location, etc.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => cb(permission === "fullscreen" || permission === "clipboard-sanitized-write"));
  createWindow();
  createTray();
  setInterval(checkReminder, 60_000);
  checkReminder();
  const link = process.argv.find((a) => a.startsWith("openprep://"));
  if (link) handleDeepLink(link);
});

app.on("before-quit", () => { quitting = true; });
app.on("window-all-closed", () => { if (readState().hour == null) app.quit(); });
