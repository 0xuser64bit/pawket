import { PAWKET_PROGRAM_ID } from "./program";

/**
 * What a browser may ask Pawket's RPC proxy (`/api/rpc`): the calls the app
 * makes, one at a time, and a program scan only of Pawket's own program. The
 * proxy lets browsers read and send through the server's provider — its key
 * never leaves the server — without becoming an open RPC for anything else.
 */
export const PROXIED_METHODS: ReadonlySet<string> = new Set([
  "getAccountInfo",
  "getBalance",
  "getLatestBlockhash",
  "getMinimumBalanceForRentExemption",
  "getMultipleAccounts",
  "getProgramAccounts",
  "getSignatureStatuses",
  "getSignaturesForAddress",
  "getTokenAccountsByOwner",
  "getTransaction",
  "sendTransaction",
]);

export type ProxyCheck = { ok: true; method: string } | { ok: false; reason: string };

export function checkRpcRequest(body: unknown, programId: string = PAWKET_PROGRAM_ID): ProxyCheck {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, reason: "One JSON-RPC request at a time." };
  const { jsonrpc, method, params } = body as { jsonrpc?: unknown; method?: unknown; params?: unknown };
  if (jsonrpc !== "2.0" || typeof method !== "string") return { ok: false, reason: "That is not a JSON-RPC request." };
  if (!PROXIED_METHODS.has(method)) return { ok: false, reason: `Pawket does not ask ${method.slice(0, 40)}.` };
  if (params !== undefined && !Array.isArray(params)) return { ok: false, reason: "Params are a list." };
  const first = (params as unknown[] | undefined)?.[0];
  if (method === "getProgramAccounts" && first !== programId) return { ok: false, reason: "Only Pawket's program is scanned here." };
  if (method === "getMultipleAccounts" && (!Array.isArray(first) || first.length > 100)) {
    return { ok: false, reason: "At most 100 accounts at a time." };
  }
  return { ok: true, method };
}
