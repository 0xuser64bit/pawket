"use client";

import { createClient, createSolanaRpc } from "@solana/kit";
import { walletWithoutSigner } from "@solana/kit-plugin-wallet";
import { getPublicEnv } from "@/config/env";
import { CLUSTER_CHAINS } from "./cluster";

/**
 * The browser's two handles on Solana, each created once: `rpc` for reads
 * and sends, and `wallet` for Wallet Standard discovery, connection and the
 * connected signer. No fee payer is installed — `send.ts` picks one per
 * transaction: the sponsor while it is up, else the owner.
 */
const env = getPublicEnv();

export const rpc = createSolanaRpc(env.solanaRpcUrl);

export const wallet = createClient().use(
  walletWithoutSigner({ chain: CLUSTER_CHAINS[env.solanaCluster], storageKey: "pawket.wallet" }),
);
