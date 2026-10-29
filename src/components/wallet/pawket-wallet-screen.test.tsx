import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Address } from "@solana/kit";
import { expect, it, vi } from "vitest";
import type { WalletEntry } from "@/lib/wallet/history";
import type { PawketWalletState } from "@/lib/wallet/pawket-wallet";
import { History } from "./pawket-wallet-screen";

const OWNER = "4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T" as Address;
const SPONSOR = "6sbzC1eH4FTujJXWj51eQe25cYvr4xfXbJ1vAj7j2k5J" as Address;
const DEVICE = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS" as Address;
const mock = vi.hoisted(() => ({
  older: vi.fn(),
  rent: () => 0n,
  first: [] as WalletEntry[],
  sponsor: { data: undefined } as { data?: { address: Address } },
}));
vi.mock("@/lib/solana/browser-client", () => ({ rpc: {}, wallet: {}, useWalletReady: () => true }));
vi.mock("@/lib/solana/use-send", () => ({ usePawketSend: () => null, useSponsor: () => mock.sponsor }));
vi.mock("@/lib/companion/use-companion", () => ({ useCompanion: () => ({ owned: [] }) }));
vi.mock("@/lib/wallet/history", () => ({ fetchWalletHistory: mock.older }));
vi.mock("@/lib/wallet/pawket-wallet", () => ({ rentOfWallet: mock.rent }));
vi.mock("@solana/react", () => ({
  useRequest: (read: unknown) =>
    read === null ? { status: "idle" } : { status: "success", data: read === mock.rent ? 0n : { entries: mock.first, next: "newest" } },
}));

function entry(signature: string, change: bigint): WalletEntry {
  return { signature, at: null, kinds: ["deposit"], change, amount: change, fee: 5_000n, feePayer: OWNER, ok: true };
}

const state = { owner: OWNER, wallet: { address: "Wa11et1111111111111111111111111111111111111", actions: 0, deposited: 0n, withdrawn: 0n, spent: 0n, device: DEVICE } } as unknown as PawketWalletState;

it("says when the older history could not be read, and reads it on the next try", async () => {
  mock.first = [entry("newest", 2n)];
  mock.sponsor = { data: undefined };
  mock.older.mockRejectedValueOnce(new Error("429")).mockResolvedValueOnce({ entries: [entry("older", 3n)], next: null });
  render(<History state={state} owner={OWNER} now={0} />);
  fireEvent.click(screen.getByRole("button", { name: "Older" }));
  await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/older history could not be read/));
  fireEvent.click(screen.getByRole("button", { name: "Older" }));
  await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(2));
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.queryByRole("button", { name: "Older" })).toBeNull();
});

it("reads older history as this owner's and this device's", async () => {
  mock.first = [entry("newest", 2n)];
  mock.older.mockReset().mockResolvedValueOnce({ entries: [], next: null });
  render(<History state={state} owner={OWNER} now={0} />);
  fireEvent.click(screen.getByRole("button", { name: "Older" }));
  await waitFor(() => expect(mock.older).toHaveBeenCalledOnce());
  expect(mock.older.mock.calls[0][1]).toBe(state.wallet!.address);
  expect(mock.older.mock.calls[0][2]).toMatchObject({ before: "newest", owner: OWNER, device: DEVICE });
});

it("says who paid each fee, and that a refused one never touched the balance", () => {
  mock.sponsor = { data: { address: SPONSOR } };
  mock.first = [
    { ...entry("device", -5_000n), kinds: ["care"], feePayer: DEVICE },
    { ...entry("refused", 0n), kinds: ["care"], feePayer: DEVICE, ok: false },
    { ...entry("sponsored", 0n), kinds: ["care"], feePayer: SPONSOR },
  ];
  render(<History state={state} owner={OWNER} now={0} />);
  const [paid, refused, sponsored] = screen.getAllByRole("listitem").map((row) => row.textContent);
  expect(paid).toMatch(/fee paid by a device, from your balance/);
  expect(refused).toMatch(/fee paid by a device · refused, nothing changed/);
  expect(refused).not.toMatch(/from your balance/);
  expect(sponsored).toMatch(/fee paid by Pawket/);
});
