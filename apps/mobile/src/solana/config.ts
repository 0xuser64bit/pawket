export const solanaConfig = {
  cluster: 'devnet',
  rpcUrl: process.env.EXPO_PUBLIC_SOLANA_RPC_URL ?? 'https://api.devnet.solana.com',
} as const;
