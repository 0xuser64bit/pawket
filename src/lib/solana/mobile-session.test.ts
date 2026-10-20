import { createRequire } from "node:module";
import { afterEach, expect, it, vi } from "vitest";
import { mobileWalletErrorCode } from "./transactions";

const requireMobile = createRequire(import.meta.resolve("@solana-mobile/wallet-standard-mobile"));
const protocol = requireMobile.resolve("@solana-mobile/mobile-wallet-adapter-protocol");
const close = vi.fn();
const authorize = vi.fn();
const capabilities = vi.fn();
const signTransactions = vi.fn();
const scenario = vi.fn(async () => ({ wallet: Promise.resolve({ authorize, getCapabilities: capabilities, signTransactions }), close }));
/** One account, as a wallet names it (base64), and the same account as Wallet Standard does. */
const ACCOUNT = { address: Buffer.alloc(32, 1).toString("base64") };
const OTHER = { address: Buffer.alloc(32, 2).toString("base64") };
const refused = () => Object.assign(new Error("authorization request failed"), { name: "SolanaMobileWalletAdapterProtocolError", code: -1 });

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
  expect(await result).toMatchObject({ message: expect.stringMatching(/timed out|in time/i) });
  expect(close).toHaveBeenCalledOnce();
  expect(adapter.connected).toBe(false);
});

it("closes a hung handshake and ignores its late wallet", async () => {
  vi.useFakeTimers();
  let connect!: (value: { authorize: typeof authorize; getCapabilities: typeof capabilities; signTransactions: typeof signTransactions }) => void;
  scenario.mockImplementationOnce(async () => ({ wallet: new Promise((resolve) => { connect = resolve; }), close }));
  const adapter = await mobile();
  const result = adapter.features["standard:connect"].connect().catch((error: Error) => error);
  // A wallet app still starting, or waiting to be unlocked, gets a minute to answer.
  await vi.advanceTimersByTimeAsync(30_001);
  expect(close).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(30_000);
  expect(await result).toMatchObject({ message: expect.stringMatching(/timed out|in time/i) });
  expect(close).toHaveBeenCalledOnce();
  connect({ authorize, getCapabilities: capabilities, signTransactions });
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
  expect(await result).toMatchObject({ message: expect.stringMatching(/timed out|in time/i) });
  approve({ auth_token: "too-late", accounts: [] });
  await vi.advanceTimersByTimeAsync(1);
  expect(capabilities).not.toHaveBeenCalled();
  expect(adapter.connected).toBe(false);
});

async function connected() {
  const adapter = await mobile();
  authorize.mockResolvedValueOnce({ auth_token: "issued", accounts: [ACCOUNT] });
  capabilities.mockResolvedValue({ features: ["solana:signTransactions"], supported_transaction_versions: ["legacy", 0] });
  await adapter.features["standard:connect"].connect();
  return adapter;
}

const sign = (adapter: Awaited<ReturnType<typeof mobile>>) =>
  (adapter.features as unknown as Record<string, { signTransaction: (input: { transaction: Uint8Array }) => Promise<Array<{ signedTransaction: Uint8Array }>> }>)["solana:signTransaction"]
    .signTransaction({ transaction: new Uint8Array([7]) });

it("signs with the wallet's own token while it is young", async () => {
  const adapter = await connected();
  authorize.mockResolvedValueOnce({ auth_token: "renewed", accounts: [ACCOUNT] });
  signTransactions.mockResolvedValueOnce({ signed_payloads: [Buffer.from([7, 7]).toString("base64")] });
  const [{ signedTransaction }] = await sign(adapter);
  expect([...signedTransaction]).toEqual([7, 7]);
  expect(authorize).toHaveBeenNthCalledWith(2, expect.objectContaining({ auth_token: "issued" }));
  expect(close).toHaveBeenCalledTimes(2);
});

it("ends the visit when the wallet refuses its token, then asks afresh and signs in the next one", async () => {
  const adapter = await connected();
  authorize.mockRejectedValueOnce(refused());
  // Phantom and Solflare can show nothing for a second ask in the same visit: none is made.
  const refusal = await sign(adapter).catch((error: Error) => error);
  expect(mobileWalletErrorCode(refusal)).toBe("ERROR_REAUTHORIZE");
  expect(authorize).toHaveBeenCalledTimes(2);
  expect(signTransactions).not.toHaveBeenCalled();
  expect(close).toHaveBeenCalledTimes(2);
  expect(adapter.connected).toBe(true);

  authorize.mockResolvedValueOnce({ auth_token: "fresh", accounts: [ACCOUNT] });
  signTransactions.mockResolvedValueOnce({ signed_payloads: [Buffer.from([7, 7]).toString("base64")] });
  const [{ signedTransaction }] = await sign(adapter);
  expect([...signedTransaction]).toEqual([7, 7]);
  expect(authorize.mock.calls[2][0]).not.toHaveProperty("auth_token");
  expect(close).toHaveBeenCalledTimes(3);
});

it("asks afresh, never sending a token old enough for the wallet to have dropped it", async () => {
  vi.useFakeTimers();
  const adapter = await connected();
  await vi.advanceTimersByTimeAsync(46 * 60_000);
  authorize.mockResolvedValueOnce({ auth_token: "fresh", accounts: [ACCOUNT] });
  signTransactions.mockResolvedValueOnce({ signed_payloads: [Buffer.from([7, 7]).toString("base64")] });
  await sign(adapter);
  expect(authorize).toHaveBeenCalledTimes(2);
  expect(authorize.mock.calls[1][0]).not.toHaveProperty("auth_token");
  expect(close).toHaveBeenCalledTimes(2);
});

it("signs nothing when the wallet answers a fresh ask for another account", async () => {
  vi.useFakeTimers();
  const adapter = await connected();
  await vi.advanceTimersByTimeAsync(46 * 60_000);
  authorize.mockResolvedValueOnce({ auth_token: "fresh", accounts: [OTHER] });
  await expect(sign(adapter)).rejects.toThrow(/different account/);
  expect(signTransactions).not.toHaveBeenCalled();
  expect(close).toHaveBeenCalledTimes(2);
  expect(adapter.connected).toBe(false);
});

it("lets the page end a visit the wallet never answers, and the next asks afresh", async () => {
  const adapter = await connected();
  authorize.mockReturnValueOnce(new Promise(() => {}));
  const result = sign(adapter).catch((error: Error) => error);
  await vi.waitFor(() => expect(authorize).toHaveBeenCalledTimes(2));
  window.dispatchEvent(new Event("pawket:wallet-cancel"));
  const error = await result;
  expect(error).toMatchObject({ message: expect.stringMatching(/cancelled by user/) });
  expect(close).toHaveBeenCalledTimes(2);
  expect(signTransactions).not.toHaveBeenCalled();

  authorize.mockResolvedValueOnce({ auth_token: "fresh", accounts: [ACCOUNT] });
  signTransactions.mockResolvedValueOnce({ signed_payloads: [Buffer.from([7]).toString("base64")] });
  await sign(adapter);
  expect(authorize.mock.calls[2][0]).not.toHaveProperty("auth_token");
});
