/**
 * Creates Pawket's keepsake collection on a cluster, once. The sponsor is its
 * update authority (it signs each keepsake into the collection) and pays.
 *
 *   pnpm dlx tsx scripts/keepsake-collection.mts https://pawket-pets.vercel.app
 *
 * Reads .keys/sponsor.json and prints the collection's address, for
 * `PAWKET_COLLECTION` in src/lib/solana/core.ts. The collection's own key
 * signs its creation and is never needed again, so it is not kept.
 */
import { readFileSync } from "node:fs";
import {
  appendTransactionMessageInstructions,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createTransactionMessage,
  generateKeyPairSigner,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import { getCreateCollectionInstruction } from "../src/lib/solana/core";

const appUrl = process.argv[2];
if (!appUrl) throw new Error("usage: tsx scripts/keepsake-collection.mts https://<app host>");
const rpc = createSolanaRpc(process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com");

const sponsor = await createKeyPairSignerFromBytes(
  Uint8Array.from(JSON.parse(readFileSync(".keys/sponsor.json", "utf8")) as number[]),
);
const collection = await generateKeyPairSigner();

const { value: blockhash } = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
const message = pipe(
  createTransactionMessage({ version: "legacy" }),
  (m) => setTransactionMessageFeePayerSigner(sponsor, m),
  (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
  (m) =>
    appendTransactionMessageInstructions(
      [
        getCreateCollectionInstruction({
          collection,
          updateAuthority: sponsor.address,
          payer: sponsor,
          name: "Pawket",
          uri: new URL("/api/keepsake/collection", appUrl).toString(),
        }),
      ],
      m,
    ),
);
const signed = await signTransactionMessageWithSigners(message);
await rpc.sendTransaction(getBase64EncodedWireTransaction(signed), { encoding: "base64", preflightCommitment: "confirmed" }).send();
console.log(`signature ${getSignatureFromTransaction(signed)}`);
for (let i = 0; i < 30; i++) {
  const { value } = await rpc.getSignatureStatuses([getSignatureFromTransaction(signed)]).send();
  if (value[0]?.confirmationStatus === "confirmed" || value[0]?.confirmationStatus === "finalized") {
    if (value[0].err) throw new Error(JSON.stringify(value[0].err));
    console.log(`collection ${collection.address}`);
    process.exit(0);
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
throw new Error("not confirmed in 30s");
