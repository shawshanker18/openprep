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

