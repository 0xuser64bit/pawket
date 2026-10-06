import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createNoopSigner, type Address } from "@solana/kit";
import type { PawketWalletState } from "@/lib/wallet/pawket-wallet";

const owner = "11111111111111111111111111111111" as Address;
const mock = vi.hoisted(() => ({ read: vi.fn(), send: vi.fn(), app: false }));
vi.mock("./browser-client", () => ({ rpc: {}, useConnected: () => ({ account: { address: "11111111111111111111111111111111" }, signer: createNoopSigner("11111111111111111111111111111111" as Address) }) }));
vi.mock("@/lib/wallet/pawket-wallet", () => ({ usePawketWallet: () => null, readPawketWallet: mock.read, refreshPawketWallet: vi.fn() }));
vi.mock("./send", () => ({ sendPawket: mock.send, sendPrepared: vi.fn(), RelayError: Error }));
vi.mock("@/lib/native/android", () => ({ haptic: vi.fn(), inAndroidApp: () => mock.app }));
vi.mock("@/components/pk/toast", () => ({ dismissToast: vi.fn(), showToast: vi.fn() }));
import { usePawketSend } from "./use-send";

const empty = { owner, status: "ready", wallet: null, device: null } as PawketWalletState;
afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); mock.app = false; });
function sponsor() { vi.stubGlobal("fetch", vi.fn(async () => ({ json: async () => ({ available: true, address: owner }) }))); }

describe("send routing (no wallet signing)", () => {
  it("holds one shared send slot while the device read is pending, including across screens", async () => {
    sponsor();
    let finishRead!: (state: PawketWalletState) => void;
    mock.read.mockReturnValue(new Promise<PawketWalletState>((resolve) => { finishRead = resolve; }));
    mock.send.mockResolvedValue({ outcome: "confirmed", signature: "receipt", sponsored: true });
    const first = renderHook(usePawketSend);
    const second = renderHook(usePawketSend);
    await act(async () => {
      const pending = first.result.current.act("Care", () => []);
      expect(await second.result.current.act("Care again", () => [])).toBeNull();
      expect(await second.result.current.send("Buy", () => [])).toBeNull();
      finishRead(empty);
      await pending;
    });
    expect(mock.send).toHaveBeenCalledTimes(1);
    expect(second.result.current.busy).toBe(false);
  });

  it("blocks an unlinked app with a recovery message and never opens its wallet", async () => {
    sponsor(); mock.app = true; mock.read.mockResolvedValue(empty);
    const hook = renderHook(usePawketSend);
    await act(async () => { expect(await hook.result.current.act("Care", () => [])).toBeNull(); });
    expect(mock.send).not.toHaveBeenCalled();
    expect(hook.result.current.tx.error).toContain("Link this app in your Pawket Wallet");
  });

  it("uses a freshly read device even when the screen's cached wallet is still loading", async () => {
    sponsor(); mock.app = true;
    const device = createNoopSigner("So11111111111111111111111111111111111111112" as Address);
    mock.read.mockResolvedValue({ ...empty, device, wallet: { address: owner, device: device.address, deviceExpiresAt: Date.now() / 1000 + 1000, actionsToday: 0, dailyActions: 100 }, paysOwnWay: false });
    mock.send.mockResolvedValue({ outcome: "confirmed", signature: "receipt", sponsored: true });
    const hook = renderHook(usePawketSend);
    await act(async () => { await hook.result.current.act("Care", () => []); });
    expect(mock.send).toHaveBeenCalledWith(expect.objectContaining({ owner: device, sponsor: owner }));
    expect(hook.result.current.tx.by).toBe("device");
  });
});
