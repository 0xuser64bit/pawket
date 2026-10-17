import { describe, expect, it } from "vitest";
import { getBase58Decoder } from "@solana/kit";
import { PAWKET_ACCOUNTS, PAWKET_PROGRAM_ID } from "./program";
import { checkRpcRequest } from "./rpc-proxy";

const call = (method: string, params?: unknown[]) => ({ jsonrpc: "2.0", id: 1, method, params });
const SYSTEM = "11111111111111111111111111111111";

describe("checkRpcRequest", () => {
  it("passes the calls the app makes", () => {
    for (const method of ["getBalance", "getLatestBlockhash", "sendTransaction", "getSignatureStatuses", "getTransaction", "isBlockhashValid"]) {
      expect(checkRpcRequest(call(method, []))).toEqual({ ok: true, method });
    }
    const pets = getBase58Decoder().decode(Uint8Array.from(PAWKET_ACCOUNTS.pet.discriminator));
    const scan = { encoding: "base64", filters: [{ dataSize: 130 }, { memcmp: { offset: 0, bytes: pets, encoding: "base58" } }] };
    expect(checkRpcRequest(call("getProgramAccounts", [PAWKET_PROGRAM_ID, scan]))).toMatchObject({ ok: true });
    expect(checkRpcRequest(call("getMultipleAccounts", [[SYSTEM, SYSTEM]]))).toMatchObject({ ok: true });
  });

  it("is not an open RPC: no other method, no other program's scan, no batches, no giant reads", () => {
    expect(checkRpcRequest(call("requestAirdrop", [SYSTEM, 1]))).toMatchObject({ ok: false });
    expect(checkRpcRequest(call("getProgramAccounts", [SYSTEM, {}]))).toMatchObject({ ok: false });
    // The whole program in one read, or a scan that names no kind of Pawket's: refused.
    expect(checkRpcRequest(call("getProgramAccounts", [PAWKET_PROGRAM_ID, {}]))).toMatchObject({ ok: false });
    expect(checkRpcRequest(call("getProgramAccounts", [PAWKET_PROGRAM_ID, { filters: [{ memcmp: { offset: 8, bytes: SYSTEM } }] }]))).toMatchObject({ ok: false });
    expect(checkRpcRequest([call("getBalance", [SYSTEM])])).toMatchObject({ ok: false });
    expect(checkRpcRequest(call("getMultipleAccounts", [Array(101).fill(SYSTEM)]))).toMatchObject({ ok: false });
    expect(checkRpcRequest({ method: "getBalance" })).toMatchObject({ ok: false });
    expect(checkRpcRequest(null)).toMatchObject({ ok: false });
  });
});
