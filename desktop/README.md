# OpenPrep desktop (Windows)

The live OpenPrep website in an Electron window, sharing the website account and study data.
Tests can be left, resumed in a browser, and ended normally. No kiosk mode or monitor blocking.
Google opens in the system browser and returns through the app deep link; email links use the same app handoff.
Local daily reminders and normal window size restoration remain available.

Run `npm install`, then `npm start`. `npm run check` checks syntax and helper tests.
`npm run dist` builds the Windows installer and portable executable.
`OPENPREP_URL=http://localhost:3000 npm start` uses a local development server.
