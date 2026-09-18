import { z } from "zod";
import { PAWKET_PROGRAM_ID } from "@/lib/solana/program";

/**
 * Environment strategy.
 *
 * - `NEXT_PUBLIC_*` values are bundled into the browser. Only non-secret,
 *   client-safe configuration may use that prefix.
 * - Server-only secrets must never carry the `NEXT_PUBLIC_` prefix and must
 *   only be read in Server Components / Route Handlers via `getServerEnv()`.
 * - Safe devnet-first defaults let a fresh clone run with no secrets.
 */

const clusterSchema = z.enum(["devnet", "testnet", "mainnet-beta", "localnet"]);

export type SolanaCluster = z.infer<typeof clusterSchema>;

const publicEnvSchema = z.object({
  appUrl: z.string().default("http://localhost:3000"),
  solanaCluster: clusterSchema.default("devnet"),
  solanaRpcUrl: z.string().default("https://api.devnet.solana.com"),
  solanaWsUrl: z.string().optional(),
  pawketProgramId: z.string().default(PAWKET_PROGRAM_ID),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

const serverEnvSchema = z.object({
  // Reserved for future server-only secrets (RPC API keys, indexer tokens).
  // Keeping the schema means agents add secrets here instead of NEXT_PUBLIC_*.
  solanaRpcApiKey: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedPublicEnv: PublicEnv | null = null;

/** Client-safe config. Callable from Server and Client Components. */
export function getPublicEnv(): PublicEnv {
  if (cachedPublicEnv) return cachedPublicEnv;
  cachedPublicEnv = publicEnvSchema.parse({
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    solanaCluster: process.env.NEXT_PUBLIC_SOLANA_CLUSTER,
    solanaRpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
    solanaWsUrl: process.env.NEXT_PUBLIC_SOLANA_WS_URL,
    pawketProgramId: process.env.NEXT_PUBLIC_PAWKET_PROGRAM_ID,
  });
  return cachedPublicEnv;
}

/** Server-only config. Never import from a Client Component. */
export function getServerEnv(): ServerEnv {
  return serverEnvSchema.parse({
    solanaRpcApiKey: process.env.SOLANA_RPC_API_KEY,
  });
}

/** Test-only escape hatch so Vitest can re-validate with fresh inputs. */
export function __resetEnvCacheForTests() {
  cachedPublicEnv = null;
}
