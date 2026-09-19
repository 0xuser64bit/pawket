import type { Address } from "@solana/kit";
import { parseAddress } from "./pda";

export interface AccountSummary {
  exists: boolean;
  lamports: bigint | null;
  owner: string | null;
  dataLength: number | null;
}

interface RpcLike {
  rpc: {
    getAccountInfo: (
      addr: Address,
    ) => { send: () => Promise<{ value: unknown }> };
  };
}

/**
 * Minimal honest chain reads. We deliberately do NOT decode Pet/Passport
 * account data: the account layout lives in the Anchor program, and inventing
 * a decoder client-side would be fake behavior. Existence + owner + size is
 * what the UI needs (program-deployed checks, account-found states).
 */
export async function getAccountSummary(
  client: RpcLike,
  addr: string | Address,
  label: string,
): Promise<AccountSummary> {
  const address = parseAddress(addr, label);
  const { value } = await client.rpc.getAccountInfo(address).send();
  if (!value || typeof value !== "object") {
    return { exists: false, lamports: null, owner: null, dataLength: null };
  }
  const info = value as {
    lamports?: bigint;
    owner?: Address | string;
    data?: { length?: number } | Uint8Array | string[];
  };
  const data = info.data;
  const dataLength =
    data == null
      ? null
      : typeof (data as { length?: unknown }).length === "number"
        ? (data as { length: number }).length
        : null;
  return {
    exists: true,
    lamports: typeof info.lamports === "bigint" ? info.lamports : null,
    owner: info.owner != null ? String(info.owner) : null,
    dataLength,
  };
}

/** True when the Pawket program is actually deployed on this cluster. */
export async function isProgramDeployed(
  client: RpcLike,
  programId: string | Address,
): Promise<boolean> {
  const summary = await getAccountSummary(client, programId, "program ID");
  return summary.exists;
}
