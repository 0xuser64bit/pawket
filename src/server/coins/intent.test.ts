// @vitest-environment node
import { AccountRole, address, type Instruction, type SignatureBytes } from "@solana/kit";
import { AddressLookupTableAccount, ComputeBudgetProgram, Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import BN from "bn.js";
import { CpAmm, derivePositionAddress, derivePositionNftAccount } from "@meteora-ag/cp-amm-sdk";
import { DAMM_V2_MIGRATION_FEE_ADDRESS, deriveDammV2PoolAddress, deriveDbcPoolAddress, deriveDbcTokenVaultAddress, deriveDammV2TokenVaultAddress, DynamicBondingCurveClient, SwapMode, type PoolConfig, type VirtualPool } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { describe, expect, it, vi } from "vitest";
import { COIN_PRIORITY_FEE_MAX_MICRO_LAMPORTS, COIN_PRIORITY_FEE_MICRO_LAMPORTS } from "@/lib/coins/compute";
import { COIN_CONFIGS, COIN_LOOKUP_TABLES, COIN_TERMS } from "@/lib/coins/presets";
import { deriveWalletPda } from "@/lib/solana/pda";
import { getWalletSpendInstruction } from "@/lib/solana/instructions";
import { sendPrepared, type SendRpc } from "@/lib/solana/send";
import { coinFundingLimit, validateCoinInstructions, type CoinIntent } from "@/lib/coins/intent";

const owner = Keypair.generate().publicKey;
const mint = Keypair.generate().publicKey;
const sol = new PublicKey("So11111111111111111111111111111111111111112");
const token = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const config = new PublicKey(COIN_CONFIGS.devnet!.gentle);
const curve = deriveDbcPoolAddress(sol, mint, config);
const pool = deriveDammV2PoolAddress(DAMM_V2_MIGRATION_FEE_ADDRESS[2], mint, sol);
const base = { cluster: "devnet", mint: mint.toBase58(), preset: "gentle" } as const;
const amountIn = 100_000_000n;
const minimumOut = 1234n;
const conversion = (ix: TransactionInstruction): Instruction => ({
  programAddress: address(ix.programId.toBase58()), data: ix.data,
  accounts: ix.keys.map((meta) => ({ address: address(meta.pubkey.toBase58()), role: (Number(meta.isWritable) + Number(meta.isSigner) * 2) as AccountRole })),
});
const asInstructions = (tx: Transaction) => tx.instructions.map(conversion);
const validate = (tx: Transaction, intent: CoinIntent, funding = coinFundingLimit(intent)) => validateCoinInstructions({ owner: address(owner.toBase58()), instructions: asInstructions(tx), intent, funding });

async function sdkFixture() {
  const connection = new Connection("http://127.0.0.1:8899");
  vi.spyOn(connection, "getAccountInfo").mockImplementation(async (key) => key.equals(sol) ? { owner: token, data: Buffer.alloc(82), executable: false, lamports: 1, rentEpoch: 0 } : null);
  const dbc = new DynamicBondingCurveClient(connection, "confirmed");
  const poolConfig = { quoteMint: sol, tokenType: 0, quoteTokenFlag: 0, poolFees: { baseFee: { baseFeeMode: 0 } }, activationType: 1, enableFirstSwapWithMinFee: false } as unknown as PoolConfig;
  const virtualPool = { poolState: { baseMint: mint, baseVault: deriveDbcTokenVaultAddress(curve, mint), quoteVault: deriveDbcTokenVaultAddress(curve, sol), config, poolType: 0, creator: owner } } as unknown as VirtualPool;
  for (const client of [dbc.pool, dbc.creator, dbc.migration]) {
    vi.spyOn((client as unknown as { state: DynamicBondingCurveClient["state"] }).state, "getPool").mockResolvedValue(virtualPool);
    vi.spyOn((client as unknown as { state: DynamicBondingCurveClient["state"] }).state, "getPoolConfig").mockResolvedValue(poolConfig);
  }
  const damm = new CpAmm(connection);
  const dammTokens = { tokenAMint: mint, tokenBMint: sol, tokenAVault: deriveDammV2TokenVaultAddress(pool, mint), tokenBVault: deriveDammV2TokenVaultAddress(pool, sol), tokenAProgram: token, tokenBProgram: token };
  return { dbc, damm, dammTokens };
}

async function trade(route: "curve" | "pool", side: "buy" | "sell") {
  const { dbc, damm, dammTokens } = await sdkFixture();
  const intent: CoinIntent = { ...base, kind: "trade", route, side, amountIn, minimumOut };
  const transaction = route === "curve"
    ? await dbc.pool.swap2({ owner, payer: owner, pool: curve, swapMode: SwapMode.PartialFill, amountIn: new BN(String(amountIn)), minimumAmountOut: new BN(String(minimumOut)), swapBaseForQuote: side === "sell", referralTokenAccount: null })
    : await damm.swap({ payer: owner, pool, inputTokenMint: side === "buy" ? sol : mint, outputTokenMint: side === "buy" ? mint : sol, amountIn: new BN(String(amountIn)), minimumAmountOut: new BN(String(minimumOut)), ...dammTokens, referralTokenAccount: null, poolState: { poolFees: { baseFee: { baseFeeInfo: { data: Buffer.alloc(32) } } } } as never });
  return { transaction, intent };
}

describe("coin spend intent against installed SDK transactions", () => {
  it.each(["curve", "pool"] as const)("accepts the SDK's %s buys and sells within the operation budget", async (route) => {
    for (const side of ["buy", "sell"] as const) {
      const { transaction, intent } = await trade(route, side);
      await expect(validate(transaction, intent)).resolves.toBeUndefined();
      expect(coinFundingLimit(intent)).toBe(side === "buy" ? 105_000_000n : 5_000_000n);
      await expect(validate(transaction, intent, coinFundingLimit(intent) + 1n)).rejects.toThrow(/funding|budget/i);
    }
  });

  it.each(["curve", "pool"] as const)("refuses %s swap mutations including token sells above the approved input", async (route) => {
    const { transaction, intent } = await trade(route, "sell");
    const swapIndex = transaction.instructions.findIndex((ix) => ix.programId.toBase58() === (route === "curve" ? "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN" : "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG"));
    const swap = transaction.instructions[swapIndex];
    const mutate = async (change: (ix: TransactionInstruction) => void) => {
      const copy = new Transaction().add(...transaction.instructions.map((ix) => new TransactionInstruction({ programId: ix.programId, keys: ix.keys.map((key) => ({ ...key })), data: Buffer.from(ix.data) })));
      change(copy.instructions[swapIndex]);
      await expect(validate(copy, intent)).rejects.toThrow();
    };
    await mutate((ix) => ix.data.writeBigUInt64LE(amountIn + 1n, 8));
    await mutate((ix) => ix.data.writeBigUInt64LE(0n, 16));
    await mutate((ix) => { ix.keys[route === "curve" ? 2 : 1].pubkey = Keypair.generate().publicKey; });
    await mutate((ix) => { ix.keys[route === "curve" ? 4 : 3].pubkey = Keypair.generate().publicKey; });
    await mutate((ix) => { ix.keys[route === "curve" ? 7 : 6].pubkey = Keypair.generate().publicKey; });
    await mutate((ix) => { ix.keys[route === "curve" ? 12 : 11].pubkey = owner; });
    await mutate((ix) => { ix.keys.push({ pubkey: owner, isSigner: true, isWritable: true }); });
    await mutate((ix) => { ix.data = Buffer.concat([ix.data, Buffer.of(0)]); });
    if (route === "curve") await mutate((ix) => { ix.data[24] = 2; });
    const duplicated = new Transaction().add(...transaction.instructions, swap);
    await expect(validate(duplicated, intent)).rejects.toThrow();
  });

  it("refuses arbitrary transfers, token approvals, redirected unwraps and enlarged wrapping", async () => {
    const { transaction, intent } = await trade("curve", "buy");
    const outside = Keypair.generate().publicKey;
    await expect(validate(new Transaction().add(...transaction.instructions, SystemProgram.transfer({ fromPubkey: owner, toPubkey: outside, lamports: 1 })), intent)).rejects.toThrow();
    const close = transaction.instructions.at(-1)!;
    close.keys[1].pubkey = outside;
    await expect(validate(transaction, intent)).rejects.toThrow();
    close.keys[1].pubkey = owner;
    const wrap = transaction.instructions.find((ix) => ix.programId.equals(SystemProgram.programId))!;
    wrap.data.writeBigUInt64LE(amountIn + 1n, 4);
    await expect(validate(transaction, intent)).rejects.toThrow();
    wrap.data.writeBigUInt64LE(amountIn, 4);
    const approve = new TransactionInstruction({ programId: token, keys: [close.keys[0], { pubkey: outside, isWritable: false, isSigner: false }, close.keys[2]], data: Buffer.from([4, 1, 0, 0, 0, 0, 0, 0, 0]) });
    await expect(validate(new Transaction().add(...transaction.instructions, approve), intent)).rejects.toThrow();
  });

  it("checks every auxiliary payer, authority, mint, account and byte layout", async () => {
    const { transaction, intent } = await trade("curve", "buy");
    const outside = Keypair.generate().publicKey;
    for (const [index, original] of transaction.instructions.entries()) {
      if (original.programId.toBase58() === "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN") continue;
      for (const keyIndex of original.keys.keys()) {
        const copy = new Transaction().add(...transaction.instructions.map((ix) => new TransactionInstruction({ programId: ix.programId, keys: ix.keys.map((meta) => ({ ...meta })), data: Buffer.from(ix.data) })));
        copy.instructions[index].keys[keyIndex].pubkey = outside;
        await expect(validate(copy, intent), `auxiliary ${index} account ${keyIndex}`).rejects.toThrow();
      }
      const copy = new Transaction().add(...transaction.instructions.map((ix) => new TransactionInstruction({ programId: ix.programId, keys: ix.keys.map((meta) => ({ ...meta })), data: Buffer.from(ix.data) })));
      copy.instructions[index].data = Buffer.concat([copy.instructions[index].data, Buffer.of(0)]);
      await expect(validate(copy, intent), `auxiliary ${index} trailing data`).rejects.toThrow();
    }
    const payerless = new Transaction().add(...transaction.instructions.map((ix) => new TransactionInstruction({ programId: ix.programId, keys: ix.keys.map((meta) => meta.pubkey.equals(owner) ? { ...meta, isSigner: false } : { ...meta }), data: Buffer.from(ix.data) })));
    await expect(validate(payerless, intent)).rejects.toThrow();
    const readonlyDestination = new Transaction().add(...transaction.instructions.map((ix) => new TransactionInstruction({ programId: ix.programId, keys: ix.keys.map((meta) => ({ ...meta, isWritable: false })), data: Buffer.from(ix.data) })));
    await expect(validate(readonlyDestination, intent)).rejects.toThrow();
  });

  it("accepts capped compute budgets for every operation and refuses an over-cap or duplicate one", async () => {
    const { dbc } = await sdkFixture();
    const price = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: COIN_PRIORITY_FEE_MICRO_LAMPORTS });
    const budget = (transaction: Transaction, ...ixs: TransactionInstruction[]) => new Transaction().add(...ixs, ...transaction.instructions);

    const { transaction, intent } = await trade("curve", "buy");
    const limit = ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 });
    await expect(validate(budget(transaction, limit, price), intent)).resolves.toBeUndefined();
    await expect(validate(budget(transaction, ComputeBudgetProgram.setComputeUnitLimit({ units: 400_001 }), price), intent)).rejects.toThrow();
    await expect(
      validate(budget(transaction, limit, ComputeBudgetProgram.setComputeUnitPrice({ microLamports: COIN_PRIORITY_FEE_MAX_MICRO_LAMPORTS + 1n })), intent),
    ).rejects.toThrow();
    await expect(validate(budget(transaction, limit, limit, price), intent)).rejects.toThrow();
    const withAccount = new TransactionInstruction({
      programId: ComputeBudgetProgram.programId,
      keys: [{ pubkey: owner, isSigner: false, isWritable: false }],
      data: Buffer.from([2, 0x80, 0x1a, 0x06, 0x00]),
    });
    await expect(validate(budget(transaction, withAccount), intent)).rejects.toThrow();

    const launchIntent: CoinIntent = {
      ...base, kind: "launch", firstBuy: 0n, name: "Guild Coin", symbol: "GUILD",
      metadataUri: "https://dev.pawket.world/api/coins/guild/metadata",
    };
    const launch = await dbc.creator.createPoolWithFirstBuy({
      createPoolParam: { baseMint: mint, config, payer: owner, poolCreator: owner, name: launchIntent.name, symbol: launchIntent.symbol, uri: launchIntent.metadataUri },
      firstBuyParam: undefined,
    });
    await expect(validate(budget(launch, ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }), price), launchIntent)).resolves.toBeUndefined();

    const creator = await dbc.creator.claimCreatorTradingFee({
      creator: owner, payer: owner, pool: curve,
      maxBaseAmount: new BN("18446744073709551615"), maxQuoteAmount: new BN("18446744073709551615"),
    });
    await expect(
      validate(budget(creator, ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }), price), { ...base, kind: "claim", from: "curve" } as CoinIntent),
    ).resolves.toBeUndefined();

    const { transaction: graduation } = await dbc.migration.migrateToDammV2({ payer: owner, pool: curve, dammConfig: DAMM_V2_MIGRATION_FEE_ADDRESS[2] });
    await expect(validate(budget(graduation, price), { ...base, kind: "graduate" } as CoinIntent)).resolves.toBeUndefined();
  });

  it("accepts launch with and without the exact optional first buy, and binds metadata and preset", async () => {
    const { dbc } = await sdkFixture();
    for (const firstBuy of [0n, amountIn]) {
      const intent: CoinIntent = { ...base, kind: "launch", firstBuy, name: "Guild Coin", symbol: "GUILD", metadataUri: "https://dev.pawket.world/api/coins/guild/metadata" };
      const transaction = await dbc.creator.createPoolWithFirstBuy({ createPoolParam: { baseMint: mint, config, payer: owner, poolCreator: owner, name: intent.name, symbol: intent.symbol, uri: intent.metadataUri }, firstBuyParam: firstBuy ? { buyer: owner, buyAmount: new BN(String(firstBuy)), minimumAmountOut: new BN(0), referralTokenAccount: null } : undefined });
      await expect(validate(transaction, intent)).resolves.toBeUndefined();
      expect(coinFundingLimit(intent)).toBe(firstBuy + COIN_TERMS.launchFeeLamports + 30_000_000n);
      await expect(validate(transaction, { ...intent, name: "Another Coin" })).rejects.toThrow();
      await expect(validate(transaction, { ...intent, preset: "lively" })).rejects.toThrow();
      await expect(validate(transaction, { ...intent, firstBuy: firstBuy + 1n })).rejects.toThrow();
    }
  });

  it("accepts creator and pool fee claims only to the owner's token accounts", async () => {
    const { dbc, damm, dammTokens } = await sdkFixture();
    const creator = await dbc.creator.claimCreatorTradingFee({ creator: owner, payer: owner, pool: curve, maxBaseAmount: new BN("18446744073709551615"), maxQuoteAmount: new BN("18446744073709551615") });
    const creatorIntent: CoinIntent = { ...base, kind: "claim", from: "curve" };
    await expect(validate(creator, creatorIntent)).resolves.toBeUndefined();
    const nft = Keypair.generate().publicKey;
    const position = await damm.claimPositionFee({ owner, pool, position: derivePositionAddress(nft), positionNftAccount: derivePositionNftAccount(nft), ...dammTokens });
    const positionIntent: CoinIntent = { ...base, kind: "claim", from: "pool" };
    await expect(validate(position, positionIntent)).resolves.toBeUndefined();
    const claims = async (count: number) => {
      const built = await Promise.all(
        Array.from({ length: count }, () => {
          const key = Keypair.generate().publicKey;
          return damm.claimPositionFee({ owner, pool, position: derivePositionAddress(key), positionNftAccount: derivePositionNftAccount(key), ...dammTokens });
        }),
      );
      const isAta = (ix: TransactionInstruction) => ix.programId.toBase58() === "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
      const isClose = (ix: TransactionInstruction) => ix.programId.toBase58() === token.toBase58() && ix.data.length === 1 && ix.data[0] === 9;
      const setup = built[0].instructions.filter(isAta);
      const positions = built.flatMap((transaction) => transaction.instructions.filter((ix) => !isAta(ix) && !isClose(ix)));
      const unwrap = built.flatMap((transaction) => transaction.instructions.filter(isClose)).at(-1);
      return new Transaction().add(...setup, ...positions, ...(unwrap ? [unwrap] : []));
    };
    await expect(validate(await claims(3), positionIntent)).resolves.toBeUndefined();
    await expect(validate(await claims(4), positionIntent)).rejects.toThrow();
    await expect(validate(position, creatorIntent)).rejects.toThrow();
    const claim = creator.instructions.find((ix) => ix.programId.equals(dbc.creator.getProgram().programId))!;
    claim.keys[2].pubkey = Keypair.generate().publicKey;
    await expect(validate(creator, creatorIntent)).rejects.toThrow();
  });

  it("accepts only the configured graduation, minting its two new position records", async () => {
    const { dbc } = await sdkFixture();
    const { transaction } = await dbc.migration.migrateToDammV2({ payer: owner, pool: curve, dammConfig: DAMM_V2_MIGRATION_FEE_ADDRESS[2] });
    const intent: CoinIntent = { ...base, kind: "graduate" };
    await expect(validate(transaction, intent)).resolves.toBeUndefined();
    expect(coinFundingLimit(intent)).toBe(50_000_000n);
    transaction.instructions[0].keys[4].pubkey = Keypair.generate().publicKey;
    await expect(validate(transaction, intent)).rejects.toThrow();
  });
});


describe("prepared coin signatures", () => {
  const device = Keypair.generate().publicKey;
  const asLegacy = (ix: Instruction) => new TransactionInstruction({ programId: new PublicKey(ix.programAddress), data: Buffer.from(ix.data ?? []), keys: (ix.accounts ?? []).map((meta) => ({ pubkey: new PublicKey(meta.address), isSigner: meta.role >= 2, isWritable: (meta.role & 1) === 1 })) });
  async function wire(transaction: Transaction, intent: CoinIntent, funding = coinFundingLimit(intent), lookup?: AddressLookupTableAccount) {
    const wallet = (await deriveWalletPda(owner.toBase58())).address;
    const bracket = (amount?: bigint) => asLegacy(getWalletSpendInstruction({ owner: owner.toBase58(), wallet, device: device.toBase58(), keep: 33n, amount }));
    const message = new TransactionMessage({ payerKey: device, recentBlockhash: "11111111111111111111111111111111", instructions: [bracket(funding), ...transaction.instructions, bracket()] });
    const prepared = new VersionedTransaction(lookup ? message.compileToV0Message([lookup]) : message.compileToLegacyMessage());
    return Buffer.from(prepared.serialize()).toString("base64");
  }
  const signatures = () => {
    const ownerSign = vi.fn(async () => { throw new Error("owner approval requested"); });
    const deviceSign = vi.fn(async () => [{ [device.toBase58()]: new Uint8Array(64).fill(1) as SignatureBytes }]);
    return { ownerSign, deviceSign, options: { rpc: {} as SendRpc, owner: { address: address(owner.toBase58()), signTransactions: ownerSign }, extraSigner: { address: address(device.toBase58()), signTransactions: deviceSign }, sponsored: false } };
  };

  it("lets a capped priority fee through to the owner but refuses an uncapped one before the device", async () => {
    const { transaction, intent } = await trade("curve", "buy");
    const budget = (microLamports: bigint) => new Transaction().add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports }),
      ...transaction.instructions,
    );
    const approved = signatures();
    await expect(
      sendPrepared({ ...approved.options, coinIntent: intent, prepare: async () => wire(budget(COIN_PRIORITY_FEE_MICRO_LAMPORTS), intent) }),
    ).rejects.toThrow("owner approval requested");
    expect(approved.deviceSign).toHaveBeenCalledOnce();
    expect(approved.ownerSign).toHaveBeenCalledOnce();

    const refused = signatures();
    await expect(
      sendPrepared({ ...refused.options, coinIntent: intent, prepare: async () => wire(budget(COIN_PRIORITY_FEE_MAX_MICRO_LAMPORTS + 1n), intent) }),
    ).rejects.toThrow();
    expect(refused.deviceSign).not.toHaveBeenCalled();
    expect(refused.ownerSign).not.toHaveBeenCalled();
  });

  it("checks the exact immutable buy/sell intent before the device and the owner", async () => {
    for (const side of ["buy", "sell"] as const) {
      const { transaction, intent } = await trade("curve", side);
      const approved = signatures();
      await expect(sendPrepared({ ...approved.options, coinIntent: intent, prepare: async () => wire(transaction, intent) })).rejects.toThrow("owner approval requested");
      expect(approved.deviceSign).toHaveBeenCalledOnce();
      expect(approved.ownerSign).toHaveBeenCalledOnce();
      for (const changed of [
        { transaction, intent, funding: coinFundingLimit(intent) + 1n },
        { transaction, intent: { ...intent, amountIn: amountIn + 1n } as CoinIntent, funding: coinFundingLimit(intent) },
        { transaction, intent: { ...intent, minimumOut: minimumOut + 1n } as CoinIntent, funding: coinFundingLimit(intent) },
        { transaction: new Transaction().add(...transaction.instructions, SystemProgram.transfer({ fromPubkey: owner, toPubkey: mint, lamports: 1 })), intent, funding: coinFundingLimit(intent) },
      ]) {
        const refused = signatures();
        await expect(sendPrepared({ ...refused.options, coinIntent: changed.intent, prepare: async () => wire(changed.transaction, changed.intent, changed.funding) })).rejects.toThrow();
        expect(refused.deviceSign).not.toHaveBeenCalled();
        expect(refused.ownerSign).not.toHaveBeenCalled();
      }
      const mutable = { ...intent };
      const preserved = signatures();
      const prepared = await wire(transaction, intent);
      await expect(sendPrepared({ ...preserved.options, coinIntent: mutable, prepare: async () => { Object.assign(mutable, { amountIn: 1n }); return prepared; } })).rejects.toThrow("owner approval requested");
    }
  });

  it("independently resolves the configured frozen graduation table before either signature", async () => {
    const { dbc } = await sdkFixture();
    const { transaction } = await dbc.migration.migrateToDammV2({ payer: owner, pool: curve, dammConfig: DAMM_V2_MIGRATION_FEE_ADDRESS[2] });
    const intent: CoinIntent = { ...base, kind: "graduate" };
    // Same classes of shared keys as scripts/coin-lookup-table.mts, including bracket sysvars.
    const addresses = transaction.instructions[0].keys.filter((meta) => !meta.isSigner && !meta.pubkey.equals(mint) && !meta.pubkey.equals(owner)).map((meta) => meta.pubkey);
    addresses.push(new PublicKey("Sysvar1nstructions1111111111111111111111111"));
    const table = new AddressLookupTableAccount({ key: new PublicKey(COIN_LOOKUP_TABLES.devnet!), state: { deactivationSlot: 18446744073709551615n, lastExtendedSlot: 0, lastExtendedSlotStartIndex: 0, addresses } });
    const prepared = await wire(transaction, intent, coinFundingLimit(intent), table);
    const approved = signatures();
    const resolveLookup = vi.fn(async () => addresses.map((key) => address(key.toBase58())));
    await expect(sendPrepared({ ...approved.options, coinIntent: intent, prepare: async () => prepared, resolveLookup })).rejects.toThrow("owner approval requested");
    expect(resolveLookup).toHaveBeenCalledExactlyOnceWith(address(COIN_LOOKUP_TABLES.devnet!));
    expect(approved.deviceSign).toHaveBeenCalledOnce();
    for (const resolve of [async () => [], async () => addresses.map(() => address(owner.toBase58())), async () => { throw new Error("RPC unavailable"); }]) {
      const refused = signatures();
      await expect(sendPrepared({ ...refused.options, coinIntent: intent, prepare: async () => prepared, resolveLookup: resolve })).rejects.toThrow();
      expect(refused.deviceSign).not.toHaveBeenCalled();
      expect(refused.ownerSign).not.toHaveBeenCalled();
    }
    const stranger = new AddressLookupTableAccount({ key: Keypair.generate().publicKey, state: table.state });
    const refused = signatures();
    await expect(sendPrepared({ ...refused.options, coinIntent: intent, prepare: async () => wire(transaction, intent, coinFundingLimit(intent), stranger), resolveLookup })).rejects.toThrow(/lookup table/);
    expect(refused.deviceSign).not.toHaveBeenCalled();
  });
});
