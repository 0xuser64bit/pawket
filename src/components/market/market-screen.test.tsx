import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ChainCloset } from "@/lib/solana/accounts";
import type { Address } from "@solana/kit";
import type { SendOptions, SendResult } from "@/lib/solana/send";
import type { TxState } from "@/lib/solana/use-send";
import { MarketScreen } from "./market-screen";

const chain = vi.hoisted(() => ({ read: vi.fn(), send: vi.fn(), owner: "So11111111111111111111111111111111111111112" }));
vi.mock("@/lib/solana/accounts", async (original) => ({ ...(await original<object>()), fetchCloset: chain.read }));
vi.mock("@/lib/solana/browser-client", () => ({ rpc: {}, useConnected: () => ({ account: { address: chain.owner }, signer: {} }) }));
vi.mock("@/lib/companion/use-companion", () => ({ useCompanion: () => ({ pet: null }) }));
vi.mock("@/lib/solana/use-send", () => ({
  usePawketSend: () => ({ busy: false, send: chain.send, pawketWallet: { linked: true, balance: 1_000_000_000n } }),
  useSponsor: () => ({ data: { available: true } }),
}));

type OnReceipt = (tx: TxState) => void;

function purchase(outcome: SendResult["outcome"] = "confirmed", signature = "purchase"): SendResult {
  return { outcome, signature, sponsored: true, blockhash: "purchase-blockhash", programs: [] };
}

function fakeSend(outcome: SendResult["outcome"] = "confirmed", signature = "purchase") {
  return async (label: string, _instructions: SendOptions["instructions"], onReceipt?: OnReceipt) => {
    onReceipt?.({ stage: "preparing", label, by: "wallet" });
    const result = purchase(outcome, signature);
    onReceipt?.({ stage: outcome, signature: result.signature, sponsored: true, label, by: "wallet" });
    return result;
  };
}

function delayedSettlement() {
  let onReceipt: OnReceipt | undefined;
  chain.send.mockImplementationOnce(async (label: string, _instructions: SendOptions["instructions"], notify?: OnReceipt) => {
    onReceipt = notify;
    notify?.({ stage: "preparing", label, by: "wallet" });
    notify?.({ stage: "unknown", signature: "purchase", sponsored: true, label, by: "wallet" });
    return purchase("unknown");
  });
  return (stage: TxState["stage"], signature = "purchase") => onReceipt?.({ stage, signature, sponsored: true, by: "wallet" });
}

async function buyHalo() {
  fireEvent.click(screen.getByRole("button", { name: /Halo/ }));
  await screen.findByRole("button", { name: "Buy for 0.05 SOL" });
  fireEvent.click(screen.getByRole("button", { name: "Buy for 0.05 SOL" }));
  await screen.findByText(/purchase outcome is unknown/i);
}

async function dismissItem() {
  fireEvent.click(screen.getByRole("button", { name: "Not now" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, "", "/market");
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  chain.read.mockReset();
  chain.owner = "So11111111111111111111111111111111111111112";
  chain.send.mockReset().mockImplementation(fakeSend());
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("waits for the owned closet read instead of claiming nothing was bought", async () => {
  chain.read.mockReturnValue(new Promise(() => {}));
  window.history.replaceState(null, "", "/market#yours");
  render(<MarketScreen />);
  expect((await screen.findAllByText("Reading your closet")).length).toBeGreaterThan(0);
  expect(screen.queryByText(/Nothing bought yet/)).toBeNull();
  expect(screen.queryByText(/Nothing on the shelves matches/)).toBeNull();
});

it("makes a failed owned closet read retryable and only reports empty after a successful absent account read", async () => {
  chain.read.mockRejectedValueOnce(new Error("RPC unavailable"));
  window.history.replaceState(null, "", "/market#yours");
  render(<MarketScreen />);
  expect(await screen.findByRole("alert")).toHaveTextContent(/closet.*(unavailable|could not|did not)/i);
  expect(screen.queryByText(/Nothing bought yet/)).toBeNull();
  let finish!: (closet: null) => void;
  chain.read.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
  fireEvent.click(screen.getByRole("button", { name: "Reload closet" }));
  expect(screen.getByRole("button", { name: "Reload closet" })).toBeDisabled();
  await act(async () => finish(null));
  expect(await screen.findByText(/Nothing bought yet/)).toBeInTheDocument();
});

it("lets an unread item be previewed but does not assume it can be bought again", async () => {
  chain.read.mockRejectedValue(new Error("RPC unavailable"));
  render(<MarketScreen />);
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: /Halo/ }));
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).queryByRole("button", { name: /Buy for/ })).toBeNull();
  expect(within(dialog).getByRole("button", { name: "Reload closet" })).toBeInTheDocument();
});

it.each(["confirmed", "unknown"] as const)("never offers another purchase while a %s send awaits its closet read, including after reopening", async (outcome) => {
  chain.read.mockResolvedValueOnce(null);
  chain.send.mockImplementationOnce(fakeSend(outcome));
  render(<MarketScreen />);
  await waitFor(() => expect(chain.read).toHaveBeenCalled());
  fireEvent.click(screen.getByRole("button", { name: /Halo/ }));
  await screen.findByRole("button", { name: "Buy for 0.05 SOL" });
  let finish!: (closet: ChainCloset) => void;
  chain.read.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Buy for 0.05 SOL" })));
  let dialog = screen.getByRole("dialog");
  await waitFor(() => expect(within(dialog).queryByRole("button", { name: /Buy for/ })).toBeNull());
  expect(within(dialog).getByText(outcome === "confirmed" ? /confirmed.*closet/i : /outcome.*unknown/i)).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole("button", { name: "Not now" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  fireEvent.click(screen.getByRole("button", { name: /Halo/ }));
  dialog = screen.getByRole("dialog");
  expect(within(dialog).queryByRole("button", { name: /Buy for/ })).toBeNull();
  await act(async () => finish({
    address: "So11111111111111111111111111111111111111112" as Address,
    owner: "So11111111111111111111111111111111111111112" as Address, items: [19], count: 1, spent: 50_000_000n,
  }));
  expect(within(dialog).getByText("Yours. Put it on from the wardrobe in Profile.")).toBeInTheDocument();
  expect(chain.send).toHaveBeenCalledTimes(1);
});

it("does not claim nothing was bought when a confirmed purchase is absent from a successful closet reread", async () => {
  chain.read.mockResolvedValue(null);
  render(<MarketScreen />);
  fireEvent.click(screen.getByRole("button", { name: /Halo/ }));
  await screen.findByRole("button", { name: "Buy for 0.05 SOL" });
  fireEvent.click(screen.getByRole("button", { name: "Buy for 0.05 SOL" }));
  await screen.findByText(/Purchase confirmed/);
  fireEvent.click(screen.getByRole("button", { name: "Not now" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  fireEvent.click(screen.getByRole("radio", { name: "In your closet" }));
  expect(screen.queryByText(/Nothing bought yet/)).toBeNull();
  expect(screen.getByText(/purchase.*(not.*shown|waiting|read)/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Reload closet" }));
  expect(chain.send).toHaveBeenCalledTimes(1);
});

it("keeps a delayed purchase receipt with its initiating owner rather than another wallet", async () => {
  const buyer = chain.owner;
  chain.read.mockResolvedValue(null);
  let finish!: (result: SendResult) => void;
  chain.send.mockImplementationOnce((label: string, _instructions: SendOptions["instructions"], onReceipt?: OnReceipt) => {
    onReceipt?.({ stage: "preparing", label, by: "wallet" });
    return new Promise<SendResult>((resolve) => {
      finish = (result) => {
        onReceipt?.({ stage: result.outcome, signature: result.signature, sponsored: true, label, by: "wallet" });
        resolve(result);
      };
    });
  });
  const view = render(<MarketScreen />);
  fireEvent.click(screen.getByRole("button", { name: /Halo/ }));
  await screen.findByRole("button", { name: "Buy for 0.05 SOL" });
  fireEvent.click(screen.getByRole("button", { name: "Buy for 0.05 SOL" }));
  await waitFor(() => expect(chain.send).toHaveBeenCalledTimes(1));
  chain.owner = "11111111111111111111111111111111";
  view.rerender(<MarketScreen />);
  await screen.findByRole("button", { name: "Buy for 0.05 SOL" });
  await act(async () => finish(purchase("confirmed", "buyer-purchase")));
  expect(screen.getByRole("button", { name: "Buy for 0.05 SOL" })).toBeInTheDocument();
  expect(screen.queryByText(/Purchase confirmed/)).toBeNull();
  chain.owner = buyer;
  view.rerender(<MarketScreen />);
  await screen.findByText(/Purchase confirmed/);
  expect(screen.queryByRole("button", { name: /Buy for/ })).toBeNull();
  expect(chain.send).toHaveBeenCalledTimes(1);
});

it.each(["open", "dismissed"])("allows an explicit new purchase after its unknown signature fails while the sheet is %s", async (where) => {
  chain.read.mockResolvedValue(null);
  const settle = delayedSettlement();
  render(<MarketScreen />);
  await buyHalo();
  expect(screen.queryByRole("button", { name: /Buy for/ })).toBeNull();
  if (where === "dismissed") await dismissItem();
  await act(async () => settle("failed"));
  if (where === "dismissed") fireEvent.click(screen.getByRole("button", { name: /Halo/ }));
  await screen.findByRole("button", { name: "Buy for 0.05 SOL" });
  expect(screen.queryByText(/purchase outcome is unknown/i)).toBeNull();
  expect(chain.send).toHaveBeenCalledTimes(1);
  chain.send.mockImplementationOnce(fakeSend("confirmed", "retry-purchase"));
  fireEvent.click(screen.getByRole("button", { name: "Buy for 0.05 SOL" }));
  await screen.findByText(/Purchase confirmed/);
  expect(chain.send).toHaveBeenCalledTimes(2);
});

it("updates a dismissed unknown purchase to confirmed but waits for the actual closet entitlement", async () => {
  chain.read.mockResolvedValue(null);
  const settle = delayedSettlement();
  render(<MarketScreen />);
  await buyHalo();
  await dismissItem();
  await act(async () => settle("confirmed"));
  fireEvent.click(screen.getByRole("button", { name: /Halo/ }));
  await screen.findByText(/Purchase confirmed/);
  expect(screen.queryByText(/purchase outcome is unknown/i)).toBeNull();
  expect(screen.queryByRole("button", { name: /Buy for/ })).toBeNull();
  expect(screen.queryByText("Yours. Put it on from the wardrobe in Profile.")).toBeNull();
  chain.read.mockResolvedValueOnce({ address: chain.owner as Address, owner: chain.owner as Address, items: [19], count: 1, spent: 50_000_000n });
  fireEvent.click(screen.getByRole("button", { name: "Reload closet" }));
  await screen.findByText("Yours. Put it on from the wardrobe in Profile.");
  expect(chain.send).toHaveBeenCalledTimes(1);
});

it("does not clear a purchase guard when the callback reports another signature failed", async () => {
  chain.read.mockResolvedValue(null);
  const settle = delayedSettlement();
  render(<MarketScreen />);
  await buyHalo();
  await dismissItem();
  await act(async () => settle("failed", "unrelated-purchase"));
  fireEvent.click(screen.getByRole("button", { name: /Halo/ }));
  expect(screen.getByText(/purchase outcome is unknown/i)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Buy for/ })).toBeNull();
  expect(chain.send).toHaveBeenCalledTimes(1);
});

it("does not let a stale returned unknown relock a purchase after its failed callback", async () => {
  chain.read.mockResolvedValue(null);
  let onReceipt: OnReceipt | undefined;
  let finish!: (result: SendResult) => void;
  chain.send.mockImplementationOnce((label: string, _instructions: SendOptions["instructions"], notify?: OnReceipt) => {
    onReceipt = notify;
    notify?.({ stage: "unknown", signature: "purchase", sponsored: true, label, by: "wallet" });
    return new Promise<SendResult>((resolve) => { finish = resolve; });
  });
  render(<MarketScreen />);
  fireEvent.click(screen.getByRole("button", { name: /Halo/ }));
  await screen.findByRole("button", { name: "Buy for 0.05 SOL" });
  fireEvent.click(screen.getByRole("button", { name: "Buy for 0.05 SOL" }));
  await waitFor(() => expect(chain.send).toHaveBeenCalledTimes(1));
  await act(async () => onReceipt?.({ stage: "failed", signature: "purchase", error: "Transaction expired" }));
  await act(async () => finish(purchase("unknown")));
  await dismissItem();
  fireEvent.click(screen.getByRole("button", { name: /Halo/ }));
  await screen.findByRole("button", { name: "Buy for 0.05 SOL" });
  expect(screen.queryByText(/purchase outcome is unknown/i)).toBeNull();
  expect(chain.send).toHaveBeenCalledTimes(1);
});
