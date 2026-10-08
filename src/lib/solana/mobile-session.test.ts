import { createRequire } from "node:module";
import { afterEach, expect, it, vi } from "vitest";

const requireMobile = createRequire(import.meta.resolve("@solana-mobile/wallet-standard-mobile"));
const protocol = requireMobile.resolve("@solana-mobile/mobile-wallet-adapter-protocol");
const close = vi.fn();
const authorize = vi.fn();
const capabilities = vi.fn();
const scenario = vi.fn(async () => ({ wallet: Promise.resolve({ authorize, getCapabilities: capabilities }), close }));

async function mobile() {
  vi.stubGlobal("navigator", { userAgent: "Android Solana Mobile Web Shell" });
  const transport = async () => ({ ...await vi.importActual(protocol) as object, startScenario: scenario });
  vi.doMock(protocol.replace("/cjs/", "/esm/"), transport);
  vi.doMock(protocol, transport);
  const { LocalSolanaMobileWalletAdapterWallet } = await import("@solana-mobile/wallet-standard-mobile");
  return new LocalSolanaMobileWalletAdapterWallet({
    appIdentity: { name: "Pawket", uri: "https://pawket.world" },
    authorizationCache: { get: async () => undefined, set: async () => {}, clear: async () => {} },
    chains: ["solana:devnet"],
    chainSelector: { select: async () => "solana:devnet" },
    onWalletNotFound: async () => {},
  });
}

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

it("closes a declined session and can retry without restarting either app", async () => {
  const adapter = await mobile();
  authorize.mockRejectedValueOnce(new Error("Declined"));
  await expect(adapter.features["standard:connect"].connect()).rejects.toThrow("Declined");
  expect(close).toHaveBeenCalledOnce();
  expect(capabilities).not.toHaveBeenCalled();
  authorize.mockResolvedValue({ auth_token: "test", accounts: [] });
  capabilities.mockResolvedValue({ features: ["solana:signTransactions"], supported_transaction_versions: ["legacy"] });
  await adapter.features["standard:connect"].connect();
  expect(close).toHaveBeenCalledTimes(2);
  expect(capabilities).toHaveBeenCalledOnce();
});

it("closes an unanswered authorization and releases connection for another try", async () => {
  vi.useFakeTimers();
  const adapter = await mobile();
  authorize.mockReturnValue(new Promise(() => {}));
  const result = adapter.features["standard:connect"].connect().catch((error: Error) => error);
  await vi.advanceTimersByTimeAsync(85_001);
  expect(await result).toMatchObject({ message: expect.stringMatching(/timed out/i) });
  expect(close).toHaveBeenCalledOnce();
  expect(adapter.connected).toBe(false);
});

it("closes a hung handshake and ignores its late wallet", async () => {
  vi.useFakeTimers();
  let connect!: (value: { authorize: typeof authorize; getCapabilities: typeof capabilities }) => void;
  scenario.mockImplementationOnce(async () => ({ wallet: new Promise((resolve) => { connect = resolve; }), close }));
  const adapter = await mobile();
  const result = adapter.features["standard:connect"].connect().catch((error: Error) => error);
  await vi.advanceTimersByTimeAsync(30_001);
  expect(await result).toMatchObject({ message: expect.stringMatching(/timed out/i) });
  expect(close).toHaveBeenCalledOnce();
  connect({ authorize, getCapabilities: capabilities });
  await vi.advanceTimersByTimeAsync(1);
  expect(authorize).not.toHaveBeenCalled();
  expect(adapter.connected).toBe(false);
});

it("discards an authorization that answers after its session timed out", async () => {
  vi.useFakeTimers();
  let approve!: (value: unknown) => void;
  authorize.mockReturnValueOnce(new Promise((resolve) => { approve = resolve; }));
  const adapter = await mobile();
  const result = adapter.features["standard:connect"].connect().catch((error: Error) => error);
  await vi.advanceTimersByTimeAsync(85_001);
  expect(await result).toMatchObject({ message: expect.stringMatching(/timed out/i) });
  approve({ auth_token: "too-late", accounts: [] });
  await vi.advanceTimersByTimeAsync(1);
  expect(capabilities).not.toHaveBeenCalled();
  expect(adapter.connected).toBe(false);
});
