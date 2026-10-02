// Test lockdown binding. Each app install keeps a random secret in an HttpOnly cookie in its own encrypted storage
// (desktop: Electron's cookie store, encrypted by the OS; Android: the app's private WebView storage). When a test
// locks, its session remembers a hash of that secret; from then on only that install can carry the test on. A browser
// pretending to be the app (a faked user agent) doesn't have the secret, so it only gets "End test".
import "server-only";
import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";

export const APP_COOKIE = "openprep_app";

const hash = (key: string) => createHash("sha256").update(`lockdown:${key}`).digest("hex");

/** Hash of this request's app-install secret, or null (a browser, or an app from before 0.1.1). */
export async function appKeyHash(): Promise<string | null> {
  const key = (await cookies()).get(APP_COOKIE)?.value;
  return key && /^[\w-]{20,100}$/.test(key) ? hash(key) : null;
}

type LockConfig = { lockdown?: boolean; lockKey?: string };

/** May this request carry on (view or answer) a test session with this config? */
export async function mayContinue(config: unknown): Promise<boolean> {
  const c = (config ?? {}) as LockConfig;
  if (!c.lockdown) return true;
  if (c.lockKey) return (await appKeyHash()) === c.lockKey;
  // Locked by an app too old to have the secret: fall back to the user agent.
  return ((await headers()).get("user-agent") ?? "").includes("OpenPrepApp");
}
