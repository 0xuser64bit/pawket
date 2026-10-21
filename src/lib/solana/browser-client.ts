"use client";

import { createClient } from "@solana/kit";
import { walletWithoutSigner } from "@solana/kit-plugin-wallet";
import { useConnectedWallet, useIsWalletReady } from "@solana/kit-plugin-wallet/react";
import { getPublicEnv } from "@/config/env";
import { APP_NAME } from "@/config/site";
import { useMounted } from "@/lib/utils/use-mounted";
import { CLUSTER_CHAINS, DEFAULT_RPC_URLS } from "./cluster";
import { createPatientRpc } from "./rpc";

const env = getPublicEnv();

function browserRpcUrl(): string {
  if (!env.solanaRpcUrl.startsWith("/")) return env.solanaRpcUrl;
  return typeof window === "undefined" ? DEFAULT_RPC_URLS[env.solanaCluster] : new URL(env.solanaRpcUrl, window.location.origin).toString();
}

export const rpc = createPatientRpc(browserRpcUrl());

function registerPhoneWallets(): void {
  if (typeof window === "undefined" || !/android/i.test(navigator.userAgent)) return;
  const page = window as { pawketMwa?: true };
  if (page.pawketMwa) return;
  page.pawketMwa = true;
  void import("@solana-mobile/wallet-standard-mobile").then(
    ({ createDefaultAuthorizationCache, createDefaultChainSelector, registerMwa }) =>
      registerMwa({
        appIdentity: { name: APP_NAME, uri: window.location.origin, icon: "/icon" },
        authorizationCache: createDefaultAuthorizationCache(),
        chains: [CLUSTER_CHAINS[env.solanaCluster]],
        chainSelector: createDefaultChainSelector(),
        onWalletNotFound: async () => {},
      }),
    () => delete page.pawketMwa,
  );
}
registerPhoneWallets();

export const PHONE_WALLETS = "Mobile Wallet Adapter";

export function stopWaitingForPhoneWallet(): void {
  window.dispatchEvent(new Event("pawket:wallet-cancel"));
}

export const wallet = createClient().use(
  walletWithoutSigner({ chain: CLUSTER_CHAINS[env.solanaCluster], storageKey: "pawket.wallet" }),
);

export function useConnected() {
  const mounted = useMounted();
  const connected = useConnectedWallet(wallet);
  return mounted ? connected : null;
}

export function useWalletReady(): boolean {
  const mounted = useMounted();
  const ready = useIsWalletReady(wallet);
  return mounted && ready;
}
