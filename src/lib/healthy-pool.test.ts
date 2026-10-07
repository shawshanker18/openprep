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
it("returns a bounded failure when the replacement is also unavailable", async () => {
  vi.useFakeTimers();
  let id = 0;
  const pool = healthyPool(() => ({ id: ++id }), () => new Promise(() => {}), async () => {}, 100);
  const result = pool.ready().catch(error => error.message);
  await vi.advanceTimersByTimeAsync(201);
  expect(await result).toBe("Database connection check timed out");
  expect(id).toBe(2);
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
it("replaces a pool that sat unused past the idle limit at once, without waiting for a probe to time out", async () => {
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
  await pool.ready(); // resolves immediately; a hanging probe on the old pool would have taken 3 s
  expect(id).toBe(2);
  expect(close).toHaveBeenCalledExactlyOnceWith({ id: 1 });
  expect(pool.current.id).toBe(2);
  expect(probe).toHaveBeenCalledTimes(1); // the replacement was not probed, and the stale pool never was
});
