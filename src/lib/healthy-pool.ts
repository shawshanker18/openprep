/** Validate an idle serverless pool before reuse; never retry application writes. */
export function healthyPool<T>(create: () => T, probe: (pool: T) => PromiseLike<unknown>, close: (pool: T) => PromiseLike<unknown>, timeoutMs = 3000, ttlMs = 5000) {
  let current = create();
  let checkedAt = 0;
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
    ready(): Promise<void> {
      if (pending) return pending;
      if (checkedAt && Date.now() - checkedAt < ttlMs) return Promise.resolve();
      pending = validate().finally(() => { pending = null; });
      return pending;
    },
  };
}

