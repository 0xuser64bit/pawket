import * as z from "@/lib/zod";

const clusterSchema = z.enum(["devnet", "testnet", "mainnet-beta", "localnet"]);

export type SolanaCluster = z.infer<typeof clusterSchema>;

function emptyToUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

const KNOWN_RPC_HOSTS: Array<{ cluster: SolanaCluster; host: string }> = [
  { cluster: "devnet", host: "api.devnet.solana.com" },
  { cluster: "testnet", host: "api.testnet.solana.com" },
  { cluster: "mainnet-beta", host: "api.mainnet-beta.solana.com" },
];

const publicEnvSchema = z
  .object({
    appUrl: z.pipe(z.transform(emptyToUndefined), z._default(z.string(), "http://localhost:3000")),
    solanaCluster: z.pipe(z.transform(emptyToUndefined), z._default(clusterSchema, "devnet")),
    solanaRpcUrl: z.pipe(z.transform(emptyToUndefined), z._default(z.string(), "https://api.devnet.solana.com")),
  })
  .check(z.superRefine((env, ctx) => {
    let app: URL | undefined;
    try { app = new URL(env.appUrl); } catch {}
    if (!app || !["http:", "https:"].includes(app.protocol)) {
      ctx.addIssue({ code: "custom", path: ["appUrl"], message: "NEXT_PUBLIC_APP_URL must be an http(s) origin, like https://pawket.world." });
    } else if (process.env.VERCEL_ENV === "production" && (app.protocol !== "https:" || ["localhost", "127.0.0.1", "[::1]"].includes(app.hostname))) {
      ctx.addIssue({ code: "custom", path: ["appUrl"], message: "A production build needs NEXT_PUBLIC_APP_URL set to its https origin; it is written into metadata on Solana." });
    }
    let rpc: URL | undefined;
    try { rpc = new URL(env.solanaRpcUrl); } catch {}
    const publicHost = rpc && (KNOWN_RPC_HOSTS.some(({ host }) => rpc.hostname === host) ||
      ["localhost", "127.0.0.1", "[::1]"].includes(rpc.hostname));
    if (env.solanaRpcUrl !== "/api/rpc" && (!rpc || !publicHost ||
      !["http:", "https:"].includes(rpc.protocol) || rpc.username || rpc.password ||
      rpc.pathname !== "/" || rpc.search || rpc.hash)) {
      ctx.addIssue({
        code: "custom",
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
          code: "custom",
          path: ["solanaRpcUrl"],
          message: `RPC URL points at ${known.cluster} but cluster is ${env.solanaCluster}.`,
        });
      }
    }
  }));

export type PublicEnv = z.infer<typeof publicEnvSchema>;

let cachedPublicEnv: PublicEnv | null = null;

export function getPublicEnv(): PublicEnv {
  if (cachedPublicEnv) return cachedPublicEnv;
  cachedPublicEnv = publicEnvSchema.parse({
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    solanaCluster: process.env.NEXT_PUBLIC_SOLANA_CLUSTER,
    solanaRpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
  });
  return cachedPublicEnv;
}

export function __resetEnvCacheForTests() {
  cachedPublicEnv = null;
}
