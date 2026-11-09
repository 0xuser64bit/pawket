import { Activity } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { SealedQuote } from "@/lib/coins/quote";
import type { PawketSender } from "@/lib/solana/use-send";
import type { CoinState } from "@/server/coins/meteora";

vi.mock("@/lib/solana/browser-client", () => ({ rpc: {}, useConnected: () => null }));
vi.mock("@/lib/solana/use-send", () => ({ usePawketSend: () => null }));
import { TradeTicket } from "./coin-desk";

const guild = { slug: "window-seat", name: "Window Seat", founder: "founder", memberCount: 3 };
const coin: CoinState = {
  slug: guild.slug, name: guild.name, symbol: "SEAT", mint: "Mint1111", stage: "dbc", creator: "founder",
  preset: "gentle", pool: "pool", raised: "0", threshold: "1000", price: 1, graduated: null,
  fees: { founderUnclaimed: "0", pawketUnclaimed: "0", total: "0" }, holders: null,
};
const quote: SealedQuote = {
  slug: guild.slug, mint: coin.mint, preset: "gentle",
  side: "buy", route: "curve", amountIn: "50000000", amountUsed: "50000000", amountOut: "4200000000", minimumOut: "4158000000",
  fee: "50000", priceImpact: 0.4, slippageBps: 100, quotedAt: Date.now(), token: "sealed-quote",
};

function ticket() {
  const sendFromServer = vi.fn();
  const sender = { busy: false, sendFromServer } as unknown as PawketSender;
  let selected = coin;
  let visibility: "visible" | "hidden" = "visible";
  const draw = () => <Activity mode={visibility}><TradeTicket guild={{ ...guild, slug: selected.slug }} coin={selected} balances={{ lamports: 10n ** 9n, units: 10n ** 12n }} sender={sender} onDone={() => {}} /></Activity>;
  const view = render(draw());
  fireEvent.change(screen.getByLabelText(/How much SOL to spend/), { target: { value: "0.05" } });
  return {
    ...view,
    sendFromServer,
    showCoin: (next: CoinState) => { selected = next; view.rerender(draw()); },
    setVisibility: (next: "visible" | "hidden") => { visibility = next; view.rerender(draw()); },
  };
}

function stalledFetch() {
  const calls: Array<{ signal?: AbortSignal | null; answer: () => void }> = [];
  vi.stubGlobal("fetch", vi.fn((_url: string, init?: RequestInit) => new Promise((resolve, reject) => {
    const signal = init?.signal;
    signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
    calls.push({ signal, answer: () => resolve({ ok: true, json: async () => quote }) });
  })));
  return calls;
}

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); window.localStorage.clear(); });

it("aborts a stalled quote at the browser deadline and restores the retry control", async () => {
  vi.useFakeTimers();
  const calls = stalledFetch();
  ticket();
  fireEvent.click(screen.getByRole("button", { name: "See the quote" }));
  await act(() => vi.advanceTimersByTimeAsync(20_000));
  expect(calls[0].signal?.aborted).toBe(true);
  expect(screen.getByText(/took too long.*try again/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "See the quote" })).toBeEnabled();
  expect(screen.queryByRole("button", { name: /^Sign:/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "See the quote" }));
  expect(calls).toHaveLength(2);
  expect(calls[1].signal?.aborted).toBe(false);
});

it.each(["amount", "side", "slippage"])("aborts the old request when the %s changes", async (input) => {
  const calls = stalledFetch();
  ticket();
  fireEvent.click(screen.getByRole("button", { name: "See the quote" }));
  await act(async () => {
    if (input === "amount") fireEvent.change(screen.getByLabelText(/How much SOL to spend/), { target: { value: "0.06" } });
    else fireEvent.click(screen.getByRole("radio", { name: input === "side" ? "Sell SEAT" : "3%" }));
  });
  expect(calls[0].signal?.aborted).toBe(true);
  await act(async () => calls[0].answer());
  expect(screen.queryByRole("button", { name: /^Sign:/ })).toBeNull();
  expect(screen.queryByText("No quote")).toBeNull();
});

it("aborts a quote when its ticket unmounts and removes its deadline timer", async () => {
  vi.useFakeTimers();
  const calls = stalledFetch();
  const view = ticket();
  fireEvent.click(screen.getByRole("button", { name: "See the quote" }));
  await act(async () => view.unmount());
  expect(calls[0].signal?.aborted).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});

it("clears the request deadline after a quote returns", async () => {
  vi.useFakeTimers();
  const calls = stalledFetch();
  const view = ticket();
  fireEvent.click(screen.getByRole("button", { name: "See the quote" }));
  await act(async () => calls[0].answer());
  expect(screen.getByRole("button", { name: "Sign: buy SEAT" })).toBeInTheDocument();
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
});


it.each(["slug", "mint", "stage", "preset", "pool", "graduated"])("aborts a pending quote when its coin %s changes", async (field) => {
  const calls = stalledFetch();
  const view = ticket();
  fireEvent.click(screen.getByRole("button", { name: "See the quote" }));
  await act(async () => view.showCoin(changedCoin(field)));
  expect(calls[0].signal?.aborted).toBe(true);
  expect(screen.getByRole("button", { name: "See the quote" })).toBeEnabled();
  await act(async () => calls[0].answer());
  expect(screen.queryByRole("button", { name: /^Sign:/ })).toBeNull();
});

it.each(["slug", "mint", "stage", "preset", "pool", "graduated"])("cannot sign a returned quote after its coin %s changes", async (field) => {
  const calls = stalledFetch();
  const view = ticket();
  fireEvent.click(screen.getByRole("button", { name: "See the quote" }));
  await act(async () => calls[0].answer());
  expect(screen.getByRole("button", { name: "Sign: buy SEAT" })).toBeInTheDocument();
  view.showCoin(changedCoin(field));
  expect(screen.queryByRole("button", { name: /^Sign:/ })).toBeNull();
});


function changedCoin(field: string): CoinState {
  return { ...coin, [field]: field === "stage" ? "damm" : field === "preset" ? "lively" : field === "graduated" ? { pool: "new-pool", verified: true } : "another-coin" };
}

it("can quote again after React hides and restores the ticket while a request is pending", async () => {
  const calls = stalledFetch();
  const view = ticket();
  fireEvent.click(screen.getByRole("button", { name: "See the quote" }));
  await act(async () => view.setVisibility("hidden"));
  expect(calls[0].signal?.aborted).toBe(true);
  await act(async () => view.setVisibility("visible"));
  expect(screen.getByLabelText(/How much SOL to spend/)).toHaveValue("0.05");
  fireEvent.click(screen.getByRole("button", { name: "See the quote" }));
  expect(calls).toHaveLength(2);
  expect(calls[1].signal?.aborted).toBe(false);
});

it("checks quote expiry at the signing action after a clock jump before its age interval runs", async () => {
  vi.useFakeTimers();
  const calls = stalledFetch();
  const view = ticket();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "See the quote" }));
  await act(async () => calls[0].answer());
  const sign = screen.getByRole("button", { name: "Sign: buy SEAT" });
  expect(sign).not.toHaveAttribute("aria-disabled", "true");
  // A suspended tab can resume before the age interval gets another turn.
  vi.setSystemTime(quote.quotedAt + 20_001);
  await act(async () => fireEvent.click(sign));
  expect(view.sendFromServer).not.toHaveBeenCalled();
  expect(screen.getByText("This quote is old")).toBeInTheDocument();
});

it("keeps a replacement quote busy when the cancelled request finishes", async () => {
  const calls = stalledFetch();
  ticket();
  fireEvent.click(screen.getByRole("button", { name: "See the quote" }));
  await act(async () => {
    fireEvent.change(screen.getByLabelText(/How much SOL to spend/), { target: { value: "0.06" } });
    fireEvent.click(screen.getByRole("button", { name: "See the quote" }));
  });
  expect(calls).toHaveLength(2);
  expect(calls[0].signal?.aborted).toBe(true);
  expect(calls[1].signal?.aborted).toBe(false);
  expect(screen.getByRole("button", { name: "Quoting…" })).toHaveAttribute("aria-disabled", "true");
});
