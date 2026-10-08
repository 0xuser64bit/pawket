// @vitest-environment node
import {
  blockhash,
  compileTransaction,
  createTransactionMessage,
  generateKeyPairSigner,
  getBase64Encoder,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  getTransactionDecoder,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  SolanaError,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
} from "@solana/kit";
import { describe, expect, it, vi } from "vitest";
import { CONFIRMATION_TIMEOUT_MS, type TransactionStage } from "./transactions";
import { sendPawket, sendPrepared, type SendRpc } from "./send";

describe("broadcast uncertainty", () => {
  it.each(["owner", "sponsored", "prepared"])("%s preparation is shown before signing, and a timed-out signature is never sent", async (kind) => {
    const owner = await generateKeyPairSigner();
    const stages: TransactionStage[] = [];
    const lifetime = { blockhash: blockhash("11111111111111111111111111111111"), lastValidBlockHeight: 1n };
    let answer!: (value: Awaited<ReturnType<typeof owner.signTransactions>>) => void;
    const signer = { ...owner, signTransactions: () => {
      expect(stages).toEqual(["preparing", "signing"]);
      return new Promise<Awaited<ReturnType<typeof owner.signTransactions>>>((resolve) => { answer = resolve; });
    } };
    const send = vi.fn();
    const rpc = {
      getLatestBlockhash: () => ({ send: async () => { expect(stages).toEqual(["preparing"]); return { value: lifetime }; } }),
      sendTransaction: send,
    } as unknown as SendRpc;
    vi.useFakeTimers();
    try {
      const options = {
        rpc, owner: signer, sponsor: kind === "sponsored" ? owner.address : null, instructions: () => [],
        onStage: (stage: TransactionStage) => stages.push(stage),
        cosign: async (wire: string) => { expect(stages).toEqual(["preparing"]); return wire; },
      };
      const pending = kind === "prepared" ? sendPrepared({ ...options, prepare: async () => {
        expect(stages).toEqual(["preparing"]);
        return getBase64EncodedWireTransaction(compileTransaction(pipe(
          createTransactionMessage({ version: "legacy" }),
          (m) => setTransactionMessageFeePayerSigner(owner, m),
          (m) => setTransactionMessageLifetimeUsingBlockhash(lifetime, m),
        )));
      } }) : sendPawket(options);
      const refused = expect(pending).rejects.toThrow(/did not finish signing.*Nothing was sent/);
      await vi.advanceTimersByTimeAsync(150_000);
      await refused;
      answer([]);
      await Promise.resolve();
      expect(send).not.toHaveBeenCalled();
    } finally { vi.useRealTimers(); }
  });

  it("refuses a prepared coin that would charge the external wallet, before any signer is called", async () => {
    const owner = await generateKeyPairSigner();
    const device = await generateKeyPairSigner();
    const sign = vi.fn();
    const prepared = compileTransaction(pipe(
      createTransactionMessage({ version: "legacy" }),
      (m) => setTransactionMessageFeePayerSigner(owner, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash({ blockhash: blockhash("11111111111111111111111111111111"), lastValidBlockHeight: 1n }, m),
    ));
    await expect(sendPrepared({ rpc: {} as SendRpc, owner: { ...owner, signTransactions: sign }, extraSigner: { ...device, signTransactions: sign }, prepare: async () => getBase64EncodedWireTransaction(prepared), sponsored: false })).rejects.toThrow(/does not use your Pawket Wallet/);
    expect(sign).not.toHaveBeenCalled();
  });

  it("a broadcast that never replies times out and looks up the signed transaction", async () => {
    const owner = await generateKeyPairSigner();
    const timeout = AbortSignal.timeout.bind(AbortSignal);
    const budgets: number[] = [];
    const clock = vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) => {
      budgets.push(ms);
      return timeout(10);
    });
    let sent = 0;
    const rpc = {
      getLatestBlockhash: () => ({ send: async () => ({ value: {
        blockhash: "11111111111111111111111111111111", lastValidBlockHeight: 1n,
      } }) }),
      sendTransaction: () => ({ send: ({ abortSignal }: { abortSignal?: AbortSignal } = {}) => {
        sent++;
        return new Promise((_resolve, reject) => abortSignal?.addEventListener("abort", () => reject(abortSignal.reason)));
      } }),
      getSignatureStatuses: () => ({ send: async () => ({ value: [{ confirmationStatus: "confirmed", err: null }] }) }),
    } as unknown as SendRpc;
    try {
      const outcome = await Promise.race([
        sendPawket({ rpc, owner, sponsor: null, instructions: () => [] }),
        new Promise((resolve) => setTimeout(() => resolve("still waiting"), 200)),
      ]);
      expect(outcome).toMatchObject({ outcome: "confirmed" });
      expect(budgets[0]).toBe(CONFIRMATION_TIMEOUT_MS);
      expect(sent).toBe(1);
    } finally {
      clock.mockRestore();
    }
  });

  it("recovers a lost broadcast reply by its signature without sending twice", async () => {
    const owner = await generateKeyPairSigner();
    let sent = 0;
    let signature: string | undefined;
    const rpc = {
      getLatestBlockhash: () => ({ send: async () => ({ value: {
        blockhash: "11111111111111111111111111111111", lastValidBlockHeight: 1n,
      } }) }),
      sendTransaction: (wire: string, options: { preflightCommitment: string; skipPreflight?: boolean }) => ({ send: async () => {
        sent++;
        expect(options.preflightCommitment).toBe("confirmed");
        expect(options.skipPreflight).not.toBe(true);
        signature = getSignatureFromTransaction(getTransactionDecoder().decode(getBase64Encoder().encode(wire)));
        throw new TypeError("Failed to fetch");
      } }),
      getSignatureStatuses: (signatures: string[]) => ({ send: async () => {
        expect(signatures).toEqual([signature]);
        return { value: [{ confirmationStatus: "confirmed", err: null }] };
      } }),
    } as unknown as SendRpc;
    await expect(sendPawket({ rpc, owner, sponsor: null, instructions: () => [] })).resolves.toEqual({
      signature: expect.any(String), outcome: "confirmed", sponsored: false,
    });
    expect(sent).toBe(1);
  });

  it("a definitive preflight refusal fails before confirmation", async () => {
    const owner = await generateKeyPairSigner();
    const refusal = new SolanaError(SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE, {} as never);
    const rpc = {
      getLatestBlockhash: () => ({ send: async () => ({ value: {
        blockhash: "11111111111111111111111111111111", lastValidBlockHeight: 1n,
      } }) }),
      sendTransaction: () => ({ send: async () => { throw refusal; } }),
      getSignatureStatuses: () => { throw new Error("Must not confirm a refused simulation"); },
    } as unknown as SendRpc;
    await expect(sendPawket({ rpc, owner, sponsor: null, instructions: () => [] })).rejects.toBe(refusal);
  });
});
