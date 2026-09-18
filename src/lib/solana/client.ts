import { createClient } from "@solana/kit";
import { solanaRpc } from "@solana/kit-plugin-rpc";
import { walletSigner } from "@solana/kit-plugin-wallet";
import { CLUSTER_CHAINS } from "./cluster";
import type { SolanaCluster } from "@/config/env";

export interface PawketClientOptions {
  cluster: SolanaCluster;
  rpcUrl: string;
}

/**
 * Creates the single wallet-backed Solana client for the browser.
 *
 * - `walletSigner` makes the connected Wallet Standard wallet both fee payer
 *   and identity (the common case) and is SSR-safe.
 * - `solanaRpc` adds `client.rpc` plus `client.sendTransaction`.
 * - Order matters: signer plugin first, RPC second.
 *
 * Create once at module scope in `app/providers.tsx` and publish via
 * `ClientProvider`. Server Components needing reads should use a plain RPC
 * client instead (no wallet plugin).
 */
export function createPawketClient(options: PawketClientOptions) {
  const chain = CLUSTER_CHAINS[options.cluster];
  return createClient()
    .use(walletSigner({ chain: chain as "solana:devnet" }))
    .use(solanaRpc({ rpcUrl: options.rpcUrl as `https://${string}` }));
}

export type PawketClient = Awaited<ReturnType<typeof createPawketClient>>;
