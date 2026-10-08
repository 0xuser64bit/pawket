// @vitest-environment node
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { getOpenWalletInstruction, getDepositInstruction, getLinkDeviceInstruction } from "@/lib/solana/instructions";
import { deriveWalletPda } from "@/lib/solana/pda";
import { type Address } from "@solana/kit";
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from "@solana/web3.js";
import { beforeAll, describe, expect, it } from "vitest";
import type { ChainGuild } from "@/lib/solana/accounts";

/**
 * A guild coin's whole life on devnet, run by `pnpm e2e:coins` and skipped
 * otherwise: a founder launches it on the gentle preset with a first buy,
 * buyers carry the curve to its threshold, it graduates into DAMM v2, a
 * holder sells in the graduated pool, and the founder claims their share
 * of the fees — every step a transaction Pawket's server built and only
 * the player signed, every number read back from Solana.
 *
 * The coin's key comes from the sponsor's (SPONSOR_KEYPAIR or
 * .keys/sponsor.json); the deploy wallet (~/.config/solana/id.json) funds
 * the founder. The guild is a stand-in with a fresh slug: a coin needs only
 * the guild's name and slug, and the routes check the rest.
 */
const RUN = process.env.PAWKET_DEVNET === "1";
const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

describe.skipIf(!RUN)("a guild coin on devnet", { timeout: 600_000 }, () => {
  const connection = new Connection(RPC_URL, "confirmed");
  const founder = Keypair.generate();
  const device = Keypair.generate();
  let walletAddress: string;
  const slug = `coin-check-${Date.now().toString(36)}`;
  const guild = { slug, name: "Coin Check", founder: founder.publicKey.toBase58() } as unknown as ChainGuild;
  let coins: typeof import("./meteora");

  const sign = async (wire: string, signer: Keypair) => {
    const transaction = Transaction.from(Buffer.from(wire, "base64"));
    const before = await connection.getBalance(signer.publicKey);
    transaction.partialSign(signer, device);
    const signature = await connection.sendRawTransaction(transaction.serialize(), { preflightCommitment: "confirmed" });
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    const result = await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
    expect(result.value.err, signature).toBeNull();
    expect(await connection.getBalance(signer.publicKey)).toBe(before);
    return signature;
  };

  beforeAll(async () => {
    process.env.SPONSOR_KEYPAIR ??= readFileSync(".keys/sponsor.json", "utf8");
    coins = await import("./meteora");
    const funder = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(readFileSync(`${homedir()}/.config/solana/id.json`, "utf8")) as number[]),
    );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(SystemProgram.transfer({ fromPubkey: funder.publicKey, toPubkey: founder.publicKey, lamports: 3 * LAMPORTS_PER_SOL })),
      [funder],
    );
    const owner = founder.publicKey.toBase58() as Address;
    walletAddress = (await deriveWalletPda(owner)).address;
    const instructions = [
      getOpenWalletInstruction({ owner, payer: owner, wallet: walletAddress }),
      getDepositInstruction({ owner, wallet: walletAddress, amount: 2_800_000_000n }),
      getLinkDeviceInstruction({ owner, wallet: walletAddress, device: device.publicKey.toBase58(), expiresAt: Math.floor(Date.now() / 1000) + 86_400, dailyActions: 100 }),
    ].map((ix) => new TransactionInstruction({ programId: new PublicKey(ix.programAddress), data: Buffer.from(ix.data!), keys: ix.accounts!.map((meta) => ({ pubkey: new PublicKey(meta.address), isSigner: meta.role >= 2, isWritable: (meta.role & 1) === 1 })) }));
    await sendAndConfirmTransaction(connection, new Transaction().add(...instructions), [founder, device]);
  });

  it("launches on a preset, with the founder's first buy in the same transaction", async () => {
    expect((await coins.readCoin(guild))?.stage).toBe("none");
    await sign(
      await coins.launchTransaction({
        guild,
        founder: founder.publicKey.toBase58(),
        preset: "gentle",
        firstBuyLamports: BigInt(LAMPORTS_PER_SOL / 10),
        metadataUri: `https://pawket.world/api/coins/${slug}/metadata`,
      }),
      founder,
    );
    const coin = await coins.readCoin(guild);
    expect(coin).toMatchObject({ stage: "dbc", preset: "gentle", creator: founder.publicKey.toBase58() });
    expect(BigInt(coin!.raised)).toBeGreaterThan(0n);
    expect(coin!.holders?.count).toBe(1);
  });

  it("buys along the curve at no worse than the quote, until it graduates", async () => {
    for (let round = 0; round < 6; round++) {
      const coin = (await coins.readCoin(guild))!;
      if (coin.stage !== "dbc") break;
      // Up to a SOL at a time. The last one asks for a little more than is
      // left, and the curve takes only what graduation needs.
      const left = BigInt(coin.threshold) - BigInt(coin.raised);
      const amount = [BigInt(LAMPORTS_PER_SOL), left + left / 5n + 10_000_000n].reduce((a, b) => (a < b ? a : b));
      const quote = await coins.quoteTrade(guild, "buy", amount, 100);
      expect(quote.route).toBe("curve");
      expect(BigInt(quote.minimumOut)).toBeLessThanOrEqual(BigInt(quote.amountOut));
      expect(BigInt(quote.amountUsed)).toBeLessThanOrEqual(amount);
      await sign(
        await coins.tradeTransaction({ guild, owner: founder.publicKey.toBase58(), side: "buy", amountIn: amount, minimumOut: BigInt(quote.minimumOut) }),
        founder,
      );
    }
    const coin = (await coins.readCoin(guild))!;
    expect(coin.stage).toBe("pending");
    await expect(coins.quoteTrade(guild, "buy", 1_000_000n, 100)).rejects.toThrow(/paused/);
  });

  it("graduates into its DAMM v2 pool, and trades there once the pool is verified", async () => {
    await sign(await coins.graduateTransaction(guild, founder.publicKey.toBase58()), founder);
    const coin = (await coins.readCoin(guild))!;
    expect(coin.stage).toBe("damm");
    expect(coin.graduated?.verified).toBe(true);

    const held = await connection.getParsedTokenAccountsByOwner(founder.publicKey, { mint: new (await import("@solana/web3.js")).PublicKey(coin.mint) });
    const balance = BigInt(held.value[0].account.data.parsed.info.tokenAmount.amount as string);
    const quote = await coins.quoteTrade(guild, "sell", balance / 10n, 100);
    expect(quote.route).toBe("pool");
    await sign(
      await coins.tradeTransaction({ guild, owner: founder.publicKey.toBase58(), side: "sell", amountIn: balance / 10n, minimumOut: BigInt(quote.minimumOut) }),
      founder,
    );
  });

  it("pays the founder their share of the curve's fees", async () => {
    const before = await connection.getBalance(new PublicKey(walletAddress));
    const coin = (await coins.readCoin(guild))!;
    expect(BigInt(coin.fees.founderUnclaimed)).toBeGreaterThan(0n);
    // Halves, to the lamport Meteora's rounding gives Pawket.
    const gap = BigInt(coin.fees.pawketUnclaimed) - BigInt(coin.fees.founderUnclaimed);
    expect(gap >= 0n && gap <= 1n).toBe(true);
    await sign(await coins.claimTransaction(guild, founder.publicKey.toBase58()), founder);
    expect(await connection.getBalance(new PublicKey(walletAddress))).toBeGreaterThan(before);
    expect((await coins.readCoin(guild))!.fees.founderUnclaimed).toBe("0");
  });
});
