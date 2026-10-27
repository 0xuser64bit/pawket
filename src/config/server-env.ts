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
  derivationSecret: optional,
  collectionAuthorityKeypair: optional,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(): ServerEnv {
  return serverEnvSchema.parse({
    solanaRpcUrl: process.env.SOLANA_RPC_URL,
    sponsorKeypair: process.env.SPONSOR_KEYPAIR,
    derivationSecret: process.env.DERIVATION_SECRET,
    collectionAuthorityKeypair: process.env.COLLECTION_AUTHORITY_KEYPAIR,
  });
}

/** A keypair variable's 64 bytes. A malformed one is refused by name only: JSON.parse's own message quotes its input. */
export function keypairBytes(name: "SPONSOR_KEYPAIR" | "COLLECTION_AUTHORITY_KEYPAIR", json: string): Uint8Array {
  let bytes: unknown;
  try {
    bytes = JSON.parse(json);
  } catch {}
  if (!Array.isArray(bytes) || bytes.length !== 64 || !bytes.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255)) {
    throw new Error(`${name} is not a keypair: a JSON array of 64 bytes.`);
  }
  return Uint8Array.from(bytes as number[]);
}

export function serverRpcUrl(): string {
  const own = getServerEnv().solanaRpcUrl;
  if (own) return own;
  const { solanaRpcUrl, solanaCluster } = getPublicEnv();
  return solanaRpcUrl.startsWith("/") ? DEFAULT_RPC_URLS[solanaCluster] : solanaRpcUrl;
}
