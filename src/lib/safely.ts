/**
 * Optional page furniture (checklists, badges, notification counts) must never take a whole page down. Resolves to
 * `fallback` when the work fails or takes longer than `ms`; the work itself keeps running and is simply ignored.
 */
export async function safely<T>(work: PromiseLike<T> | (() => PromiseLike<T>), fallback: T, ms = 3000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const pending = Promise.resolve(typeof work === "function" ? work() : work);
    pending.catch(() => {}); // a late failure after the timeout must not become an unhandled rejection
    return await Promise.race([
      pending,
      new Promise<T>((resolve) => { timer = setTimeout(() => resolve(fallback), ms); }),
    ]);
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}
