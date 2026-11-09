import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { SealedQuote } from "@/lib/coins/quote";
import type { PawketSender } from "@/lib/solana/use-send";
import type { CoinState } from "@/server/coins/meteora";

vi.mock("@/lib/solana/browser-client", () => ({ rpc: {}, useConnected: () => null }));
vi.mock("@/lib/solana/use-send", () => ({ usePawketSend: () => null }));
vi.mock("@/config/env", () => ({ getPublicEnv: () => ({ solanaCluster: "devnet", appUrl: "https://dev.pawket.world" }) }));
import { TradeTicket } from "./coin-desk";

const guild = { slug: "window-seat", name: "Window Seat", founder: "founder", memberCount: 3 };
const coin = { mint: "coin-mint", preset: "gentle", stage: "dbc", symbol: "SEAT" } as CoinState;
afterEach(() => { vi.unstubAllGlobals(); window.localStorage.clear(); });

it.each(["buy", "sell"] as const)("captures the displayed %s quote as the separate signing intent", async (side) => {
  const quote: SealedQuote = { slug: guild.slug, mint: "coin-mint", preset: "gentle", side, route: "curve", amountIn: "50000000", amountUsed: "50000000", amountOut: "4200000000", minimumOut: "4158000000", fee: "50000", priceImpact: 0.4, slippageBps: 100, quotedAt: Date.now(), token: "sealed-quote" };
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => quote })));
  const send = vi.fn(async () => null);
  const sender = { busy: false, sendFromServer: send } as unknown as PawketSender;
  render(<TradeTicket guild={guild} coin={coin} balances={{ lamports: 1_000_000_000n, units: 100_000_000n }} sender={sender} onDone={() => {}} />);
  if (side === "sell") fireEvent.click(screen.getByRole("radio", { name: "Sell SEAT" }));
  fireEvent.change(screen.getByLabelText(side === "buy" ? /How much SOL/ : /How much SEAT/), { target: { value: side === "buy" ? "0.05" : "50" } });
  fireEvent.click(screen.getByRole("checkbox"));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "See the quote" })));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: `Sign: ${side} SEAT` })));
  expect(send).toHaveBeenCalledExactlyOnceWith(`${side === "buy" ? "Buy" : "Sell"} SEAT`, "/api/coins/window-seat/trade", { side, amount: "50000000", minimumOut: "4158000000", quote: "sealed-quote" }, { sponsored: false, coinIntent: { kind: "trade", cluster: "devnet", mint: "coin-mint", preset: "gentle", route: "curve", side, amountIn: 50_000_000n, minimumOut: 4_158_000_000n } });
  expect(screen.getByText(/up to 0.005 SOL of account rent/)).toBeInTheDocument();
});
