// @vitest-environment node
import {
  AccountRole,
  address,
  appendTransactionMessageInstructions,
  blockhash,
  compileTransaction,
  createNoopSigner,
  compressTransactionMessageUsingAddressLookupTables,
  createTransactionMessage,
  generateKeyPairSigner,
  getBase64Encoder,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  getTransactionDecoder,
  partiallySignTransaction,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  SolanaError,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
  type Address,
  type Instruction,
  type KeyPairSigner,
  type Transaction,
} from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getWalletSpendInstruction } from "./instructions";
import { deriveWalletPda } from "./pda";
import { CONFIRMATION_TIMEOUT_MS, type TransactionStage } from "./transactions";
import { sendPawket, sendPrepared, type SendRpc } from "./send";

describe("broadcast uncertainty", () => {
  it.each(["owner", "sponsored", "prepared"])("%s preparation is shown before signing, and a timed-out signature is never sent", async (kind) => {
    const owner = await generateKeyPairSigner();
    const stages: TransactionStage[] = [];
    const lifetime = { blockhash: blockhash("11111111111111111111111111111111"), lastValidBlockHeight: 1n };
    let answer!: (value: Awaited<ReturnType<typeof owner.signTransactions>>) => void;
    const signer = { ...owner, signTransactions: () => {
      expect(stages).toEqual(["preparing", "signing"]);
      return new Promise<Awaited<ReturnType<typeof owner.signTransactions>>>((resolve) => { answer = resolve; });
    } };
    const send = vi.fn();
    const rpc = {
      getLatestBlockhash: () => ({ send: async () => { expect(stages).toEqual(["preparing"]); return { value: lifetime }; } }),
      sendTransaction: send,
    } as unknown as SendRpc;
    vi.useFakeTimers();
    try {
      const options = {
        rpc, owner: signer, sponsor: kind === "sponsored" ? owner.address : null, instructions: () => [],
        onStage: (stage: TransactionStage) => stages.push(stage),
        cosign: async (wire: string) => { expect(stages).toEqual(["preparing"]); return wire; },
      };
      const pending = kind === "prepared" ? sendPrepared({ ...options, prepare: async () => {
        expect(stages).toEqual(["preparing"]);
        return getBase64EncodedWireTransaction(compileTransaction(pipe(
          createTransactionMessage({ version: "legacy" }),
          (m) => setTransactionMessageFeePayerSigner(owner, m),
          (m) => setTransactionMessageLifetimeUsingBlockhash(lifetime, m),
        )));
      } }) : sendPawket(options);
      const refused = expect(pending).rejects.toThrow(/did not finish signing.*Nothing was sent/);
      await vi.advanceTimersByTimeAsync(150_000);
      await refused;
      answer([]);
      await Promise.resolve();
      expect(send).not.toHaveBeenCalled();
    } finally { vi.useRealTimers(); }
  });

  it("refuses a prepared coin that would charge the external wallet, before any signer is called", async () => {
    const owner = await generateKeyPairSigner();
    const device = await generateKeyPairSigner();
    const sign = vi.fn();
    const prepared = compileTransaction(pipe(
      createTransactionMessage({ version: "legacy" }),
      (m) => setTransactionMessageFeePayerSigner(owner, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash({ blockhash: blockhash("11111111111111111111111111111111"), lastValidBlockHeight: 1n }, m),
    ));
    await expect(sendPrepared({ rpc: {} as SendRpc, owner: { ...owner, signTransactions: sign }, extraSigner: { ...device, signTransactions: sign }, prepare: async () => getBase64EncodedWireTransaction(prepared), sponsored: false })).rejects.toThrow(/does not use your Pawket Wallet/);
    expect(sign).not.toHaveBeenCalled();
  });

  async function bracketed(lookup: boolean) {
    const owner = await generateKeyPairSigner();
    const device = await generateKeyPairSigner();
    const wallet = (await deriveWalletPda(owner.address)).address;
    const bracket = (amount?: bigint) => getWalletSpendInstruction({ owner: owner.address, wallet, device: device.address, keep: 0n, amount });
    const message = pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayer(device.address, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash({ blockhash: blockhash("11111111111111111111111111111111"), lastValidBlockHeight: 1n }, m),
      (m) => appendTransactionMessageInstructions([bracket(0n), bracket()], m),
    );
    const table = address("AddressLookupTab1e1111111111111111111111111");
    const prepared = compileTransaction(lookup ? compressTransactionMessageUsingAddressLookupTables(message, { [table]: [wallet] }) : message);
    return { owner, device, prepare: async () => getBase64EncodedWireTransaction(prepared) };
  }

  it("lets a v0 coin transaction through while its Pawket Wallet accounts are its own keys", async () => {
    const { owner, device, prepare } = await bracketed(false);
    const reached = vi.fn(async () => { throw new Error("the owner was asked"); });
    await expect(sendPrepared({ rpc: {} as SendRpc, owner: { ...owner, signTransactions: reached }, extraSigner: device, prepare, sponsored: false })).rejects.toThrow("the owner was asked");
    expect(reached).toHaveBeenCalledOnce();
  });

  it("refuses to let its device pay for anything but the network fee, before any signer is called", async () => {
    const owner = await generateKeyPairSigner();
    const device = await generateKeyPairSigner();
    const wallet = (await deriveWalletPda(owner.address)).address;
    const bracket = (amount?: bigint) => getWalletSpendInstruction({ owner: owner.address, wallet, device: device.address, keep: 0n, amount });
    const elsewhere = address("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin");
    const priority = { programAddress: address("ComputeBudget111111111111111111111111111111"), data: Uint8Array.of(3, 1, 0, 0, 0, 0, 0, 0, 0) };
    const limit = { programAddress: address("ComputeBudget111111111111111111111111111111"), data: Uint8Array.of(2, 0, 0x27, 9, 0) };
    const verifies = (program: string) => ({ programAddress: address(program), data: Uint8Array.of(40, 0) });
    const mints = await Promise.all([generateKeyPairSigner(), generateKeyPairSigner(), generateKeyPairSigner()]);
    const signedBy = (count: number) => ({
      programAddress: address("cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG"),
      accounts: mints.slice(0, count).map((mint) => ({ address: mint.address, role: AccountRole.READONLY_SIGNER })),
      data: Uint8Array.of(1),
    });
    const prepared = (middle: Parameters<typeof appendTransactionMessageInstructions>[0]) => async () => getBase64EncodedWireTransaction(compileTransaction(pipe(
      createTransactionMessage({ version: "legacy" }),
      (m) => setTransactionMessageFeePayer(device.address, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash({ blockhash: blockhash("11111111111111111111111111111111"), lastValidBlockHeight: 1n }, m),
      (m) => appendTransactionMessageInstructions([bracket(1n), ...middle, bracket()], m),
    )));
    for (const middle of [
      [getTransferSolInstruction({ source: createNoopSigner(device.address), destination: elsewhere, amount: 1_000_000n })],
      [limit, priority],
      [verifies("Ed25519SigVerify111111111111111111111111111")],
      [verifies("KeccakSecp256k11111111111111111111111111111")],
      [verifies("Secp256r1SigVerify1111111111111111111111111")],
      [signedBy(3)],
    ]) {
      const sign = vi.fn();
      await expect(sendPrepared({ rpc: {} as SendRpc, owner: { ...owner, signTransactions: sign }, extraSigner: { ...device, signTransactions: sign }, prepare: prepared(middle), sponsored: false }))
        .rejects.toThrow(/more than its network fee/);
      expect(sign).not.toHaveBeenCalled();
    }
    const reached = vi.fn(async () => { throw new Error("the owner was asked"); });
    const trade = [limit, getTransferSolInstruction({ source: createNoopSigner(owner.address), destination: elsewhere, amount: 1n })];
    await expect(sendPrepared({ rpc: {} as SendRpc, owner: { ...owner, signTransactions: reached }, extraSigner: device, prepare: prepared(trade), sponsored: false })).rejects.toThrow("the owner was asked");
    const graduation = [limit, signedBy(2)];
    await expect(sendPrepared({ rpc: {} as SendRpc, owner: { ...owner, signTransactions: reached }, extraSigner: device, prepare: prepared(graduation), sponsored: false })).rejects.toThrow("the owner was asked");
    expect(reached).toHaveBeenCalledTimes(2);
  });

  it("refuses a v0 transaction whose Pawket Wallet comes from a lookup table, before any signer is called", async () => {
    const { owner, device, prepare } = await bracketed(true);
    const sign = vi.fn();
    await expect(sendPrepared({ rpc: {} as SendRpc, owner: { ...owner, signTransactions: sign }, extraSigner: { ...device, signTransactions: sign }, prepare, sponsored: false })).rejects.toThrow(/does not use your Pawket Wallet/);
    expect(sign).not.toHaveBeenCalled();
  });

  it("a broadcast that never replies times out and looks up the signed transaction", async () => {
    const owner = await generateKeyPairSigner();
    const timeout = AbortSignal.timeout.bind(AbortSignal);
    const budgets: number[] = [];
    const clock = vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) => {
      budgets.push(ms);
      return timeout(10);
    });
    let sent = 0;
    const rpc = {
      getLatestBlockhash: () => ({ send: async () => ({ value: {
        blockhash: "11111111111111111111111111111111", lastValidBlockHeight: 1n,
      } }) }),
      sendTransaction: () => ({ send: ({ abortSignal }: { abortSignal?: AbortSignal } = {}) => {
        sent++;
        return new Promise((_resolve, reject) => abortSignal?.addEventListener("abort", () => reject(abortSignal.reason)));
      } }),
      getSignatureStatuses: () => ({ send: async () => ({ value: [{ confirmationStatus: "confirmed", err: null }] }) }),
    } as unknown as SendRpc;
    try {
      const outcome = await Promise.race([
        sendPawket({ rpc, owner, sponsor: null, instructions: () => [] }),
        new Promise((resolve) => setTimeout(() => resolve("still waiting"), 200)),
      ]);
      expect(outcome).toMatchObject({ outcome: "confirmed" });
      expect(budgets[0]).toBe(CONFIRMATION_TIMEOUT_MS);
      expect(sent).toBe(1);
    } finally {
      clock.mockRestore();
    }
  });

  it("recovers a lost broadcast reply by its signature without sending twice", async () => {
    const owner = await generateKeyPairSigner();
    let sent = 0;
    let signature: string | undefined;
    const rpc = {
      getLatestBlockhash: () => ({ send: async () => ({ value: {
        blockhash: "11111111111111111111111111111111", lastValidBlockHeight: 1n,
      } }) }),
      sendTransaction: (wire: string, options: { preflightCommitment: string; skipPreflight?: boolean }) => ({ send: async () => {
        sent++;
        expect(options.preflightCommitment).toBe("confirmed");
        expect(options.skipPreflight).not.toBe(true);
        signature = getSignatureFromTransaction(getTransactionDecoder().decode(getBase64Encoder().encode(wire)));
        throw new TypeError("Failed to fetch");
      } }),
      getSignatureStatuses: (signatures: string[]) => ({ send: async () => {
        expect(signatures).toEqual([signature]);
        return { value: [{ confirmationStatus: "confirmed", err: null }] };
      } }),
    } as unknown as SendRpc;
    await expect(sendPawket({ rpc, owner, sponsor: null, instructions: () => [] })).resolves.toEqual({
      signature: expect.any(String), outcome: "confirmed", sponsored: false, blockhash: "11111111111111111111111111111111",
    });
    expect(sent).toBe(1);
  });

  it("a definitive preflight refusal fails before confirmation", async () => {
    const owner = await generateKeyPairSigner();
    const refusal = new SolanaError(SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE, {} as never);
    const rpc = {
      getLatestBlockhash: () => ({ send: async () => ({ value: {
        blockhash: "11111111111111111111111111111111", lastValidBlockHeight: 1n,
      } }) }),
      sendTransaction: () => ({ send: async () => { throw refusal; } }),
      getSignatureStatuses: () => { throw new Error("Must not confirm a refused simulation"); },
    } as unknown as SendRpc;
    await expect(sendPawket({ rpc, owner, sponsor: null, instructions: () => [] })).rejects.toBe(refusal);
  });
});

describe("message integrity", () => {
  const first = { blockhash: blockhash("11111111111111111111111111111111"), lastValidBlockHeight: 1n };
  const other = { blockhash: blockhash("SysvarC1ock11111111111111111111111111111111"), lastValidBlockHeight: 1n };
  const paidBy = (payer: Address, lifetime = first) => compileTransaction(pipe(
    createTransactionMessage({ version: "legacy" }),
    (m) => setTransactionMessageFeePayer(payer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(lifetime, m),
  ));
  const rpcThatMustNotSend = () => {
    const send = vi.fn();
    const rpc = {
      getLatestBlockhash: () => ({ send: async () => ({ value: first }) }),
      sendTransaction: () => ({ send }),
      getSignatureStatuses: () => ({ send }),
    } as unknown as SendRpc;
    return { rpc, send };
  };
  const rewriting = (address: Address, into: Transaction) => ({
    address,
    modifyAndSignTransactions: vi.fn(async () => [into]),
  });

  it("refuses a sponsor reply that is not the transaction it was given, before the wallet sees it", async () => {
    const owner = await generateKeyPairSigner();
    const sponsor = await generateKeyPairSigner();
    const signTransactions = vi.fn();
    const { rpc, send } = rpcThatMustNotSend();
    const cosign = async () => getBase64EncodedWireTransaction(await partiallySignTransaction([sponsor.keyPair], paidBy(sponsor.address, other)));
    await expect(sendPawket({ rpc, owner: { ...owner, signTransactions }, sponsor: sponsor.address, instructions: () => [], cosign }))
      .rejects.toThrow(/sponsor returned a different transaction.*Nothing was sent/);
    expect(signTransactions).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("refuses a wallet that changes a transaction the sponsor already signed", async () => {
    const owner = await generateKeyPairSigner();
    const sponsor = await generateKeyPairSigner();
    const { rpc, send } = rpcThatMustNotSend();
    const wallet = rewriting(owner.address, paidBy(sponsor.address, other));
    const cosign = async (wire: string) => getBase64EncodedWireTransaction(await partiallySignTransaction([sponsor.keyPair], getTransactionDecoder().decode(getBase64Encoder().encode(wire))));
    await expect(sendPawket({ rpc, owner: wallet as never, sponsor: sponsor.address, instructions: () => [], cosign }))
      .rejects.toThrow(/wallet changed the transaction.*Nothing was sent/);
    expect(wallet.modifyAndSignTransactions).toHaveBeenCalledOnce();
    expect(send).not.toHaveBeenCalled();
  });

  it("refuses a wallet that changes a prepared transaction another key already signed", async () => {
    const owner = await generateKeyPairSigner();
    const cosigner = await generateKeyPairSigner();
    const { rpc, send } = rpcThatMustNotSend();
    const prepared = await partiallySignTransaction([cosigner.keyPair], paidBy(cosigner.address));
    const wallet = rewriting(owner.address, paidBy(cosigner.address, other));
    await expect(sendPrepared({ rpc, owner: wallet as never, prepare: async () => getBase64EncodedWireTransaction(prepared) }))
      .rejects.toThrow(/wallet changed the transaction.*Nothing was sent/);
    expect(send).not.toHaveBeenCalled();
  });
});

describe("a coin transaction's brackets", () => {
  const lifetime = { blockhash: blockhash("11111111111111111111111111111111"), lastValidBlockHeight: 1n };
  const elsewhere = address("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin");

  async function parties() {
    const [owner, device, stranger] = await Promise.all([generateKeyPairSigner(), generateKeyPairSigner(), generateKeyPairSigner()]);
    const wallet = (await deriveWalletPda(owner.address)).address;
    const bracket = (amount?: bigint, at: { owner?: Address; wallet?: Address; device?: Address } = {}) =>
      getWalletSpendInstruction({ owner: createNoopSigner(at.owner ?? owner.address), wallet: at.wallet ?? wallet, device: at.device ?? device.address, keep: 0n, amount });
    const prepare = (instructions: Instruction[], payer: Address = device.address) => async () => getBase64EncodedWireTransaction(compileTransaction(pipe(
      createTransactionMessage({ version: "legacy" }),
      (m) => setTransactionMessageFeePayer(payer, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(lifetime, m),
      (m) => appendTransactionMessageInstructions(instructions, m),
    )));
    return { owner, device, stranger, wallet, bracket, prepare };
  }

  it("signs nothing unless the device pays the fee and the first and last instructions are its own owner's brackets", async () => {
    const { owner, device, stranger, bracket, prepare } = await parties();
    const trade = getTransferSolInstruction({ source: createNoopSigner(owner.address), destination: elsewhere, amount: 1n });
    const onAnotherProgram = { ...bracket(1n), programAddress: address("cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG") };
    const almostFund = { ...bracket(1n), data: Uint8Array.from(bracket(1n).data!, (byte, i) => (i === 7 ? byte ^ 1 : byte)) };
    const bare = { programAddress: bracket(1n).programAddress };
    const fundsNoOne = { programAddress: bracket(1n).programAddress, data: bracket(1n).data };
    for (const [why, prepared] of [
      ["the owner pays", prepare([bracket(1n), trade, bracket()], owner.address)],
      ["no funding first", prepare([trade, bracket()])],
      ["settled twice, never funded", prepare([bracket(), trade, bracket()])],
      ["no settling last", prepare([bracket(1n), trade])],
      ["brackets on another program", prepare([onAnotherProgram, trade, bracket()])],
      ["a funding that is almost the program's", prepare([almostFund, trade, bracket()])],
      ["an instruction with nothing in it", prepare([bare, trade, bracket()])],
      ["a funding that names no accounts", prepare([fundsNoOne, trade, bracket()])],
      ["someone else's Pawket Wallet", prepare([bracket(1n, { owner: stranger.address }), trade, bracket(undefined, { owner: stranger.address })])],
      ["a wallet that is not the owner's", prepare([bracket(1n, { wallet: elsewhere }), trade, bracket(undefined, { wallet: elsewhere })])],
      ["another device's brackets", prepare([bracket(1n, { device: stranger.address }), trade, bracket(undefined, { device: stranger.address })])],
    ] as const) {
      const sign = vi.fn();
      await expect(
        sendPrepared({ rpc: {} as SendRpc, owner: { ...owner, signTransactions: sign }, extraSigner: { ...device, signTransactions: sign }, prepare: prepared, sponsored: false }),
        why,
      ).rejects.toThrow("This transaction does not use your Pawket Wallet. Nothing was signed or sent.");
      expect(sign, why).not.toHaveBeenCalled();
    }
  });

  it("lets through another program's instruction that only looks like a fee price", async () => {
    const { owner, device, bracket, prepare } = await parties();
    const reached = vi.fn(async () => { throw new Error("the owner was asked"); });
    const lookalike = { programAddress: address("cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG"), data: Uint8Array.of(3, 1, 0, 0, 0, 0, 0, 0, 0) };
    await expect(sendPrepared({ rpc: {} as SendRpc, owner: { ...owner, signTransactions: reached }, extraSigner: device, prepare: prepare([bracket(1n), lookalike, bracket()]), sponsored: false }))
      .rejects.toThrow("the owner was asked");
  });
});

describe("a send that lands", () => {
  const lifetime = { blockhash: "11111111111111111111111111111111", lastValidBlockHeight: 1n };
  const decodeWire = (wire: string) => getTransactionDecoder().decode(getBase64Encoder().encode(wire));

  function landing() {
    const asked: unknown[] = [];
    const sent: { wire: string; options: unknown }[] = [];
    const rpc = {
      getLatestBlockhash: (config: unknown) => ({ send: async (options: { abortSignal?: AbortSignal }) => {
        asked.push(config, options.abortSignal instanceof AbortSignal);
        return { value: lifetime };
      } }),
      sendTransaction: (wire: string, options: unknown) => ({ send: async () => void sent.push({ wire, options }) }),
      getSignatureStatuses: () => ({ send: async () => ({ value: [{ confirmationStatus: "confirmed", err: null }] }) }),
    } as unknown as SendRpc;
    return { rpc, asked, sent };
  }

  it("sends what the sponsor and the wallet both signed, with every stage shown, and says it was sponsored", async () => {
    const [key, sponsor, mint] = await Promise.all([generateKeyPairSigner(), generateKeyPairSigner(), generateKeyPairSigner()]);
    const owner = { ...key, signTransactions: vi.fn(key.signTransactions) };
    const { rpc, asked, sent } = landing();
    const stages: TransactionStage[] = [];
    const given: { owner?: string; payer?: string }[] = [];
    const cosign = async (wire: string) => getBase64EncodedWireTransaction(await partiallySignTransaction([sponsor.keyPair], decodeWire(wire)));
    const result = await sendPawket({
      rpc, owner, sponsor: sponsor.address, cosign, onStage: (stage) => stages.push(stage),
      instructions: ({ owner: signer, payer }) => {
        given.push({ owner: signer.address, payer: payer.address });
        return [getTransferSolInstruction({ source: signer, destination: mint.address, amount: 1n }), {
          programAddress: address("11111111111111111111111111111111"),
          accounts: [{ address: mint.address, role: AccountRole.WRITABLE_SIGNER, signer: mint }],
          data: Uint8Array.of(),
        }];
      },
    });
    expect(given).toEqual([{ owner: owner.address, payer: sponsor.address }]);
    expect(asked).toEqual([{ commitment: "confirmed" }, true]);
    expect(stages).toEqual(["preparing", "signing", "sending", "confirming", "confirmed"]);
    expect(sent).toHaveLength(1);
    expect(sent[0].options).toEqual({ encoding: "base64", preflightCommitment: "confirmed" });
    const landed = decodeWire(sent[0].wire);
    for (const signer of [sponsor, owner, mint]) expect(landed.signatures[signer.address], signer.address).toBeTruthy();
    expect(owner.signTransactions).toHaveBeenCalledOnce();
    expect(result).toEqual({ signature: getSignatureFromTransaction(landed), outcome: "confirmed", sponsored: true, blockhash: lifetime.blockhash });
  });

  it("has the owner pay when no one else does, and leaves no signing timer behind", async () => {
    const owner = await generateKeyPairSigner();
    const { rpc, sent } = landing();
    const given: string[] = [];
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const result = await sendPawket({ rpc, owner, sponsor: null, instructions: ({ payer }) => (given.push(payer.address), []) });
      expect(result).toMatchObject({ outcome: "confirmed", sponsored: false });
      expect(vi.getTimerCount()).toBe(0);
    } finally { vi.useRealTimers(); }
    expect(given).toEqual([owner.address]);
    expect(decodeWire(sent[0].wire).signatures[owner.address]).toBeTruthy();
  });

  it("takes a wallet that signs by handing the transaction back, unchanged", async () => {
    const [owner, sponsor] = await Promise.all([generateKeyPairSigner(), generateKeyPairSigner()]);
    const { rpc, sent } = landing();
    const cosign = async (wire: string) => getBase64EncodedWireTransaction(await partiallySignTransaction([sponsor.keyPair], decodeWire(wire)));
    const wallet = {
      address: owner.address,
      modifyAndSignTransactions: async (transactions: readonly Transaction[]) => Promise.all(transactions.map((transaction) => partiallySignTransaction([owner.keyPair], transaction))),
    };
    const pays = () => [getTransferSolInstruction({ source: createNoopSigner(owner.address), destination: sponsor.address, amount: 1n })];
    await expect(sendPawket({ rpc, owner: wallet as never, sponsor: sponsor.address, cosign, instructions: pays })).resolves.toMatchObject({ outcome: "confirmed" });
    expect(decodeWire(sent[0].wire).signatures[owner.address]).toBeTruthy();
  });

  it("refuses a wallet that can only send, since Pawket's fee payer must sign first", async () => {
    const [owner, sponsor] = await Promise.all([generateKeyPairSigner(), generateKeyPairSigner()]);
    const { rpc, sent } = landing();
    const cosign = async (wire: string) => getBase64EncodedWireTransaction(await partiallySignTransaction([sponsor.keyPair], decodeWire(wire)));
    const sendsOnly = { address: owner.address, signAndSendTransactions: vi.fn() };
    await expect(sendPawket({ rpc, owner: sendsOnly as never, sponsor: sponsor.address, cosign, instructions: () => [] }))
      .rejects.toThrow("This wallet can only send, not sign, so Pawket cannot pay its fee. Nothing was sent.");
    expect(sendsOnly.signAndSendTransactions).not.toHaveBeenCalled();
    expect(sent).toHaveLength(0);
  });

  it("counts a prepared send as sponsored unless told otherwise, and lets a wallet adjust one nobody else signed", async () => {
    const owner = await generateKeyPairSigner();
    const { rpc, sent } = landing();
    const unsigned = (lifetimeHash: string) => compileTransaction(pipe(
      createTransactionMessage({ version: "legacy" }),
      (m) => setTransactionMessageFeePayer(owner.address, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash({ blockhash: blockhash(lifetimeHash), lastValidBlockHeight: 1n }, m),
    ));
    const adjusted = await partiallySignTransaction([owner.keyPair], unsigned("SysvarC1ock11111111111111111111111111111111"));
    const wallet = { address: owner.address, modifyAndSignTransactions: async () => [adjusted] };
    const result = await sendPrepared({ rpc, owner: wallet as never, prepare: async () => getBase64EncodedWireTransaction(unsigned(lifetime.blockhash)) });
    expect(result).toMatchObject({ outcome: "confirmed", sponsored: true, blockhash: "SysvarC1ock11111111111111111111111111111111" });
    expect(sent).toHaveLength(1);
  });

  it("refuses a wallet that changes a prepared transaction another key signed, though the owner has a slot in it too", async () => {
    const [owner, cosigner] = await Promise.all([generateKeyPairSigner(), generateKeyPairSigner()]);
    const { rpc, sent } = landing();
    const both = (lifetimeHash: string) => compileTransaction(pipe(
      createTransactionMessage({ version: "legacy" }),
      (m) => setTransactionMessageFeePayer(cosigner.address, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash({ blockhash: blockhash(lifetimeHash), lastValidBlockHeight: 1n }, m),
      (m) => appendTransactionMessageInstructions([getTransferSolInstruction({ source: createNoopSigner(owner.address), destination: cosigner.address, amount: 1n })], m),
    ));
    const prepared = await partiallySignTransaction([cosigner.keyPair], both(lifetime.blockhash));
    const wallet = { address: owner.address, modifyAndSignTransactions: async () => [both("SysvarC1ock11111111111111111111111111111111")] };
    await expect(sendPrepared({ rpc, owner: wallet as never, prepare: async () => getBase64EncodedWireTransaction(prepared) }))
      .rejects.toThrow(/wallet changed the transaction.*Nothing was sent/);
    expect(sent).toHaveLength(0);
  });

  it("keeps the signature on a refusal that landed, so it can still be looked up", async () => {
    const owner = await generateKeyPairSigner();
    const { rpc, sent } = landing();
    (rpc as unknown as { getSignatureStatuses: unknown }).getSignatureStatuses = () => ({ send: async () => ({ value: [{ confirmationStatus: "confirmed", err: { InstructionError: [0, { Custom: 6002 }] } }] }) });
    const error = await sendPawket({ rpc, owner, sponsor: null, instructions: () => [] }).catch((caught: unknown) => caught);
    expect(error).toMatchObject({ programError: 6002, signature: getSignatureFromTransaction(decodeWire(sent[0].wire)) });
  });
});

describe("the sponsor relay", () => {
  afterEach(() => vi.unstubAllGlobals());

  async function relayed(reply: Response | ((wire: string, sponsor: KeyPairSigner) => Promise<Response>)) {
    const [owner, sponsor] = await Promise.all([generateKeyPairSigner(), generateKeyPairSigner()]);
    const fetched = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async (_url, init) =>
      reply instanceof Response ? reply : reply((JSON.parse(String(init.body)) as { transaction: string }).transaction, sponsor));
    vi.stubGlobal("fetch", fetched);
    const rpc = { getLatestBlockhash: () => ({ send: async () => ({ value: { blockhash: "11111111111111111111111111111111", lastValidBlockHeight: 1n } }) }) } as unknown as SendRpc;
    const outcome = await sendPawket({ rpc, owner: { ...owner, signTransactions: async () => { throw new Error("the owner was asked"); } }, sponsor: sponsor.address, instructions: () => [] }).catch((caught: unknown) => caught);
    return { outcome, fetched, sponsor };
  }

  it("posts the transaction to /api/sponsor as JSON, and hands the wallet what the sponsor signed", async () => {
    const { outcome, fetched } = await relayed(async (wire, sponsor) =>
      Response.json({ transaction: getBase64EncodedWireTransaction(await partiallySignTransaction([sponsor.keyPair], getTransactionDecoder().decode(getBase64Encoder().encode(wire)))) }));
    const [url, init] = fetched.mock.calls[0];
    expect([url, init.method, new Headers(init.headers).get("content-type")]).toEqual(["/api/sponsor", "POST", "application/json"]);
    expect(Object.keys(JSON.parse(String(init.body)))).toEqual(["transaction"]);
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(outcome).toMatchObject({ message: "the owner was asked" });
  });

  it("passes on why the sponsor refused, and its status, or says it did not sign", async () => {
    const refused = await relayed(Response.json({ error: "Too many in a row." }, { status: 429 }));
    expect(refused.outcome).toMatchObject({ name: "RelayError", message: "Too many in a row.", status: 429 });
    const silent = await relayed(new Response("<html>", { status: 502 }));
    expect(silent.outcome).toMatchObject({ name: "RelayError", message: "The sponsor did not sign it. Nothing was sent.", status: 502 });
    const empty = await relayed(Response.json({}));
    expect(empty.outcome).toMatchObject({ name: "RelayError", message: "The sponsor did not sign it. Nothing was sent.", status: 200 });
  });
});
