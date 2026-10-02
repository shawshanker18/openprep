// Bridges to the OpenPrep desktop (Electron preload) and Android (Capacitor) shells. Absent on the plain website.
type LocalNotifications = {
  requestPermissions(): Promise<{ display: string }>;
  checkPermissions(): Promise<{ display: string }>;
  cancel(o: { notifications: { id: number }[] }): Promise<void>;
  schedule(o: { notifications: { id: number; title: string; body: string; isExactNotification?: boolean; schedule: { on: { hour: number; minute: number } } }[] }): Promise<void>;
};
declare global {
  interface Window {
    openprepDesktop?: { setLockdown(on: boolean, kind?: "test" | "focus"): void; setReminder(hour: number | null): void };
    Capacitor?: { isNativePlatform?(): boolean; Plugins?: { LocalNotifications?: LocalNotifications; Lockdown?: { start(): Promise<void>; stop(): Promise<void> } } };
  }
}

export const inNativeApp = () => typeof window !== "undefined" && (!!window.openprepDesktop || !!window.Capacitor?.isNativePlatform?.());

/**
 * Lockdown in the apps; no-op on the website. "test" is strict (the app can't be left until the test ends);
 * "focus" is a study session the student can end at any time. Android pins the screen for both.
 */
export function setLockdown(on: boolean, kind: "test" | "focus" = "test") {
  window.openprepDesktop?.setLockdown(on, kind); // the desktop app debounces releases itself
  const android = window.Capacitor?.Plugins?.Lockdown;
  if (!android) return;
  // Between test modules the page remounts (unlock, then lock): a late release keeps Android from asking to pin again.
  clearTimeout(androidRelease);
  if (!on) { androidRelease = setTimeout(() => { androidPinned = false; void android.stop().catch(() => {}); }, 1500); return; }
  if (androidPinned) return;
  androidPinned = true;
  void android.start().catch(() => { androidPinned = false; });
}
let androidRelease: ReturnType<typeof setTimeout> | undefined;
let androidPinned = false;

/** Android app: may OpenPrep show notifications? (The desktop app and the website handle this themselves: true.) */
export async function nativeNotificationsAllowed() {
  const ln = window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins?.LocalNotifications : undefined;
  return !ln || (await ln.checkPermissions()).display === "granted";
}

const REMINDER_ID = 1;
// Updates run one at a time (overlapping cancel/schedule pairs would cancel each other) and repeats are skipped.
let queue: Promise<unknown> = Promise.resolve();
let applied: number | null | undefined;

/** Daily local reminder at `hour` in the app shells (no server push needed). Returns false on the plain website. */
export async function setNativeReminder(hour: number | null): Promise<boolean> {
  if (window.openprepDesktop) { window.openprepDesktop.setReminder(hour); return true; }
  const ln = window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins?.LocalNotifications : undefined;
  if (!ln) return false;
  const run = queue.then(async () => {
    if (applied === hour) return;
    await ln.cancel({ notifications: [{ id: REMINDER_ID }] });
    applied = hour;
    if (hour == null) return;
    if ((await ln.requestPermissions()).display !== "granted") return;
    await ln.schedule({ notifications: [{
      id: REMINDER_ID, title: "Time for SAT practice", body: "Your plan for today is ready. Keep your streak going!",
      // Inexact on purpose: exact alarms make Android open its "Alarms & reminders" settings screen.
      isExactNotification: false, schedule: { on: { hour, minute: 0 } },
    }] });
  });
  queue = run.catch(() => { applied = undefined; });
  await run;
  return true;
}
