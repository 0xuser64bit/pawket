"use client";

import { createClient } from "@solana/kit";
import { walletWithoutSigner } from "@solana/kit-plugin-wallet";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { getPublicEnv } from "@/config/env";
import { useMounted } from "@/lib/utils/use-mounted";
import { CLUSTER_CHAINS, DEFAULT_RPC_URLS } from "./cluster";
import { createPatientRpc } from "./rpc";

/**
 * The browser's two handles on Solana, each created once: `rpc` for reads
 * and sends, and `wallet` for Wallet Standard discovery, connection and the
 * connected signer. No fee payer is installed — `send.ts` picks one per
 * transaction: the sponsor while it is up, else the owner.
 */
const env = getPublicEnv();

/**
 * The browser's RPC: the public URL, or — when it is a path, "/api/rpc" —
 * Pawket's own proxy to the server's provider, on this origin. Never called
 * while the server renders; there it is only built.
 */
function browserRpcUrl(): string {
  if (!env.solanaRpcUrl.startsWith("/")) return env.solanaRpcUrl;
  return typeof window === "undefined" ? DEFAULT_RPC_URLS[env.solanaCluster] : new URL(env.solanaRpcUrl, window.location.origin).toString();
}

export const rpc = createPatientRpc(browserRpcUrl());

export const wallet = createClient().use(
  walletWithoutSigner({ chain: CLUSTER_CHAINS[env.solanaCluster], storageKey: "pawket.wallet" }),
);

/**
 * The connected wallet, for anything drawn from it: null on the server and
 * on the browser's first render, then the wallet. The wallet store answers
 * at once in the browser, so a component that read it directly would draw
 * something the server never sent, and React would throw the page away.
 */
export function useConnected() {
  const mounted = useMounted();
  const connected = useConnectedWallet(wallet);
  return mounted ? connected : null;
}
