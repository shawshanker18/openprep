# OpenPrep Android

A Capacitor shell around the live site, so the app always matches the website and shares the same account.

- **Reminders:** a local daily notification at the time chosen in Settings (inexact by design, so no "exact alarm" permission).
- **Sign in:** email link; the browser hands the one time code back through `openprep://auth?code=…` (see `MainActivity.java`). Google sign in is hidden in the app because Google blocks it inside embedded browsers.
- **Offline:** `www/offline.html` is shown when the site can't load. During a locked test the lock stays, the page says so, and the app retries the test every few seconds.
- **Start up:** the launch screen stays until the first page has loaded (no blank white screen). Back goes to the previous page and closes the app from the first one.
- **Test lockdown:** `LockdownPlugin.java` pins the screen (Android screen pinning) for the whole test, swallows Back, pins again if the student unpins, and reopens the test if the app was closed. Android asks the student to confirm pinning the first time (only a device managed by a school can skip that). A locked test is bound to this install by a secret HttpOnly cookie, so it can't be continued in a browser. If the page's renderer crashes, the screen is rebuilt and the test reopens; if a non-test page loads while locked, the pin is released so nobody is stuck. Sign-in links are ignored during a test.
- **Always:** `FLAG_SECURE` blocks screenshots and screen recording, WebView debugging is off in release builds, the WebView has no file, content or location access, and nothing is backed up or copied to a new phone (`data_extraction_rules.xml`).

Build (needs the Android SDK and JDK 21):

```bash
npm install
npx cap sync android
cd android && gradlew.bat assembleDebug    # app/build/outputs/apk/debug/app-debug.apk
```

Release builds are signed with the upload key named in `android/keystore.properties` (never committed; the key and its password live in `C:/Users/<you>/OpenPrep-signing/`). Back that folder up somewhere safe: Google Play needs the same key for every update.

```bash
cd android && gradlew.bat assembleRelease bundleRelease   # signed .apk (sideload) and .aab (Google Play)
```

Without `keystore.properties` the release build is simply unsigned. iOS needs a Mac (`npx cap add ios`); until then iPhone students can install the website from Safari (Share, Add to Home Screen) and get web push reminders.

`node make-icons.cjs` (from the repo root's dependencies) regenerates icons and splash images.
