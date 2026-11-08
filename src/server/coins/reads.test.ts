// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCachedRead, withinDeadline } from "./reads";

afterEach(() => {
  vi.useRealTimers();
});

describe("cached reads", () => {
  it("loads once for concurrent callers", async () => {
    const read = createCachedRead<number>({ ttlMs: 1_000 });
    let loads = 0;
    const load = async () => ++loads;
    const [first, second] = await Promise.all([read("same", load, 0), read("same", load, 0)]);
    expect([first, second]).toEqual([1, 1]);
    expect(loads).toBe(1);
  });

  it("forgets a rejected read so the next caller retries", async () => {
    const read = createCachedRead<number>({ ttlMs: 1_000 });
    let fail = true;
    const load = async () => {
      if (fail) throw new Error("Solana did not answer");
      return 7;
    };
    await expect(read("retry", load, 0)).rejects.toThrow("Solana did not answer");
    fail = false;
    await expect(read("retry", load, 0)).resolves.toBe(7);
  });

  it("forgets a timed-out read", async () => {
    vi.useFakeTimers();
    const read = createCachedRead<number>({ ttlMs: 60_000 });
    const pending = read("timeout", () => withinDeadline(() => new Promise<number>(() => {}), 5_000), 0);
    const assertion = expect(pending).rejects.toMatchObject({ name: "TimeoutError" });
    await vi.advanceTimersByTimeAsync(5_000);
    await assertion;
    await expect(read("timeout", async () => 3, 1)).resolves.toBe(3);
  });

  it("expires after its life and keeps at most its cap", async () => {
    const read = createCachedRead<number>({ ttlMs: 1_000, maxEntries: 2 });
    let loads = 0;
    const load = async () => ++loads;
    expect(await read("a", load, 0)).toBe(1);
    expect(await read("a", load, 999)).toBe(1);
    expect(await read("a", load, 1_000)).toBe(2);
    expect(await read("b", load, 1_000)).toBe(3);
    expect(await read("c", load, 1_000)).toBe(4);
    // "a" was the oldest and is gone; loading it again starts a new read.
    expect(await read("a", load, 1_000)).toBe(5);
  });
});

describe("reads with a deadline", () => {
  it("rejects a stalled read and clears its timer", async () => {
    vi.useFakeTimers();
    const pending = withinDeadline(() => new Promise<number>(() => {}), 5_000);
    const assertion = expect(pending).rejects.toMatchObject({ name: "TimeoutError" });
    await vi.advanceTimersByTimeAsync(5_000);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("passes the parent's cancellation through and clears its timer", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const reason = new Error("The player left");
    const pending = withinDeadline(() => new Promise<number>(() => {}), 5_000, controller.signal);
    const assertion = expect(pending).rejects.toBe(reason);
    controller.abort(reason);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("refuses a read whose parent is already cancelled", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    controller.abort(new Error("Already gone"));
    await expect(withinDeadline(async () => 1, 5_000, controller.signal)).rejects.toThrow("Already gone");
    expect(vi.getTimerCount()).toBe(0);
  });
});
