// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ readGuild: vi.fn(), quoteTrade: vi.fn() }));
vi.mock("@/server/solana", () => ({ readGuild: mocks.readGuild }));
vi.mock("@/server/sponsor", () => ({ actionLimit: () => true }));
vi.mock("@/server/coins/meteora", () => ({ quoteTrade: mocks.quoteTrade, CoinRefusal: class extends Error {} }));

const guild = { slug: "window-seat", name: "Window Seat" };
const params = { params: Promise.resolve({ slug: guild.slug }) };
const request = (signal?: AbortSignal) => new Request("http://localhost:3000/api/coins/window-seat/quote?side=buy&amount=50000000", { signal });
function stalled(signal?: AbortSignal): Promise<never> {
  if (!signal) return Promise.reject(new Error("No cancellation signal reached the provider"));
  return new Promise((_resolve, reject) => {
    signal.throwIfAborted();
    signal.addEventListener("abort", () => reject(signal.reason), { once: true });
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.readGuild.mockReset().mockResolvedValue(guild);
  mocks.quoteTrade.mockReset().mockImplementation((_guild, _side, _amount, _slippage, signal) => stalled(signal));
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

it("stops a hung guild read at the whole quote deadline", async () => {
  mocks.readGuild.mockImplementation((_slug, signal) => stalled(signal));
  const { GET } = await import("./[slug]/quote/route");
  const answered = vi.fn();
  const pending = GET(request(), params).then(answered);
  await vi.advanceTimersByTimeAsync(14_999);
  expect(answered).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  await pending;
  expect(mocks.readGuild.mock.calls[0][1].aborted).toBe(true);
  expect(answered.mock.calls[0][0].status).toBe(503);
  expect((await answered.mock.calls[0][0].json()).message).toMatch(/try again/i);
  expect(mocks.quoteTrade).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});

it("shares the remaining budget with quote reads after a slow guild read", async () => {
  mocks.readGuild.mockImplementation((_slug, signal) => new Promise((resolve, reject) => {
    if (!signal) return reject(new Error("No cancellation signal reached the guild read"));
    setTimeout(() => resolve(guild), 10_000);
  }));
  const { GET } = await import("./[slug]/quote/route");
  const answered = vi.fn();
  const pending = GET(request(), params).then(answered);
  await vi.advanceTimersByTimeAsync(14_999);
  expect(answered).not.toHaveBeenCalled();
  expect(mocks.quoteTrade).toHaveBeenCalledOnce();
  const signal = mocks.quoteTrade.mock.calls[0][4];
  expect(signal).toBe(mocks.readGuild.mock.calls[0][1]);
  await vi.advanceTimersByTimeAsync(1);
  await pending;
  expect(signal.aborted).toBe(true);
  expect(answered.mock.calls[0][0].status).toBe(503);
  expect(vi.getTimerCount()).toBe(0);
});

it("propagates browser cancellation to quote reads immediately", async () => {
  const controller = new AbortController();
  const { GET } = await import("./[slug]/quote/route");
  const pending = GET(request(controller.signal), params);
  await vi.advanceTimersByTimeAsync(0);
  controller.abort(new DOMException("Inputs changed", "AbortError"));
  await vi.advanceTimersByTimeAsync(0);
  const response = await pending;
  expect(mocks.quoteTrade.mock.calls[0][4]?.aborted).toBe(true);
  expect(response.status).toBe(503);
  expect(vi.getTimerCount()).toBe(0);
});

it("removes the deadline and browser abort listener after success", async () => {
  mocks.quoteTrade.mockResolvedValue({ amountIn: "50000000" });
  const controller = new AbortController();
  const incoming = request(controller.signal);
  const remove = vi.spyOn(incoming.signal, "removeEventListener");
  const { GET } = await import("./[slug]/quote/route");
  const response = await GET(incoming, params);
  expect(response.status).toBe(200);
  expect(vi.getTimerCount()).toBe(0);
  expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
});

it("aborts sibling provider reads when one quote read fails early", async () => {
  let remaining: AbortSignal | undefined;
  mocks.quoteTrade.mockImplementation((_guild, _side, _amount, _slippage, signal) => {
    remaining = signal;
    return Promise.reject(new Error("The other provider read failed"));
  });
  const { GET } = await import("./[slug]/quote/route");
  const response = await GET(request(), params);
  expect(response.status).toBe(503);
  expect(remaining?.aborted).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});
