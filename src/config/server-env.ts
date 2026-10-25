import "server-only";

import { z } from "zod";
import { DEFAULT_RPC_URLS } from "@/lib/solana/cluster";
import { getPublicEnv } from "./env";

const optional = z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value.trim() : undefined),
  z.string().optional(),
);

const serverEnvSchema = z.object({
  solanaRpcUrl: optional,
  sponsorKeypair: optional,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(): ServerEnv {
  return serverEnvSchema.parse({
    solanaRpcUrl: process.env.SOLANA_RPC_URL,
    sponsorKeypair: process.env.SPONSOR_KEYPAIR,
  });
}

export function serverRpcUrl(): string {
  const own = getServerEnv().solanaRpcUrl;
  if (own) return own;
  const { solanaRpcUrl, solanaCluster } = getPublicEnv();
  return solanaRpcUrl.startsWith("/") ? DEFAULT_RPC_URLS[solanaCluster] : solanaRpcUrl;
}
