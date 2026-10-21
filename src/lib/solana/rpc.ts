import {
  createDefaultRpcTransport,
  createSolanaRpcFromTransport,
  isSolanaError,
  SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR,
  type RpcTransport,
} from "@solana/kit";

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

export function createPatientRpc(url: string) {
  return createSolanaRpcFromTransport(patient(createDefaultRpcTransport({ url })));
}
