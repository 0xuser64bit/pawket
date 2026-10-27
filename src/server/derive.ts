import "server-only";

import { createHmac } from "node:crypto";
import { getServerEnv, keypairBytes } from "@/config/server-env";

export function derivedSeed(label: string): Buffer | null {
  const { derivationSecret, sponsorKeypair } = getServerEnv();
  let secret: Uint8Array;
  if (derivationSecret) {
    if (!/^[0-9a-f]{64}$/i.test(derivationSecret)) {
      throw new Error("DERIVATION_SECRET is 64 hex characters: the 32 bytes keepsake and coin addresses come from.");
    }
    secret = Buffer.from(derivationSecret, "hex");
  } else if (sponsorKeypair) {
    secret = keypairBytes("SPONSOR_KEYPAIR", sponsorKeypair).subarray(0, 32);
  } else {
    return null;
  }
  return createHmac("sha256", secret).update(label).digest();
}
