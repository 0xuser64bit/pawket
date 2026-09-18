import "server-only";

import { z } from "zod";

/**
 * Server-only config. This module throws if it ever lands in a client
 * bundle (`server-only`). Never import it from a `"use client"` file —
 * thread server values through Server Component props instead.
 */
const serverEnvSchema = z.object({
  // Reserved for future server-only secrets (RPC API keys, indexer tokens).
  // Keeping the schema means agents add secrets here instead of NEXT_PUBLIC_*.
  solanaRpcApiKey: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/** Server-only config. Never import from a Client Component. */
export function getServerEnv(): ServerEnv {
  return serverEnvSchema.parse({
    solanaRpcApiKey: process.env.SOLANA_RPC_API_KEY,
  });
}
