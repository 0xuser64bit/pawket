import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { PawketSender } from "@/lib/solana/use-send";
import type { CoinQuote, CoinState } from "@/server/coins/meteora";

vi.mock("@/lib/solana/browser-client", () => ({ rpc: {}, useConnected: () => null }));
vi.mock("@/lib/solana/use-send", () => ({ usePawketSend: () => null }));
import { TradeTicket } from "./coin-desk";

const guild = { slug: "window-seat", name: "Window Seat", founder: "founder", memberCount: 3 };
const coin = { slug: "window-seat", name: "Window Seat", symbol: "SEAT", mint: "Mint1111", stage: "dbc", creator: "founder" } as CoinState;
const balances = { lamports: 10n ** 9n, units: 10n ** 12n };

function slowQuotes() {
  const answers: Array<(quote: CoinQuote) => void> = [];
  vi.stubGlobal("fetch", vi.fn(() => new Promise((resolve) => {
    answers.push((quote) => resolve({ ok: true, json: async () => quote }));
  })));
  return answers;
}

const buyQuote = (amountIn: string): CoinQuote => ({
  side: "buy", route: "curve", amountIn, amountUsed: amountIn, amountOut: "4200000000", minimumOut: "4158000000",
  fee: "50000", priceImpact: 0.4, slippageBps: 100, quotedAt: Date.now(),
});

function ticket(sendFromServer = vi.fn(async () => null)) {
  const sender = { busy: false, sendFromServer } as unknown as PawketSender;
  render(<TradeTicket guild={guild} coin={coin} balances={balances} sender={sender} onDone={() => {}} />);
  fireEvent.change(screen.getByLabelText(/How much SOL to spend/), { target: { value: "0.05" } });
  return sendFromServer;
}

afterEach(() => { vi.unstubAllGlobals(); window.localStorage.clear(); });

it("drops a quote that comes back after the side changed, so it can never be signed for the other side", async () => {
  const answers = slowQuotes();
  ticket();
  fireEvent.click(screen.getByRole("button", { name: "See the quote" }));
  fireEvent.click(screen.getByRole("radio", { name: "Sell SEAT" }));
  await act(async () => answers[0](buyQuote("50000000")));
  expect(screen.queryByRole("button", { name: /^Sign:/ })).toBeNull();
  expect(screen.queryByText("You pay")).toBeNull();
});

it("shows a quote only while the inputs are the ones it was asked for", async () => {
  const answers = slowQuotes();
  ticket();
  fireEvent.click(screen.getByRole("button", { name: "See the quote" }));
  await act(async () => answers[0](buyQuote("50000000")));
  expect(screen.getByRole("button", { name: "Sign: buy SEAT" })).toBeTruthy();
  fireEvent.change(screen.getByLabelText(/How much SOL to spend/), { target: { value: "0.06" } });
  expect(screen.queryByRole("button", { name: /^Sign:/ })).toBeNull();
});

it("signs exactly the quote's side, amount and least", async () => {
  const answers = slowQuotes();
  const sendFromServer = ticket();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "See the quote" }));
  await act(async () => answers[0](buyQuote("50000000")));
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Sign: buy SEAT" })); });
  expect(sendFromServer).toHaveBeenCalledWith("Buy SEAT", "/api/coins/window-seat/trade", { side: "buy", amount: "50000000", minimumOut: "4158000000" }, { sponsored: false });
});
