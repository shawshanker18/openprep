export class DatabaseTimeout extends Error {
  constructor() { super("The database took too long to respond."); this.name = "DatabaseTimeout"; }
}

/**
 * Never wait forever on slow work. If `work` has not finished after `ms`, run `onTimeout` (e.g. replace a stalled
 * connection pool) and fail with DatabaseTimeout so the page can show a retry instead of a spinner that never ends.
 */
export async function withDeadline<T>(work: PromiseLike<T>, ms: number, onTimeout?: () => void): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const pending = Promise.resolve(work);
  pending.catch(() => {}); // a failure after the deadline must not become an unhandled rejection
  try {
    return await Promise.race([
      pending,
      new Promise<never>((_, reject) => { timer = setTimeout(() => { try { onTimeout?.(); } finally { reject(new DatabaseTimeout()); } }, ms); }),
    ]);
  } finally { clearTimeout(timer); }
}
