import { PAWKET_DEFAULT_CLUSTER, PAWKET_DEVNET_RPC_URL, PAWKET_PROGRAM_ID } from '@pawket/sdk';

export const solanaConfig = {
  cluster: PAWKET_DEFAULT_CLUSTER,
  rpcUrl: process.env.EXPO_PUBLIC_SOLANA_RPC_URL ?? PAWKET_DEVNET_RPC_URL,
  programId: PAWKET_PROGRAM_ID,
} as const;
