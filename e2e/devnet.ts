import { readFileSync } from "node:fs";
import path from "node:path";
import {
  appendTransactionMessageInstruction,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Address,
} from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";

/**
 * What the devnet specs share. Run only with PAWKET_DEVNET=1: they spend the
 * sponsor's devnet float and wait on the network.
 */

/** Some devnet SOL for the test wallet, from the sponsor, as a faucet would give it. */
export async function fund(address: string, lamports: bigint) {
  const raw = process.env.SPONSOR_KEYPAIR ?? readFileSync(path.join(process.cwd(), ".keys/sponsor.json"), "utf8");
  const sponsor = await createKeyPairSignerFromBytes(Uint8Array.from(JSON.parse(raw) as number[]));
  const rpc = createSolanaRpc(process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com");
  const { value: blockhash } = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
  const message = pipe(
    createTransactionMessage({ version: "legacy" }),
    (m) => setTransactionMessageFeePayerSigner(sponsor, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
    (m) => appendTransactionMessageInstruction(getTransferSolInstruction({ source: sponsor, destination: address as Address, amount: lamports }), m),
  );
  const signed = await signTransactionMessageWithSigners(message);
  await rpc.sendTransaction(getBase64EncodedWireTransaction(signed), { encoding: "base64" }).send();
  const signature = getSignatureFromTransaction(signed);
  for (let i = 0; i < 60; i++) {
    const { value } = await rpc.getSignatureStatuses([signature]).send();
    if (value[0]?.confirmationStatus === "confirmed" || value[0]?.confirmationStatus === "finalized") return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("The test wallet's SOL did not arrive.");
}

