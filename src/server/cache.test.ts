// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  unstable_cache: <T,>(read: () => Promise<T>) => {
    let kept: Promise<T> | null = null;
    return () => (kept ??= read());
  },
}));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

it("never shows an entry older than twice its life as live: it reads again", async () => {
  vi.stubEnv("NEXT_RUNTIME", "nodejs");
  vi.useFakeTimers();
  vi.setSystemTime(0);
  const { shared } = await import("./cache");
  let count = 0;
  const read = vi.fn(async () => ++count);
  const scan = shared(read, "test", 20);
  expect(await scan()).toBe(1);
  vi.setSystemTime(30_000);
  expect(await scan()).toBe(1);
  expect(read).toHaveBeenCalledTimes(1);
  vi.setSystemTime(41_000);
  expect(await scan()).toBe(2);
});
