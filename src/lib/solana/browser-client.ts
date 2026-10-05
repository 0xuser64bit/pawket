"use client";

import { createClient } from "@solana/kit";
import { walletWithoutSigner } from "@solana/kit-plugin-wallet";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { createDefaultAuthorizationCache, createDefaultChainSelector, registerMwa } from "@solana-mobile/wallet-standard-mobile";
import { getPublicEnv } from "@/config/env";
import { APP_NAME } from "@/config/site";
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

/**
 * On Android — in Chrome, or in the Pawket app — the wallet apps on the phone
 * (Seed Vault, Phantom, Solflare…) answer through Mobile Wallet Adapter, which
 * registers as one more Wallet Standard wallet, so connecting and signing go
 * the same way as an extension's. Registered once per page, in the browser
 * only; elsewhere it would find no wallet app to open. It shows no modal of
 * its own when none is installed: the connect sheet says so.
 */
function registerPhoneWallets(): void {
  if (typeof window === "undefined" || !/android/i.test(navigator.userAgent)) return;
  const page = window as { pawketMwa?: true };
  if (page.pawketMwa) return;
  page.pawketMwa = true;
  registerMwa({
    appIdentity: { name: APP_NAME, uri: window.location.origin, icon: "/icon" },
    authorizationCache: createDefaultAuthorizationCache(),
    chains: [CLUSTER_CHAINS[env.solanaCluster]],
    chainSelector: createDefaultChainSelector(),
    onWalletNotFound: async () => {},
  });
}
registerPhoneWallets();

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
