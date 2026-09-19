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

/** Empty / whitespace-only env values fall back to defaults (fail-safe). */
function emptyToUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

function isValidSolanaAddress(value: string): boolean {
  // Base58, 32–44 chars — the shape of every Solana address. Full
  // byte-level validation happens in `parseAddress` at the use site.
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
}

/** Well-known public RPC hosts per cluster — used only to catch misroutes. */
const KNOWN_RPC_HOSTS: Array<{ cluster: SolanaCluster; host: string }> = [
  { cluster: "devnet", host: "api.devnet.solana.com" },
  { cluster: "testnet", host: "api.testnet.solana.com" },
  { cluster: "mainnet-beta", host: "api.mainnet-beta.solana.com" },
];

const publicEnvSchema = z
  .object({
    appUrl: z.preprocess(emptyToUndefined, z.string().default("http://localhost:3000")),
    solanaCluster: z.preprocess(
      emptyToUndefined,
      clusterSchema.default("devnet"),
    ),
    solanaRpcUrl: z.preprocess(
      emptyToUndefined,
      z.string().default("https://api.devnet.solana.com"),
    ),
    solanaWsUrl: optionalString,
    pawketProgramId: z.preprocess(
      emptyToUndefined,
      z.string().default(PAWKET_PROGRAM_ID),
    ),
  })
  .superRefine((env, ctx) => {
    if (!isValidSolanaAddress(env.pawketProgramId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pawketProgramId"],
        message: "Not a valid Solana address.",
      });
    }
    for (const known of KNOWN_RPC_HOSTS) {
      if (
        env.solanaCluster !== known.cluster &&
        env.solanaRpcUrl.includes(known.host)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["solanaRpcUrl"],
          message: `RPC URL points at ${known.cluster} but cluster is ${env.solanaCluster}.`,
        });
      }
    }
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
