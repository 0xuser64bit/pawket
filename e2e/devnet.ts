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

const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
export const SPONSOR_ROOM_LAMPORTS = 2_000_000_000n;

function keypairJson(env: string, file: string): string | null {
  if (process.env[env]) return process.env[env]!;
  const at = path.join(process.cwd(), file);
  return existsSync(at) ? readFileSync(at, "utf8") : null;
}

export function sponsorKeypairJson(): string {
  const raw = keypairJson("SPONSOR_KEYPAIR", ".keys/sponsor.json");
  if (!raw) throw new Error("The devnet suites need the sponsor's key: SPONSOR_KEYPAIR or .keys/sponsor.json.");
  return raw;
}

export async function testFunderKeypairJson(): Promise<string> {
  const raw = keypairJson("PAWKET_TEST_FUNDER", ".keys/test-funder.json");
  if (!raw) {
    throw new Error("Make a key that funds test wallets — solana-keygen new -o .keys/test-funder.json — and send it devnet SOL from a faucet. The sponsor's float is the live site's.");
  }
  const [funder, sponsor] = await Promise.all([raw, sponsorKeypairJson()].map((json) => createKeyPairSignerFromBytes(Uint8Array.from(JSON.parse(json) as number[]))));
  if (funder.address === sponsor.address) throw new Error("PAWKET_TEST_FUNDER is the sponsor's key. Test wallets are never funded from the live site's float.");
  return raw;
}

export async function assertSponsorHasRoom() {
  const sponsor = await createKeyPairSignerFromBytes(Uint8Array.from(JSON.parse(sponsorKeypairJson()) as number[]));
  const { value } = await createSolanaRpc(RPC_URL).getBalance(sponsor.address, { commitment: "confirmed" }).send();
  if (value < SPONSOR_ROOM_LAMPORTS) {
    throw new Error(`The sponsor holds ${Number(value) / 1e9} SOL; a devnet run needs it above ${Number(SPONSOR_ROOM_LAMPORTS) / 1e9} SOL so the live site keeps its float.`);
  }
}

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

