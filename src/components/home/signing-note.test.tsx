import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { Address, KeyPairSigner } from "@solana/kit";
import type { PawketWalletState } from "@/lib/wallet/pawket-wallet";

vi.mock("@/lib/solana/browser-client", () => ({ rpc: {}, useConnected: () => null }));
const sponsor = vi.hoisted(() => ({ data: { available: false } as { available: boolean } | undefined }));
vi.mock("@/lib/solana/use-send", async (original) => ({ ...(await original<object>()), useSponsor: () => sponsor }));
import { SigningNote } from "./signing-note";

const device = { address: "Device1111111111111111111111111111111111111" } as KeyPairSigner;
const ready = (wallet: Partial<NonNullable<PawketWalletState["wallet"]>> | null, balance = 1n): PawketWalletState => ({
  owner: "Owner11111111111111111111111111111111111111" as Address,
  status: "ready",
  wallet: wallet ? ({ device: device.address, deviceExpiresAt: Date.now() / 1000 + 3600, actionsToday: 0, dailyActions: 100, ...wallet } as NonNullable<PawketWalletState["wallet"]>) : null,
  balance,
  device,
  deviceLamports: 0n,
  linked: true,
  canAct: true,
  paysOwnWay: false,
});

it("says nothing while this device can sign, or while the wallet is still being read", () => {
  const { container, rerender } = render(<SigningNote state={ready({})} name="Mango" />);
  expect(container.textContent).toBe("");
  rerender(<SigningNote state={{ ...ready({}), status: "loading" }} name="Mango" />);
  expect(container.textContent).toBe("");
  rerender(<SigningNote state={null} name="Mango" />);
  expect(container.textContent).toBe("");
});

it.each([
  ["not linked here", ready(null), /signed by a linked browser/, "Link this browser"],
  ["its link ran out", ready({ deviceExpiresAt: 1 }), /link ran out/, "Link it again"],
  ["today's limit is used", ready({ actionsToday: 100 }), /used today's limit/, "Change it"],
  ["the balance is empty while Pawket is not paying", ready({}, 0n), /Pawket Wallet is empty/, "Add a little SOL"],
])("says why before a tap when %s, with the way to fix it", (_case, state, line, fix) => {
  sponsor.data = { available: false };
  render(<SigningNote state={state} name="Mango" />);
  expect(screen.getByText(line)).toBeTruthy();
  expect(screen.getByRole("link", { name: fix }).getAttribute("href")).toBe("/wallet");
});

it("asks for no SOL while Pawket sponsors, or before the sponsor has answered", () => {
  sponsor.data = { available: true };
  const { container, rerender } = render(<SigningNote state={ready({}, 0n)} name="Mango" />);
  expect(container.textContent).toBe("");
  sponsor.data = undefined;
  rerender(<SigningNote state={ready({}, 0n)} name="Mango" />);
  expect(container.textContent).toBe("");
});
