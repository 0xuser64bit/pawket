import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Address } from "@solana/kit";
import { expect, it, vi } from "vitest";
import type { WalletEntry } from "@/lib/wallet/history";
import type { PawketWalletState } from "@/lib/wallet/pawket-wallet";
import { History } from "./pawket-wallet-screen";

const OWNER = "4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T" as Address;
const mock = vi.hoisted(() => ({ older: vi.fn(), rent: () => 0n }));
vi.mock("@/lib/solana/browser-client", () => ({ rpc: {}, wallet: {}, useWalletReady: () => true }));
vi.mock("@/lib/solana/use-send", () => ({ usePawketSend: () => null, useSponsor: () => ({ data: undefined }) }));
vi.mock("@/lib/companion/use-companion", () => ({ useCompanion: () => ({ owned: [] }) }));
vi.mock("@/lib/wallet/history", () => ({ fetchWalletHistory: mock.older }));
vi.mock("@/lib/wallet/pawket-wallet", () => ({ rentOfWallet: mock.rent }));
// The rent and the first page, already read.
vi.mock("@solana/react", () => ({
  useRequest: (read: unknown) =>
    read === null ? { status: "idle" } : { status: "success", data: read === mock.rent ? 0n : { entries: [entry("newest", 2n)], next: "newest" } },
}));

function entry(signature: string, change: bigint): WalletEntry {
  return { signature, at: null, kinds: ["deposit"], change, amount: change, fee: 5_000n, feePayer: OWNER, ok: true };
}

const state = { owner: OWNER, wallet: { address: "Wa11et1111111111111111111111111111111111111", actions: 0, deposited: 0n, withdrawn: 0n, spent: 0n, device: OWNER } } as unknown as PawketWalletState;

it("says when the older history could not be read, and reads it on the next try", async () => {
  mock.older.mockRejectedValueOnce(new Error("429")).mockResolvedValueOnce({ entries: [entry("older", 3n)], next: null });
  render(<History state={state} owner={OWNER} now={0} />);
  fireEvent.click(screen.getByRole("button", { name: "Older" }));
  await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/older history could not be read/));
  fireEvent.click(screen.getByRole("button", { name: "Older" }));
  await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(2));
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.queryByRole("button", { name: "Older" })).toBeNull();
});
