// @vitest-environment node
import {
  generateKeyPairSigner,
  getBase64Encoder,
  getSignatureFromTransaction,
  getTransactionDecoder,
  SolanaError,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
} from "@solana/kit";
import { describe, expect, it, vi } from "vitest";
import { CONFIRMATION_TIMEOUT_MS } from "./transactions";
import { sendPawket, type SendRpc } from "./send";

describe("broadcast uncertainty", () => {
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
