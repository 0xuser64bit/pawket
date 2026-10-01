import type { SolanaCluster } from "@/config/env";

/** Wallet Standard chain identifiers (one client = one chain). */
export const CLUSTER_CHAINS: Record<SolanaCluster, `${string}:${string}`> = {
  devnet: "solana:devnet",
  testnet: "solana:testnet",
  "mainnet-beta": "solana:mainnet",
  localnet: "solana:localnet",
};

/** CAIP-2 ids for Solana Actions' X-Blockchain-Ids: `solana:` + the cluster's genesis hash. */
export const CLUSTER_CAIP2: Record<SolanaCluster, string> = {
  devnet: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
  testnet: "solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY",
  "mainnet-beta": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
  localnet: "solana:localnet",
};

export const DEFAULT_RPC_URLS: Record<SolanaCluster, string> = {
  devnet: "https://api.devnet.solana.com",
  testnet: "https://api.testnet.solana.com",
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
  localnet: "http://127.0.0.1:8899",
};

const EXPLORER_BASE = "https://explorer.solana.com";

function explorerClusterParam(cluster: SolanaCluster): string {
  if (cluster === "mainnet-beta") return "";
  if (cluster === "localnet") return "?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899";
  return `?cluster=${cluster}`;
}

export function explorerTxUrl(
  signature: string,
  cluster: SolanaCluster,
): string {
  return `${EXPLORER_BASE}/tx/${signature}${explorerClusterParam(cluster)}`;
}

export function explorerAddressUrl(
  addr: string,
  cluster: SolanaCluster,
): string {
  return `${EXPLORER_BASE}/address/${addr}${explorerClusterParam(cluster)}`;
}

/** Derive a WebSocket endpoint from an RPC URL unless explicitly configured. */
export function defaultWsUrl(rpcUrl: string): string {
  if (rpcUrl.startsWith("https://")) {
    return rpcUrl.replace("https://", "wss://");
  }
  if (rpcUrl.startsWith("http://")) {
    return rpcUrl.replace("http://", "ws://");
  }
  return rpcUrl;
}
