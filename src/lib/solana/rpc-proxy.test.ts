import { describe, expect, it } from "vitest";
import { getBase58Decoder } from "@solana/kit";
import { PAWKET_ACCOUNTS, PAWKET_PROGRAM_ID } from "./program";
import { checkRpcRequest } from "./rpc-proxy";

const call = (method: string, params?: unknown[]) => ({ jsonrpc: "2.0", id: 1, method, params });
const SYSTEM = "11111111111111111111111111111111";

const pets = getBase58Decoder().decode(Uint8Array.from(PAWKET_ACCOUNTS.pet.discriminator));
const refused = (reason: string) => ({ ok: false, reason });

describe("checkRpcRequest", () => {
  it("passes the calls the app makes", () => {
    for (const method of [
      "getAccountInfo",
      "getBalance",
      "getLatestBlockhash",
      "getMinimumBalanceForRentExemption",
      "getSignatureStatuses",
      "getSignaturesForAddress",
      "getTokenAccountsByOwner",
      "getTransaction",
      "isBlockhashValid",
      "sendTransaction",
    ]) {
      expect(checkRpcRequest(call(method, []))).toEqual({ ok: true, method });
    }
    expect(checkRpcRequest(call("getLatestBlockhash"))).toEqual({ ok: true, method: "getLatestBlockhash" });
    expect(checkRpcRequest(call("getMultipleAccounts", [Array(100).fill(SYSTEM)]))).toEqual({ ok: true, method: "getMultipleAccounts" });
    const scan = { encoding: "base64", filters: [{ dataSize: 130 }, { memcmp: { offset: 0, bytes: pets, encoding: "base58" } }] };
    expect(checkRpcRequest(call("getProgramAccounts", [PAWKET_PROGRAM_ID, scan]))).toMatchObject({ ok: true });
    expect(checkRpcRequest(call("getMultipleAccounts", [[SYSTEM, SYSTEM]]))).toMatchObject({ ok: true });
  });

  it("is not an open RPC: no other method, no other program's scan, no batches, no giant reads", () => {
    expect(checkRpcRequest(call("requestAirdrop", [SYSTEM, 1]))).toMatchObject({ ok: false });
    expect(checkRpcRequest(call("getProgramAccounts", [SYSTEM, {}]))).toMatchObject({ ok: false });
    expect(checkRpcRequest(call("getProgramAccounts", [PAWKET_PROGRAM_ID, {}]))).toMatchObject({ ok: false });
    expect(checkRpcRequest(call("getProgramAccounts", [PAWKET_PROGRAM_ID, { filters: [{ memcmp: { offset: 8, bytes: SYSTEM } }] }]))).toMatchObject({ ok: false });
    expect(checkRpcRequest([call("getBalance", [SYSTEM])])).toMatchObject({ ok: false });
    expect(checkRpcRequest(call("getMultipleAccounts", [Array(101).fill(SYSTEM)]))).toMatchObject({ ok: false });
    expect(checkRpcRequest({ method: "getBalance" })).toMatchObject({ ok: false });
    expect(checkRpcRequest(null)).toMatchObject({ ok: false });
  });

  it("scans only Pawket's program, by one of its kinds at the start of the account", () => {
    const scan = { filters: [{ memcmp: { offset: 0, bytes: pets } }] };
    expect(checkRpcRequest(call("getProgramAccounts", [SYSTEM, scan]))).toEqual(refused("Only Pawket's program is scanned here."));
    const kindLater = { filters: [{ memcmp: { offset: 8, bytes: pets } }] };
    for (const config of [kindLater, undefined, null, { filters: [null] }, { filters: [{ memcmp: { offset: 0, bytes: 7 } }] }]) {
      expect(checkRpcRequest(call("getProgramAccounts", [PAWKET_PROGRAM_ID, config]))).toEqual(refused("A scan names one of Pawket's account kinds."));
    }
  });

  it("says what it refuses, and quotes at most 40 characters of a method it does not ask", () => {
    expect(checkRpcRequest(7)).toEqual(refused("One JSON-RPC request at a time."));
    expect(checkRpcRequest({ jsonrpc: "2.0", method: 7 })).toEqual(refused("That is not a JSON-RPC request."));
    expect(checkRpcRequest(call(`get${"x".repeat(60)}`))).toEqual(refused(`Pawket does not ask get${"x".repeat(37)}.`));
    expect(checkRpcRequest({ jsonrpc: "2.0", method: "getBalance", params: { pubkey: SYSTEM } })).toEqual(refused("Params are a list."));
    expect(checkRpcRequest(call("getMultipleAccounts", [Array(101).fill(SYSTEM)]))).toEqual(refused("At most 100 accounts at a time."));
    expect(checkRpcRequest(call("getMultipleAccounts", [SYSTEM]))).toEqual(refused("At most 100 accounts at a time."));
  });
});
