// Bridges to the OpenPrep desktop (Electron preload) and Android (Capacitor) shells. Absent on the plain website.
type LocalNotifications = {
  requestPermissions(): Promise<{ display: string }>;
  cancel(o: { notifications: { id: number }[] }): Promise<void>;
  schedule(o: { notifications: { id: number; title: string; body: string; isExactNotification?: boolean; schedule: { on: { hour: number; minute: number } } }[] }): Promise<void>;
};
declare global {
  interface Window {
    openprepDesktop?: { setLockdown(on: boolean): void; setReminder(hour: number | null): void };
    Capacitor?: { isNativePlatform?(): boolean; Plugins?: { LocalNotifications?: LocalNotifications } };
  }
}

export const inNativeApp = () => typeof window !== "undefined" && (!!window.openprepDesktop || !!window.Capacitor?.isNativePlatform?.());

/** Kiosk lockdown in the desktop app; no-op elsewhere. */
export const setLockdown = (on: boolean) => window.openprepDesktop?.setLockdown(on);

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
