# OpenPrep desktop (Windows)

The live site (`https://openprep-opal.vercel.app`) in a locked-down Electron window. Same account and data as the website and the Android app.

- **Test lockdown:** from the moment a test opens until it is submitted or ended with "End test", the window is full screen kiosk and always on top; it can't be closed, quit (tray included), reloaded or navigated back, and anything that takes focus (Alt+Tab, the Start menu) is pushed straight back. Each attempt is counted on the results. If the app is killed it reopens straight into the test, and a locked test can't be continued in a normal browser. Windows shutdown is never blocked. Ctrl+Alt+Del and Task Manager can't be blocked by any app; using them is what the relaunch and the browser block are for.
- **Focus mode:** the same kiosk window for study, but the student can leave whenever they like.
- **Always:** devtools are disabled, view source / save / print are blocked, and the window is hidden from screenshots and screen recording.
- **Reminders:** the daily reminder time from Settings is mirrored here; the app stays in the tray and shows a notification at that hour on days the student hasn't practised (it starts quietly at sign in when reminders are on).
- **Sign in:** email link. The link opens in the browser, which hands a one time code back to the app through `openprep://`.

```bash
npm install
npm start                 # run against production
npm run check             # syntax check + unit tests
npm run e2e               # real test lockdown against OPENPREP_URL (window must be signed in)
npm run dist              # dist/OpenPrep Setup x.y.z.exe (installer) and a portable .exe
```

`OPENPREP_URL=http://localhost:3000 npm start` points it at a local dev server. Builds are unsigned, so Windows SmartScreen shows a warning until a code signing certificate is added.
