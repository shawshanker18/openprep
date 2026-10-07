// OpenPrep desktop: the live website and local daily reminders.
const path = require("node:path");
const fs = require("node:fs");
const { app, BrowserWindow, Menu, Notification, Tray, ipcMain, nativeImage, screen, session, shell } = require("electron");
const { authLinkPath, isAppUrl, isExternalWebUrl, localDay, reminderDue } = require("./lib");

// The installed app always loads the real site; OPENPREP_URL only works when running from source (development).
const SITE = (!app.isPackaged && process.env.OPENPREP_URL) || "https://openprep-opal.vercel.app";

// Restrict debugging switches in packaged builds.
const DEBUG_SWITCHES = ["remote-debugging-port", "remote-debugging-pipe", "remote-debugging-address", "remote-allow-origins", "inspect", "inspect-brk", "inspect-port", "js-flags"];
if (app.isPackaged && (DEBUG_SWITCHES.some((s) => app.commandLine.hasSwitch(s)) || process.argv.some((a) => /^--(inspect|remote-debugging|js-flags)/.test(a)))) {
  app.exit(1);
}
const ICON = path.join(__dirname, "icon.png");
const STATE_FILE = () => path.join(app.getPath("userData"), "state.json");

let win = null;
let tray = null;
let quitting = false;

/* ───────── small persisted state (reminder hour, last reminder day) ───────── */
function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE(), "utf8")); } catch { return { hour: null, lastFired: null }; }
}
function writeState(s) {
  try { fs.writeFileSync(STATE_FILE(), JSON.stringify(s)); } catch { /* non-fatal */ }
}

function openPage(url) {
  if (!win) return;
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

/* ───────── reminders: checked every minute while the app (or its tray icon) is running ───────── */
function checkReminder() {
  const s = readState();
  const now = new Date();
  if (!reminderDue(now, s.hour, s.lastFired)) return;
  writeState({ ...s, lastFired: localDay(now) });
  if (!Notification.isSupported()) return;
  const n = new Notification({ title: "Time for SAT practice", body: "Your plan for today is ready.", icon: ICON });
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

const OFFLINE = (back) => `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html><meta charset="utf-8"><title>OpenPrep</title>
<body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0">
<div style="text-align:center"><h1>You're offline</h1><p>OpenPrep needs the internet to load your practice.</p><button onclick="location.href='${back}'">Try again</button></div>`)}`;

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
    if (isExternalWebUrl(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  // Server-side redirects get the same check as links: other sites open in the normal browser, never in this window.
  win.webContents.on("will-redirect", (e, url) => {
    if (isAppUrl(url, SITE)) return;
    e.preventDefault();
    if (isExternalWebUrl(url)) void shell.openExternal(url);
  });
  // No embedded <webview>s, ever (they could load anything with their own settings).
  win.webContents.on("will-attach-webview", (e) => e.preventDefault());
  win.webContents.on("will-navigate", (e, url) => {
    if (isAppUrl(url, SITE)) return; // the offline page is loaded by the app itself, not navigated to by the page
    e.preventDefault();
    if (isExternalWebUrl(url)) void shell.openExternal(url);
  });
  win.webContents.on("did-fail-load", (_e, code, _desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3 || !isAppUrl(url, SITE)) return; // -3 = aborted (normal on redirects)
    void win.loadURL(OFFLINE(`${SITE}/dashboard`, false));
  });
  // Retry renderer crashes, then show a way home.
  let crashes = [];
  win.webContents.on("render-process-gone", (_e, details) => {
    if (details.reason === "clean-exit") return;
    crashes = [...crashes.filter((t) => Date.now() - t < 60_000), Date.now()];
    if (crashes.length <= 3) { win.webContents.reload(); return; }
    void win.loadURL(OFFLINE(`${SITE}/dashboard`, false));
  });
  // Restart an unresponsive renderer after ten seconds.
  let frozen = null;
  win.on("unresponsive", () => { frozen ??= setTimeout(() => { frozen = null; win?.webContents.forcefullyCrashRenderer(); }, 10_000); });
  win.on("responsive", () => { clearTimeout(frozen); frozen = null; });
  win.on("close", (e) => {
    if (quitting) return;
    // Keep running in the tray while reminders are on, so they can fire.
    if (readState().hour != null) { e.preventDefault(); win.hide(); }
  });
  // Restored with the same measure it was saved in (constructor sizes drift a few pixels per launch on Windows).
  if (onScreen) win.setBounds({ x: saved.x, y: saved.y, width: saved.width, height: saved.height });
  if (saved?.maximized) win.maximize();
  // Remember window size and place.
  let saveTimer = null;
  const restoredAt = Date.now(); // our own restore fires resize/move: don't save those (rounding would creep)
  const remember = () => {
    if (Date.now() - restoredAt < 2000) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (!win || win.isDestroyed() || win.isMinimized()) return;
      writeState({ ...readState(), bounds: { ...win.getNormalBounds(), maximized: win.isMaximized() } });
    }, 500);
  };
  ["resize", "move", "maximize", "unmaximize"].forEach((ev) => win.on(ev, remember));
  win.on("closed", () => { win = null; });

  if (process.env.OPENPREP_SMOKE) win.webContents.once("did-finish-load", async () => {
    const info = await win.webContents.executeJavaScript("({ url: location.href, title: document.title, bridge: typeof window.openprepDesktop })");
    console.log("SMOKE", JSON.stringify(info));
    quitting = true; app.quit();
  });
  void win.loadURL(`${SITE}/dashboard`);
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(ICON).resize({ width: 16, height: 16 }));
  tray.setToolTip("OpenPrep");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open OpenPrep", click: () => showWindow() },
    { label: "Today's plan", click: () => { showWindow(); openPage(`${SITE}/plan`); } },
    { type: "separator" },
    { label: "Quit", click: () => { quitting = true; app.quit(); } },
  ]));
  tray.on("click", () => showWindow());
}

/* ───────── IPC: only from our own site's top frame ───────── */
const fromSite = (e) => !!e.senderFrame && e.senderFrame === e.sender.mainFrame && isAppUrl(e.senderFrame.url, SITE);
ipcMain.on("reminder", (e, hour) => { if (fromSite(e)) setReminder(Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null); });

app.whenReady().then(async () => {
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
  createWindow();
  createTray();
  setInterval(checkReminder, 60_000);
  checkReminder();
  const link = process.argv.find((a) => a.startsWith("openprep://"));
  if (link) handleDeepLink(link);
});

app.on("before-quit", (e) => {
  quitting = true;
});
app.on("session-end", () => { quitting = true; });
app.on("window-all-closed", () => { if (readState().hour == null) app.quit(); });
