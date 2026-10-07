/**
 * Validate an idle serverless pool before reuse; never retry application writes.
 * A pool unused for longer than `idleMs` (just over the driver's own idle timeout) is replaced at once instead of probed:
 * a frozen serverless instance never ran the timers that close idle sockets, so those sockets are likely dead, and
 * waiting `timeoutMs` for a probe to fail is what made some requests take seconds.
 */
export function healthyPool<T>(create: () => T, probe: (pool: T) => PromiseLike<unknown>, close: (pool: T) => PromiseLike<unknown>, timeoutMs = 3000, ttlMs = 5000, idleMs = 6000) {
  let current = create();
  let checkedAt = 0;
  let lastUsedAt = 0;
  let pending: Promise<void> | null = null;
  async function check(pool: T) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        Promise.resolve(probe(pool)),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Database connection check timed out")), timeoutMs); }),
      ]);
    } finally { clearTimeout(timer); }
  }
  async function validate() {
    try { await check(current); }
    catch {
      const stale = current;
      current = create();
      void Promise.resolve(close(stale)).catch(() => {});
      console.warn("Recycled an unresponsive database pool before executing application queries");
      await check(current);
    }
    checkedAt = Date.now();
  }
  return {
    get current() { return current; },
    /** Throw away the pool right now (a request stalled on it). Anything still using it is cut off; new work gets a fresh one. */
    recycle() {
      const stale = current;
      current = create();
      checkedAt = 0;
      pending = null;
      void Promise.resolve(close(stale)).catch(() => {});
      console.warn("Recycled the database pool after a stalled request");
    },
    ready(): Promise<void> {
      const now = Date.now();
      if (lastUsedAt && now - lastUsedAt > idleMs && !pending) {
        const stale = current;
        current = create();
        checkedAt = now; // a brand-new pool has no zombie sockets; its first query simply connects
        void Promise.resolve(close(stale)).catch(() => {});
      }
      lastUsedAt = now;
      if (pending) return pending;
      if (checkedAt && Date.now() - checkedAt < ttlMs) return Promise.resolve();
      pending = validate().finally(() => { pending = null; });
      return pending;
    },
  };
}

