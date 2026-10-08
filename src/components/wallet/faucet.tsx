import { getPublicEnv } from "@/config/env";

/** Where devnet SOL comes from, as a link to follow — said only on devnet. */
export function DevnetFaucet() {
  if (getPublicEnv().solanaCluster !== "devnet") return null;
  return (
    <>
      {" "}
      Devnet SOL is free at{" "}
      <a href="https://faucet.solana.com" target="_blank" rel="noreferrer">
        faucet.solana.com
      </a>
      .
    </>
  );
}
