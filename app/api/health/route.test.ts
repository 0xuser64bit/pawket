// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const checks = vi.hoisted(() => ({ slot: vi.fn(), sponsor: vi.fn() }));
vi.mock("@/server/sponsor", () => ({
  sponsorRpc: () => ({ getSlot: () => ({ send: checks.slot }) }),
  sponsorState: checks.sponsor,
}));

import { GET } from "./route";

beforeEach(() => {
  vi.resetAllMocks();
  checks.slot.mockResolvedValue(1n);
  checks.sponsor.mockResolvedValue({ available: false, reason: "Not configured." });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it("checks RPC and sponsorship concurrently within one deadline", async () => {
  const deadline = new AbortController();
  vi.spyOn(AbortSignal, "timeout").mockReturnValue(deadline.signal);
  let finishSlot!: (slot: bigint) => void;
  checks.slot.mockReturnValue(new Promise<bigint>((resolve) => { finishSlot = resolve; }));
  const response = GET();
  expect(checks.slot).toHaveBeenCalledWith({ abortSignal: deadline.signal });
  expect(checks.sponsor).toHaveBeenCalledWith({ abortSignal: deadline.signal });
  finishSlot(1n);
  expect((await response).headers.get("cache-control")).toBe("no-store");
  expect(await (await response).json()).toMatchObject({ status: "ok", sponsor: { available: false } });
});

it("answers degraded within five seconds even when both network probes stall", async () => {
  vi.useFakeTimers();
  vi.spyOn(AbortSignal, "timeout").mockImplementation((milliseconds) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new Error("deadline")), milliseconds);
    return controller.signal;
  });
  const stalled = ({ abortSignal }: { abortSignal: AbortSignal }) => new Promise((_, reject) => {
    abortSignal.addEventListener("abort", () => reject(abortSignal.reason), { once: true });
  });
  checks.slot.mockImplementation(stalled);
  checks.sponsor.mockImplementation(stalled);
  const started = Date.now();
  const response = GET();
  await vi.advanceTimersByTimeAsync(5_000);
  expect(await (await response).json()).toMatchObject({
    status: "degraded",
    rpc: { ok: false, ms: 5_000 },
    sponsor: { available: false, reason: "The sponsor cannot reach the network." },
  });
  expect(Date.now() - started).toBe(5_000);
});
