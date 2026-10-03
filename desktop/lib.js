// Pure helpers for the desktop shell (unit-tested in lib.test.js).

/**
 * A sign-in coming back to the app → the site page that finishes it (only plain tokens; anything else is ignored).
 * openprep://auth?code=XYZ (email link) → /auth/callback?code=XYZ
 * openprep://auth?google=<ID token> (Google, from /auth/google) → /auth/google/finish#t=<token> (in the fragment:
 * never sent to a server in the address; it's only usable with the nonce this app kept).
 */
function authLinkPath(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "openprep:" || u.hostname !== "auth") return null;
    const code = u.searchParams.get("code");
    if (code && /^[A-Za-z0-9_-]{8,200}$/.test(code)) return `/auth/callback?code=${code}`;
    const google = u.searchParams.get("google");
    if (google && google.length <= 8192 && /^[\w-]+\.[\w-]+\.[\w-]+$/.test(google)) return `/auth/google/finish#t=${google}`;
    return null;
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

module.exports = { authLinkPath, isAppUrl, isTestPage, isExternalWebUrl, localDay, reminderDue };
