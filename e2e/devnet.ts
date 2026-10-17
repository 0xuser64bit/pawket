import { existsSync, readFileSync } from "node:fs";
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
 * What the devnet specs share. Run only with PAWKET_DEVNET=1. Test wallets
 * are funded by a key kept for that alone (PAWKET_TEST_FUNDER, a keypair's
 * JSON, or .keys/test-funder.json), never by the sponsor — it pays the live
 * site's fees — and never by the deploy wallet. The sponsored actions still
 * spend the sponsor's float, because its key is also the keepsake
 * collection's authority (Q10 in docs/OPEN-QUESTIONS.md), so a run refuses
 * to start while that float is low.
 */

const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
/** What the sponsor must hold before a run may spend from it: well above its 0.05 SOL floor. */
export const SPONSOR_ROOM_LAMPORTS = 2_000_000_000n;

function keypairJson(env: string, file: string): string | null {
  if (process.env[env]) return process.env[env]!;
  const at = path.join(process.cwd(), file);
  return existsSync(at) ? readFileSync(at, "utf8") : null;
}

/** The sponsor's key as the tests use it, and so its address. */
export function sponsorKeypairJson(): string {
  const raw = keypairJson("SPONSOR_KEYPAIR", ".keys/sponsor.json");
  if (!raw) throw new Error("The devnet suites need the sponsor's key: SPONSOR_KEYPAIR or .keys/sponsor.json.");
  return raw;
}

/** The key that funds test wallets, refused when it is the sponsor's. */
export async function testFunderKeypairJson(): Promise<string> {
  const raw = keypairJson("PAWKET_TEST_FUNDER", ".keys/test-funder.json");
  if (!raw) {
    throw new Error("Make a key that funds test wallets — solana-keygen new -o .keys/test-funder.json — and send it devnet SOL from a faucet. The sponsor's float is the live site's.");
  }
  const [funder, sponsor] = await Promise.all([raw, sponsorKeypairJson()].map((json) => createKeyPairSignerFromBytes(Uint8Array.from(JSON.parse(json) as number[]))));
  if (funder.address === sponsor.address) throw new Error("PAWKET_TEST_FUNDER is the sponsor's key. Test wallets are never funded from the live site's float.");
  return raw;
}

/** Refuse to run while the sponsor holds too little to share with a test run. */
export async function assertSponsorHasRoom() {
  const sponsor = await createKeyPairSignerFromBytes(Uint8Array.from(JSON.parse(sponsorKeypairJson()) as number[]));
  const { value } = await createSolanaRpc(RPC_URL).getBalance(sponsor.address, { commitment: "confirmed" }).send();
  if (value < SPONSOR_ROOM_LAMPORTS) {
    throw new Error(`The sponsor holds ${Number(value) / 1e9} SOL; a devnet run needs it above ${Number(SPONSOR_ROOM_LAMPORTS) / 1e9} SOL so the live site keeps its float.`);
  }
}

/** Some devnet SOL for the test wallet, from the test funder, as a faucet would give it. */
export async function fund(address: string, lamports: bigint) {
  await assertSponsorHasRoom();
  const funder = await createKeyPairSignerFromBytes(Uint8Array.from(JSON.parse(await testFunderKeypairJson()) as number[]));
  const rpc = createSolanaRpc(RPC_URL);
  const { value: blockhash } = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
  const message = pipe(
    createTransactionMessage({ version: "legacy" }),
    (m) => setTransactionMessageFeePayerSigner(funder, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
    (m) => appendTransactionMessageInstruction(getTransferSolInstruction({ source: funder, destination: address as Address, amount: lamports }), m),
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

