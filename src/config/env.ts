import { z } from "zod";
import { PAWKET_PROGRAM_ID } from "@/lib/solana/program";

/**
 * Environment strategy.
 *
 * - `NEXT_PUBLIC_*` values are bundled into the browser. Only non-secret,
 *   client-safe configuration may use that prefix.
 * - Server-only secrets live in `src/config/server-env.ts` (guarded by
 *   `server-only`) and must only be read in server code.
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

/** Test-only escape hatch so Vitest can re-validate with fresh inputs. */
export function __resetEnvCacheForTests() {
  cachedPublicEnv = null;
}
