// Pure helpers for the desktop shell (unit-tested in lib.test.js).

/** openprep://auth?code=XYZ → "XYZ" (only plain tokens; anything else is ignored). */
function parseAuthLink(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "openprep:" || u.hostname !== "auth") return null;
    const code = u.searchParams.get("code");
    return code && /^[A-Za-z0-9_-]{8,200}$/.test(code) ? code : null;
  } catch { return null; }
}

/** Pages the app window may show itself; everything else opens in the normal browser. */
function isAppUrl(url, site) {
  try { return new URL(url).origin === new URL(site).origin; } catch { return false; }
}

/** A running test's page on our site (/test/<uuid>, not its results). */
function isTestPage(url, site) {
  try { return isAppUrl(url, site) && /^\/test\/[0-9a-f-]{36}$/i.test(new URL(url).pathname); } catch { return false; }
}

/** Only hand real web links to the OS (never file:, javascript:, custom schemes from page content). */
function isExternalWebUrl(url) {
  try { return ["https:", "http:"].includes(new URL(url).protocol); } catch { return false; }
}

/** "YYYY-MM-DD" in local time. */
const localDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Fire the daily reminder once per local day, during the chosen hour. */
function reminderDue(now, hour, lastFiredDay) {
  return hour != null && now.getHours() === hour && lastFiredDay !== localDay(now);
}

module.exports = { parseAuthLink, isAppUrl, isTestPage, isExternalWebUrl, localDay, reminderDue };
