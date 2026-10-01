import "server-only";

import { z } from "zod";

/**
 * Server-only config. This module throws if it ever lands in a client
 * bundle (`server-only`). Never import it from a `"use client"` file —
 * thread server values through Server Component props instead.
 */

const optional = z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value.trim() : undefined),
  z.string().optional(),
);

const serverEnvSchema = z.object({
  /** The RPC the server reads and sends through. May carry a provider key; defaults to the public URL. */
  solanaRpcUrl: optional,
  /**
   * The sponsor's keypair, as the JSON byte array `solana-keygen` writes.
   * It pays fees and rent on devnet and signs nothing else (see
   * `src/lib/solana/sponsor.ts`). Unset turns sponsorship off: players pay
   * their own fees.
   */
  sponsorKeypair: optional,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/** Server-only config. Never import from a Client Component. */
export function getServerEnv(): ServerEnv {
  return serverEnvSchema.parse({
    solanaRpcUrl: process.env.SOLANA_RPC_URL,
    sponsorKeypair: process.env.SPONSOR_KEYPAIR,
  });
}
