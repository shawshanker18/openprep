/**
 * Validate an idle serverless pool before reuse; never retry application writes.
 * A pool unused for longer than `idleMs` (just over the driver's own idle timeout) is replaced at once, and the
 * replacement is probed before any query runs: its first connect is exactly where a cold server-to-pooler route
 * fails once, which looked to students like "the first press errors, the second works". The probe is bounded by
 * `timeoutMs`; a healthy route only adds its own connect, because queries then ride the proven pool.
 */
export function healthyPool<T>(create: () => T, probe: (pool: T) => PromiseLike<unknown>, close: (pool: T) => PromiseLike<unknown>, timeoutMs = 3000, ttlMs = 5000, idleMs = 6000) {
  let current = create();
  let checkedAt = 0;
  let lastUsedAt = 0;
  let pending: Promise<void> | null = null;
  async function check(pool: T, ms = timeoutMs) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        Promise.resolve(probe(pool)),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Database connection check timed out")), ms); }),
      ]);
    } finally { clearTimeout(timer); }
  }
  const replace = () => {
    const stale = current;
    current = create();
    checkedAt = 0;
    void Promise.resolve(close(stale)).catch(() => {});
  };
  /** Probe the current pool; on failure rebuild it once and make one bounded final attempt before failing the request. */
  async function validate() {
    try { await check(current); checkedAt = Date.now(); return; } catch { /* rebuild below; a dead pool can never recover */ }
    replace();
    console.warn("Recycled an unresponsive database pool before executing application queries");
    try { await check(current); checkedAt = Date.now(); return; } catch { /* one last bounded attempt after a pause */ }
    replace();
    console.warn("Database still unreachable after a replacement; making one final bounded attempt");
    await new Promise((resolve) => setTimeout(resolve, 250));
    await check(current);
    checkedAt = Date.now();
  }
  return {
    get current() { return current; },
    /** Throw away the pool right now (a request stalled on it). Anything still using it is cut off; new work gets a fresh one. */
    recycle() {
      replace();
      pending = null;
      console.warn("Recycled the database pool after a stalled request");
    },
    ready(): Promise<void> {
      const now = Date.now();
      if (lastUsedAt && now - lastUsedAt > idleMs && !pending) {
        replace(); // the new pool is probed (bounded), so its first query never carries the cold connect alone
      }
      lastUsedAt = now;
      if (pending) return pending;
      if (checkedAt && Date.now() - checkedAt < ttlMs) return Promise.resolve();
      pending = validate().finally(() => { pending = null; });
      return pending;
    },
  };
}
