import { afterEach, expect, it, vi } from "vitest";
import { healthyPool } from "./healthy-pool";

afterEach(() => vi.useRealTimers());
it("shares one probe across concurrent requests and reuses a healthy pool", async () => {
  const create = vi.fn(() => ({ id: 1 }));
  const probe = vi.fn(async () => {});
  const close = vi.fn(async () => {});
  const pool = healthyPool(create, probe, close);
  await Promise.all(Array.from({ length: 25 }, () => pool.ready()));
  await pool.ready();
  expect(create).toHaveBeenCalledTimes(1);
  expect(probe).toHaveBeenCalledTimes(1);
  expect(close).not.toHaveBeenCalled();
});
it("recycles a socket that never responds before callers execute queries", async () => {
  vi.useFakeTimers();
  let id = 0;
  const close = vi.fn(async () => {});
  const pool = healthyPool(() => ({ id: ++id }), p => p.id === 1 ? new Promise(() => {}) : Promise.resolve(), close, 100);
  const pending = Promise.all([pool.ready(), pool.ready()]);
  await vi.advanceTimersByTimeAsync(101);
  await pending;
  expect(pool.current.id).toBe(2);
  expect(close).toHaveBeenCalledExactlyOnceWith({ id: 1 });
});
it("returns a bounded failure when the database stays unreachable across a full retry ladder", async () => {
  vi.useFakeTimers();
  let id = 0;
  const pool = healthyPool(() => ({ id: ++id }), () => new Promise(() => {}), async () => {}, 100);
  const result = pool.ready().catch(error => error.message);
  // attempt 1 (100 ms) + attempt 2 on a new pool (100 ms) + pause (250 ms) + final attempt (100 ms)
  await vi.advanceTimersByTimeAsync(455);
  await vi.advanceTimersByTimeAsync(100);
  expect(await result).toBe("Database connection check timed out");
  expect(id).toBe(3); // one replacement mid-ladder, then a fresh pool for the final attempt
});

it("recovers on a fresh pool when only the first connect fails", async () => {
  // The reported first-press failure: a brand-new pool's first connect fails once; the second attempt succeeds.
  vi.useFakeTimers();
  let id = 0;
  const close = vi.fn(async () => {});
  const pool = healthyPool(() => ({ id: ++id }), p => p.id === 1 ? Promise.reject(new Error("connect failed")) : Promise.resolve(), close, 100);
  const pending = pool.ready();
  await vi.advanceTimersByTimeAsync(251);
  await pending;
  expect(pool.current.id).toBe(2);
  expect(close).toHaveBeenCalledExactlyOnceWith({ id: 1 });
});

it("recycle replaces a stalled pool at once, closes the old one and probes the new one afresh", async () => {
  let id = 0;
  const close = vi.fn(async () => {});
  const probe = vi.fn(async () => {});
  const pool = healthyPool(() => ({ id: ++id }), probe, close);
  await pool.ready();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  pool.recycle();
  expect(pool.current.id).toBe(2);
  expect(close).toHaveBeenCalledExactlyOnceWith({ id: 1 });
  await pool.ready(); // the cached "healthy" verdict belonged to the old pool
  expect(probe).toHaveBeenCalledTimes(2);
});
it("replaces a pool that sat unused past the idle limit at once, then probes the fresh pool before queries run", async () => {
  vi.useFakeTimers();
  let id = 0;
  const close = vi.fn(async () => {});
  const probe = vi.fn((p: { id: number }) => (p.id === 1 && probe.mock.calls.length > 1 ? new Promise(() => {}) : Promise.resolve()));
  const pool = healthyPool(() => ({ id: ++id }), probe, close, 3000, 5000, 6000);
  await pool.ready();
  await vi.advanceTimersByTimeAsync(3000);
  await pool.ready();
  expect(id).toBe(1); // used again inside the idle window: same pool
  await vi.advanceTimersByTimeAsync(7000);
  await pool.ready(); // resolves immediately; no probe on the old pool, only on the fresh one
  expect(id).toBe(2);
  expect(close).toHaveBeenCalledExactlyOnceWith({ id: 1 });
  expect(pool.current.id).toBe(2);
  expect(probe).toHaveBeenCalledTimes(2); // the fresh pool was probed once; the stale pool never was
});
