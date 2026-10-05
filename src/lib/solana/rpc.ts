import {
  createDefaultRpcTransport,
  createSolanaRpcFromTransport,
  isSolanaError,
  SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR,
  type RpcTransport,
} from "@solana/kit";

/**
 * A transport that waits and asks again when the node says "too many
 * requests" (HTTP 429). The public devnet endpoint allows an address about
 * forty calls of one kind every ten seconds, and a burst — a page of a
 * Pawket Wallet's history, a test suite, a crowd at one venue — can meet
 * it. Up to `tries` attempts in all — about fifteen seconds of waiting
 * before it gives up — waiting as the node asks (`Retry-After`) or half a
 * second, then twice as long each time. Any other
 * failure passes straight through. Asking again is safe for every call
 * Pawket makes, a send included: a signed transaction lands at most once.
 */
export function patient(
  transport: RpcTransport,
  { tries = 6, wait = (attempt: number) => 500 * 2 ** attempt }: { tries?: number; wait?: (attempt: number) => number } = {},
): RpcTransport {
  return async (request) => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await transport(request);
      } catch (error) {
        if (!isSolanaError(error, SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR) || error.context.statusCode !== 429) throw error;
        if (attempt >= tries - 1) throw error;
        const asked = Number(error.context.headers?.get?.("retry-after"));
        const ms = Number.isFinite(asked) && asked > 0 ? Math.min(asked * 1000, 8_000) : wait(attempt);
        await new Promise((resolve) => setTimeout(resolve, ms));
      }
    }
  };
}

/** Kit's Solana RPC for `url`, with a patient transport. */
export function createPatientRpc(url: string) {
  return createSolanaRpcFromTransport(patient(createDefaultRpcTransport({ url })));
}
