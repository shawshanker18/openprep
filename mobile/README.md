# OpenPrep Android

A Capacitor shell around the live site, sharing the website account and study data.
Google opens in the system browser and returns through `openprep://auth`; email sign-in uses the same handoff.
Tests do not pin the screen, block Back, or bind a session to one app install.
Local daily reminders, the launch splash screen, and offline retry remain available.
The WebView keeps file, content, and location access disabled.

Build with the Android SDK and JDK 21:
`npm install`, `npx cap sync android`, then `cd android && gradlew.bat assembleDebug`.
Release signing uses local `android/keystore.properties`; signing credentials are never committed.
Run `gradlew.bat assembleRelease bundleRelease` for signed release artifacts when configured.
