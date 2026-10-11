import { z } from "zod";

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
  })
  .superRefine((env, ctx) => {
    let rpc: URL | undefined;
    try { rpc = new URL(env.solanaRpcUrl); } catch { /* Invalid URLs are refused below. */ }
    const publicHost = rpc && (KNOWN_RPC_HOSTS.some(({ host }) => rpc.hostname === host) ||
      ["localhost", "127.0.0.1", "[::1]"].includes(rpc.hostname));
    // Unknown providers can put credentials anywhere in a URL; keep them behind the proxy.
    if (env.solanaRpcUrl !== "/api/rpc" && (!rpc || !publicHost ||
      !["http:", "https:"].includes(rpc.protocol) || rpc.username || rpc.password ||
      rpc.pathname !== "/" || rpc.search || rpc.hash)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["solanaRpcUrl"],
        message: "Use a public Solana endpoint, a loopback RPC, or /api/rpc. Put provider URLs in SOLANA_RPC_URL (server-only).",
      });
    }
    for (const known of KNOWN_RPC_HOSTS) {
      if (
        env.solanaCluster !== known.cluster &&
        rpc?.hostname === known.host
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
  });
  return cachedPublicEnv;
}

/** Test-only escape hatch so Vitest can re-validate with fresh inputs. */
export function __resetEnvCacheForTests() {
  cachedPublicEnv = null;
}
