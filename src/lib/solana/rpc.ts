import {
  createDefaultRpcTransport,
  createSolanaRpcFromTransport,
  isSolanaError,
  SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR,
  type RpcTransport,
} from "@solana/kit";

function waitForRetry(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted();
    const cancelled = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancelled);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", cancelled);
      resolve();
    }, ms);
    signal?.addEventListener("abort", cancelled, { once: true });
  });
}

export function patient(
  transport: RpcTransport,
  { tries = 6, wait = (attempt: number) => 500 * 2 ** attempt }: { tries?: number; wait?: (attempt: number) => number } = {},
): RpcTransport {
  return async (request) => {
    for (let attempt = 0; ; attempt++) {
      request.signal?.throwIfAborted();
      try {
        return await transport(request);
      } catch (error) {
        if (!isSolanaError(error, SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR) || error.context.statusCode !== 429) throw error;
        if (attempt >= tries - 1) throw error;
        const asked = Number(error.context.headers?.get?.("retry-after"));
        const ms = Number.isFinite(asked) && asked > 0 ? Math.min(asked * 1000, 8_000) : wait(attempt);
        await waitForRetry(ms, request.signal);
      }
    }
  };
}

export function createPatientRpc(url: string) {
  return createSolanaRpcFromTransport(patient(createDefaultRpcTransport({ url })));
}
