import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createNoopSigner, type Address } from "@solana/kit";
import type { PawketWalletState } from "@/lib/wallet/pawket-wallet";

const owner = "11111111111111111111111111111111" as Address;
const mock = vi.hoisted(() => ({ read: vi.fn(), refresh: vi.fn(), send: vi.fn(), record: vi.fn(), settle: vi.fn(), toast: vi.fn(), pets: vi.fn(), prepared: vi.fn(), app: false }));
vi.mock("./transactions", async (original) => ({ ...(await original<object>()), settleSignature: mock.settle }));
vi.mock("@/lib/companion/use-companion", () => ({ refreshOwnedPets: mock.pets }));
vi.mock("@/lib/analytics/events", () => ({ record: mock.record }));
vi.mock("./browser-client", () => ({ rpc: {}, PHONE_WALLETS: "Mobile Wallet Adapter", useConnected: () => ({ account: { address: "11111111111111111111111111111111" }, signer: createNoopSigner("11111111111111111111111111111111" as Address) }) }));
vi.mock("@/lib/wallet/pawket-wallet", () => ({ usePawketWallet: () => null, readPawketWallet: mock.read, refreshPawketWallet: mock.refresh }));
vi.mock("./send", () => ({ sendPawket: mock.send, sendPrepared: mock.prepared, RelayError: Error }));
vi.mock("@/lib/native/android", () => ({ haptic: vi.fn(), inAndroidApp: () => mock.app }));
vi.mock("@/components/pk/toast", () => ({ dismissToast: vi.fn(), showToast: mock.toast }));
import { CareActionType } from "@/lib/game/enums";
import { getBuyWithWalletInstruction, getCareInstruction, getDepositInstruction, getReturnFloatInstruction } from "./instructions";
import { render } from "@testing-library/react";
import { ResumeSends, usePawketSend } from "./use-send";

const empty = { owner, status: "ready", wallet: null, device: null, balance: 0n } as PawketWalletState;
afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); mock.app = false; window.sessionStorage.clear(); });
function sponsor(available = true) { vi.stubGlobal("fetch", vi.fn(async () => ({ json: async () => ({ available, address: owner }) }))); }

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
    expect(mock.send).not.toHaveBeenCalled();
    expect(second.result.current.busy).toBe(false);
  });

  it("blocks an unlinked app with a recovery message and never opens its wallet", async () => {
    sponsor(); mock.app = true; mock.read.mockResolvedValue(empty);
    const hook = renderHook(usePawketSend);
    await act(async () => { expect(await hook.result.current.act("Care", () => [])).toBeNull(); });
    expect(mock.send).not.toHaveBeenCalled();
    expect(hook.result.current.tx.error).toContain("Link this device in your Pawket Wallet");
    expect(hook.result.current.tx.needs).toBe("link");
  });

  it("uses a freshly read device even when the screen's cached wallet is still loading", async () => {
    sponsor(); mock.app = true;
    const device = createNoopSigner("So11111111111111111111111111111111111111112" as Address);
    mock.read.mockResolvedValue({ ...empty, balance: 1n, device, wallet: { address: owner, device: device.address, deviceExpiresAt: Date.now() / 1000 + 1000, actionsToday: 0, dailyActions: 100 }, paysOwnWay: false });
    mock.send.mockResolvedValue({ outcome: "confirmed", signature: "receipt", sponsored: true });
    const hook = renderHook(usePawketSend);
    await act(async () => { await hook.result.current.act("Care", () => []); });
    expect(mock.send).toHaveBeenCalledWith(expect.objectContaining({ owner: device, sponsor: owner }));
    expect(hook.result.current.tx.by).toBe("device");
  });

  it.each([
    { name: "expired link", expires: 0, actions: 0, sponsor: true, error: "Link this device", needs: "link" },
    { name: "daily limit", expires: Number.MAX_SAFE_INTEGER, actions: 100, sponsor: true, error: "today's limit", needs: "limit" },
    { name: "unfunded device without sponsorship", expires: Number.MAX_SAFE_INTEGER, actions: 0, sponsor: false, error: "needs SOL", needs: undefined },
  ])("explains $name in the app without redirecting to the owner wallet", async (entry) => {
    sponsor(entry.sponsor); mock.app = true;
    const device = createNoopSigner("So11111111111111111111111111111111111111112" as Address);
    mock.read.mockResolvedValue({ ...empty, balance: 1n, device, wallet: { address: owner, device: device.address, deviceExpiresAt: entry.expires, actionsToday: entry.actions, dailyActions: 100 }, paysOwnWay: false });
    const hook = renderHook(usePawketSend);
    await act(async () => { expect(await hook.result.current.act("Care", () => [])).toBeNull(); });
    expect(mock.send).not.toHaveBeenCalled();
    expect(hook.result.current.tx.error).toContain(entry.error);
    expect(hook.result.current.tx.needs).toBe(entry.needs);
    expect(mock.refresh).not.toHaveBeenCalled();
    expect(hook.result.current.busy).toBe(false);
  });
  it.each([false, true])("lets an empty, linked Pawket Wallet act in browser/app=%s while Pawket sponsors", async (app) => {
    sponsor(); mock.app = app;
    const device = createNoopSigner("So11111111111111111111111111111111111111112" as Address);
    mock.read.mockResolvedValue({ ...empty, linked: true, device, wallet: { address: owner, device: device.address, deviceExpiresAt: Number.MAX_SAFE_INTEGER, actionsToday: 0, dailyActions: 100 } });
    mock.send.mockResolvedValue({ outcome: "confirmed", signature: "receipt", sponsored: true });
    const hook = renderHook(usePawketSend);
    await act(async () => { await hook.result.current.act("Feed", () => []); });
    expect(mock.send).toHaveBeenCalledWith(expect.objectContaining({ owner: device, sponsor: owner }));
  });

  it.each([false, true])("asks for SOL first in browser/app=%s when Pawket is not paying and the wallet is empty", async (app) => {
    sponsor(false); mock.app = app;
    const device = createNoopSigner("So11111111111111111111111111111111111111112" as Address);
    mock.read.mockResolvedValue({ ...empty, linked: true, device, wallet: { address: owner, device: device.address, deviceExpiresAt: Number.MAX_SAFE_INTEGER, actionsToday: 0, dailyActions: 100 } });
    const hook = renderHook(usePawketSend);
    await act(async () => { expect(await hook.result.current.act("Feed", () => [])).toBeNull(); });
    expect(mock.send).not.toHaveBeenCalled();
    expect(hook.result.current.tx.error).toContain("Add SOL to your Pawket Wallet");
    expect(hook.result.current.tx.needs).toBe("fund");
  });

  it("gates a purchase but allows an explicit deposit to recover an empty wallet", async () => {
    sponsor(); mock.read.mockResolvedValue(empty);
    const hook = renderHook(usePawketSend);
    await act(async () => { await hook.result.current.send("Buy", ({ owner: signer, payer }) => [getBuyWithWalletInstruction({ owner: signer, payer, wallet: owner, closet: owner, item: 4 })]); });
    expect(mock.send).not.toHaveBeenCalled();
    expect(hook.result.current.tx.error).toContain("Link this device");
    await act(async () => { await hook.result.current.send("Deposit", ({ owner: signer }) => [getDepositInstruction({ owner: signer, wallet: owner, amount: 10_000_000n })]); });
    expect(mock.send).toHaveBeenCalledOnce();
  });

  it("counts each send by what it is and how it ended, in fixed words only", async () => {
    sponsor(); mock.app = true; mock.read.mockResolvedValue(empty);
    const hook = renderHook(usePawketSend);
    const feed: Parameters<typeof hook.result.current.act>[1] = ({ owner: signer }) => [
      getCareInstruction({ owner: signer, pet: owner, passport: owner, action: CareActionType.Feed }),
    ];
    await act(async () => { await hook.result.current.act("Feed Mango", feed); });
    expect(mock.record).toHaveBeenLastCalledWith({ name: "send_outcome", kind: "care", outcome: "needs-wallet" });
    const device = createNoopSigner("So11111111111111111111111111111111111111112" as Address);
    mock.read.mockResolvedValue({ ...empty, balance: 1n, device, wallet: { address: owner, device: device.address, deviceExpiresAt: Number.MAX_SAFE_INTEGER, actionsToday: 0, dailyActions: 100 } });
    mock.send.mockResolvedValue({ outcome: "confirmed", signature: "receipt", sponsored: true });
    await act(async () => { await hook.result.current.act("Feed Mango", feed); });
    expect(mock.record).toHaveBeenLastCalledWith({ name: "send_outcome", kind: "care", outcome: "confirmed" });
  });
  it("looks into an unknown send until Solana says how it ended, and reads the wallet again", async () => {
    sponsor(); mock.app = true;
    const device = createNoopSigner("So11111111111111111111111111111111111111112" as Address);
    mock.read.mockResolvedValue({ ...empty, balance: 1n, device, wallet: { address: owner, device: device.address, deviceExpiresAt: Number.MAX_SAFE_INTEGER, actionsToday: 0, dailyActions: 100 } });
    mock.send.mockResolvedValue({ outcome: "unknown", signature: "sig", sponsored: true, blockhash: "hash" });
    let answer!: (settled: string) => void;
    mock.settle.mockReturnValue(new Promise((resolve) => { answer = resolve; }));
    const hook = renderHook(usePawketSend);
    await act(async () => { await hook.result.current.act("Feed Mango", () => []); });
    expect(hook.result.current.tx.stage).toBe("unknown");
    expect(mock.settle).toHaveBeenCalledWith(expect.anything(), "sig", "hash");
    expect(JSON.parse(window.sessionStorage.getItem("pawket.pending-sends")!)).toMatchObject([{ signature: "sig", label: "Feed Mango" }]);
    await act(async () => { answer("confirmed"); });
    expect(hook.result.current.tx.stage).toBe("confirmed");
    expect(mock.pets).toHaveBeenCalledWith(owner);
    expect(window.sessionStorage.getItem("pawket.pending-sends")).toBeNull();
  });

  it("picks up, on a new page, a send the last one left unknown, and says it never landed", async () => {
    window.sessionStorage.setItem("pawket.pending-sends", JSON.stringify([{ signature: "lost", blockhash: "hash", label: "Feed Mango", owner }]));
    mock.settle.mockResolvedValue("expired");
    await act(async () => { render(<ResumeSends />); });
    expect(mock.settle).toHaveBeenCalledWith(expect.anything(), "lost", "hash");
    const last = mock.toast.mock.calls.at(-1)![0] as { title: string; tone: string };
    expect(last).toMatchObject({ title: "Feed Mango: it did not go through", tone: "risk" });
    expect(window.sessionStorage.getItem("pawket.pending-sends")).toBeNull();
  });
  it("retains an unresolved signature for another reload and stops claiming to confirm it", async () => {
    window.sessionStorage.setItem("pawket.pending-sends", JSON.stringify([{ signature: "unresolved", blockhash: "hash", label: "Feed Mango", owner }]));
    mock.settle.mockResolvedValueOnce("unknown");
    let first!: ReturnType<typeof render>;
    await act(async () => { first = render(<ResumeSends />); });
    expect(JSON.parse(window.sessionStorage.getItem("pawket.pending-sends")!)).toMatchObject([{ signature: "unresolved" }]);
    expect(mock.toast.mock.calls.at(-1)![0]).toMatchObject({ title: "Still waiting" });
    first.unmount();
    mock.settle.mockResolvedValueOnce("confirmed");
    await act(async () => { render(<ResumeSends />); });
    expect(mock.settle).toHaveBeenCalledTimes(2);
    expect(window.sessionStorage.getItem("pawket.pending-sends")).toBeNull();
  });
  it("words a refusal that lands after a reload by the program that raised it", async () => {
    const pawket = "PawkHvXJKfsUfKs8mgLS7FXbLuNZ43fwEFGkzYdeM74";
    const curve = "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN";
    window.sessionStorage.setItem("pawket.pending-sends", JSON.stringify([
      { signature: "theirs", blockhash: "hash", label: "Buy SEAT", owner, programs: [pawket, curve, pawket] },
      { signature: "ours", blockhash: "hash", label: "Feed Mango", owner, programs: [pawket] },
    ]));
    mock.settle.mockImplementation(async (_client: unknown, signature: string) => {
      throw Object.assign(new Error("{}"), signature === "theirs" ? { programError: 6002, instruction: 1 } : { programError: 6002, instruction: 0 });
    });
    await act(async () => { render(<ResumeSends />); });
    const said = mock.toast.mock.calls.map(([toast]) => JSON.stringify(toast));
    expect(said.some((toast) => toast.includes("Buy SEAT") && toast.includes("cooling down"))).toBe(false);
    expect(said.some((toast) => toast.includes("Feed Mango") && toast.includes("cooling down"))).toBe(true);
  });

  it("says a coin trade refused because the wallet's SOL moved meanwhile is to be quoted again", async () => {
    sponsor(); mock.app = true;
    const device = createNoopSigner("So11111111111111111111111111111111111111112" as Address);
    mock.read.mockResolvedValue({ ...empty, linked: true, balance: 1n, device, wallet: { address: owner, device: device.address, deviceExpiresAt: Number.MAX_SAFE_INTEGER, actionsToday: 0, dailyActions: 100 } });
    mock.prepared.mockRejectedValue(Object.assign(new Error("refused"), { programError: 6008 }));
    const hook = renderHook(usePawketSend);
    await act(async () => { await hook.result.current.sendFromServer("Buy SEAT", "/api/coins/seat/trade", {}, { sponsored: false }); });
    expect(hook.result.current.tx.error).toMatch(/SOL changed between the quote and your signature.*Quote it again/);
  });
  it("sends a device's own transfer home without asking the sponsor, who signs only Pawket's", async () => {
    sponsor();
    const device = await import("@solana/kit").then(({ generateKeyPairSigner }) => generateKeyPairSigner());
    mock.send.mockResolvedValue({ outcome: "confirmed", signature: "receipt", sponsored: false, blockhash: "hash" });
    const hook = renderHook(usePawketSend);
    const home = await getReturnFloatInstruction({ device, owner, lamports: 995_000n });
    await act(async () => {
      await hook.result.current.asDevice("Return the float", device, () => [home]);
    });
    expect(mock.send).toHaveBeenCalledWith(expect.objectContaining({ owner: device, sponsor: null }));
  });
});
