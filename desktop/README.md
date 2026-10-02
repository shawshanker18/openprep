# OpenPrep desktop (Windows)

The live site (`https://openprep-opal.vercel.app`) in a locked-down Electron window. Same account and data as the website and the Android app.

- **Test lockdown:** from the moment a test opens until it is submitted or ended with "End test", the window is full screen kiosk and always on top; it can't be closed, quit (tray included), reloaded or navigated back, and anything that takes focus (Alt+Tab, the Start menu) is pushed straight back. Each attempt is counted on the results. Other monitors are blacked out. Tray, notification and `openprep://` link clicks are ignored while locked. If the connection drops, the lock stays and the offline page retries the test every few seconds. If the page crashes or freezes, it's reloaded and re-locked. If the app is killed it reopens straight into the test (and that's counted as leaving). A locked test is bound to this install by a secret HttpOnly cookie, so it can't be carried on in a browser, even one faking the app's user agent. Windows shutdown is never blocked. Ctrl+Alt+Del and Task Manager can't be blocked by any app; the relaunch, the recording and the install binding are what make using them pointless.
- **Focus mode:** the same kiosk window for study, but the student can leave whenever they like.
- **Always:** devtools are disabled, view source / save / print are blocked, and the window is hidden from screenshots and screen recording. The installed app refuses `--remote-debugging-*` / `--inspect` switches and always loads the real site (`OPENPREP_URL` only works from source); Electron fuses switch off Node mode and `NODE_OPTIONS` and turn on cookie encryption and asar integrity. The window reopens at the size and place it was left.
- **Reminders:** the daily reminder time from Settings is mirrored here; the app stays in the tray and shows a notification at that hour on days the student hasn't practised (it starts quietly at sign in when reminders are on).
- **Sign in:** email link. The link opens in the browser, which hands a one time code back to the app through `openprep://`.

```bash
npm install
npm start                 # run against production
npm run check             # syntax check + unit tests
npm run e2e               # real test lockdown against OPENPREP_URL (window must be signed in)
                          # STAGE=escape|screens|crash|freeze|offline|kill|resume|diag for the other scenarios
npm run dist              # dist/OpenPrep Setup x.y.z.exe (installer) and a portable .exe
```

`OPENPREP_URL=http://localhost:3000 npm start` points it at a local dev server. Builds are unsigned, so Windows SmartScreen shows a warning until a code signing certificate is added.
