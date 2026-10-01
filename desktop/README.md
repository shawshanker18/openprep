# OpenPrep desktop (Windows)

The live site (`https://openprep-opal.vercel.app`) in a locked-down Electron window. Same account and data as the website and the Android app.

- **Lockdown:** while a test module runs (and when a student turns on Focus mode in practice) the window goes full screen kiosk, stays on top, and blocks reload, devtools and close shortcuts. Leaving the window is counted on the test results.
- **Reminders:** the daily reminder time from Settings is mirrored here; the app stays in the tray and shows a notification at that hour on days the student hasn't practised (it starts quietly at sign in when reminders are on).
- **Sign in:** email link. The link opens in the browser, which hands a one time code back to the app through `openprep://`.

```bash
npm install
npm start                 # run against production
npm run check             # syntax check + unit tests
npm run dist              # dist/OpenPrep Setup x.y.z.exe (installer) and a portable .exe
```

`OPENPREP_URL=http://localhost:3000 npm start` points it at a local dev server. Builds are unsigned, so Windows SmartScreen shows a warning until a code signing certificate is added.
