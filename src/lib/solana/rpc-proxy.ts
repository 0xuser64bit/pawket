import { getBase58Decoder } from "@solana/kit";
import { PAWKET_ACCOUNTS, PAWKET_PROGRAM_ID } from "./program";

const KINDS: ReadonlySet<string> = new Set(
  Object.values(PAWKET_ACCOUNTS).map((account) => getBase58Decoder().decode(Uint8Array.from(account.discriminator))),
);

function namesAKind(config: unknown): boolean {
  const filters = (config as { filters?: unknown } | null)?.filters;
  if (!Array.isArray(filters)) return false;
  return filters.some((filter) => {
    const memcmp = (filter as { memcmp?: { offset?: unknown; bytes?: unknown } } | null)?.memcmp;
    return memcmp !== undefined && Number(memcmp.offset) === 0 && typeof memcmp.bytes === "string" && KINDS.has(memcmp.bytes);
  });
}

const PROXIED_METHODS: ReadonlySet<string> = new Set([
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
  "isBlockhashValid",
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
  if (method === "getProgramAccounts" && !namesAKind((params as unknown[])[1])) {
    return { ok: false, reason: "A scan names one of Pawket's account kinds." };
  }
  if (method === "getMultipleAccounts" && (!Array.isArray(first) || first.length > 100)) {
    return { ok: false, reason: "At most 100 accounts at a time." };
  }
  return { ok: true, method };
}
