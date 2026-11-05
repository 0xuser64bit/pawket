import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { Address } from "@solana/kit";
import { CareActionType, PetPersonality, PetSpecies } from "@/lib/game/enums";
import type { PetOnChain } from "@/lib/solana/accounts";
import type { SendResult } from "@/lib/solana/send";
import type { TxState } from "@/lib/solana/use-send";
import type { OwnedPetsRefresh } from "./use-companion";
import { useChainCare } from "./use-chain-care";
import { ChainCare } from "./chain-care";

const OWNER = "11111111111111111111111111111111" as Address;
const PET = "So11111111111111111111111111111111111111112" as Address;
function entry({ address = PET, owner = OWNER, at = 0, xp = 90, cares = 9 } = {}): PetOnChain {
  return {
    pet: { address, owner, name: "Mango", species: PetSpecies.LunaCat, personality: PetPersonality.Curious, birthTimestamp: 1_700_000_000, statsUpdatedAt: 1_700_000_000 + at, xp, level: 1, stats: { hunger: 80, happiness: 80, energy: 80, hygiene: 80 }, wearing: 0, lastCareAt: { feed: at, play: 0, groom: 0, rest: 0 } },
    passport: { address: OWNER, owner, pet: address, eventCount: cares, careCount: cares, plays: 0, streak: 1, bestStreak: 1, lastActiveDay: 20_000, lastPlayDay: 0, recent: at ? [{ action: CareActionType.Feed, at }] : [] },
    member: null,
  };
}
const fresh = entry({ at: 1_800_000_000, xp: 105, cares: 10 });
const receipt = { outcome: "confirmed", signature: "care-signature", sponsored: true, blockhash: "hash", programs: [] } as SendResult;
const success = (pets: PetOnChain[]): OwnedPetsRefresh => ({ status: "success", owner: OWNER, pets });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
function setup() {
  const send = vi.fn(async () => receipt);
  const refresh = vi.fn<(_: AbortSignal) => Promise<OwnedPetsRefresh>>().mockResolvedValue(success([fresh]));
  const recorded = vi.fn();
  const initial = { owner: OWNER as Address | null, active: entry() as PetOnChain | null, tx: { stage: "idle" } as TxState };
  const hook = renderHook((props) => useChainCare({ ...props, refresh, onRecorded: recorded }), { initialProps: initial });
  return { ...hook, send, refresh, recorded, initial };
}
afterEach(() => vi.useRealTimers());

it("waits for a fresh authoritative record to be rendered before reporting progression exactly once", async () => {
  const h = setup();
  const read = deferred<OwnedPetsRefresh>();
  h.refresh.mockReturnValueOnce(read.promise);
  await act(async () => { void h.result.current.start(CareActionType.Feed, h.send); });
  expect(h.result.current.state?.stage).toBe("reading");
  expect(h.recorded).not.toHaveBeenCalled();
  await act(async () => { read.resolve(success([fresh])); });
  expect(h.result.current.busy).toBe(true);
  expect(h.recorded).not.toHaveBeenCalled();
  h.rerender({ ...h.initial, active: fresh });
  expect(h.recorded).toHaveBeenCalledOnce();
  expect(h.recorded.mock.calls[0][0]).toMatchObject({ before: { xp: 90 }, after: { xp: 105 }, action: "feed" });
  h.rerender({ ...h.initial, active: { ...fresh } });
  expect(h.recorded).toHaveBeenCalledOnce();
  expect(h.result.current.busy).toBe(false);
});

it("retries stale, missing and failed reads within a bound, then offers a read-only retry", async () => {
  vi.useFakeTimers();
  const h = setup();
  h.refresh.mockResolvedValueOnce(success([entry()])).mockResolvedValueOnce({ status: "error", error: new Error("offline") }).mockResolvedValueOnce(success([]));
  await act(async () => { void h.result.current.start(CareActionType.Feed, h.send); });
  await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
  expect(h.result.current.state?.stage).toBe("retry");
  expect(h.recorded).not.toHaveBeenCalled();
  await act(async () => { await h.result.current.start(CareActionType.Feed, h.send); });
  expect(h.send).toHaveBeenCalledOnce();
  await act(async () => { await h.result.current.retry(); });
  h.rerender({ ...h.initial, active: fresh });
  expect(h.recorded).toHaveBeenCalledOnce();
  expect(h.send).toHaveBeenCalledOnce();
});

it("bounds a read that never settles and ignores its late answer", async () => {
  vi.useFakeTimers();
  const h = setup();
  const read = deferred<OwnedPetsRefresh>();
  h.refresh.mockReturnValue(read.promise);
  await act(async () => { void h.result.current.start(CareActionType.Feed, h.send); });
  await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
  expect(h.result.current.state?.stage).toBe("retry");
  await act(async () => { read.resolve(success([fresh])); });
  h.rerender({ ...h.initial, active: fresh });
  expect(h.recorded).not.toHaveBeenCalled();
});

it("reconciles an unknown send when its same receipt later confirms, without another transaction", async () => {
  const h = setup();
  h.send.mockResolvedValue({ ...receipt, outcome: "unknown" });
  await act(async () => { await h.result.current.start(CareActionType.Feed, h.send); });
  expect(h.result.current.state?.stage).toBe("unknown");
  expect(h.refresh).not.toHaveBeenCalled();
  h.rerender({ ...h.initial, tx: { stage: "confirmed", signature: "another-receipt" } });
  expect(h.refresh).not.toHaveBeenCalled();
  await act(async () => { h.rerender({ ...h.initial, tx: { stage: "confirmed", signature: receipt.signature } }); });
  h.rerender({ ...h.initial, active: fresh, tx: { stage: "confirmed", signature: receipt.signature } });
  expect(h.recorded).toHaveBeenCalledOnce();
  expect(h.send).toHaveBeenCalledOnce();
});

it.each(["pet", "account", "unmount"])("discards feedback after a %s switch, including switching back before a late read", async (switching) => {
  const h = setup();
  const read = deferred<OwnedPetsRefresh>();
  h.refresh.mockReturnValueOnce(read.promise);
  await act(async () => { void h.result.current.start(CareActionType.Feed, h.send); });
  if (switching === "unmount") h.unmount();
  else {
    h.rerender(switching === "pet" ? { ...h.initial, active: entry({ address: OWNER }) } : { ...h.initial, owner: PET, active: entry({ owner: PET }) });
    h.rerender({ ...h.initial, active: fresh });
  }
  await act(async () => { read.resolve(success([fresh])); });
  expect(h.recorded).not.toHaveBeenCalled();
});

it("rejects a newer passport paired with an unchanged pet, or a different owner's pet", async () => {
  vi.useFakeTimers();
  const h = setup();
  h.refresh.mockResolvedValueOnce(success([{ ...fresh, pet: entry().pet }])).mockResolvedValueOnce(success([entry({ owner: PET, at: 1_800_000_000, xp: 105, cares: 10 })])).mockResolvedValueOnce(success([fresh]));
  await act(async () => { void h.result.current.start(CareActionType.Feed, h.send); });
  await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
  h.rerender({ ...h.initial, active: fresh });
  expect(h.recorded).toHaveBeenCalledOnce();
  expect(h.refresh).toHaveBeenCalledTimes(3);
});

it("releases a declined or definitively failed send without reading or claiming care", async () => {
  const h = setup();
  h.send.mockResolvedValueOnce(null as unknown as SendResult);
  await act(async () => { await h.result.current.start(CareActionType.Feed, h.send); });
  expect(h.result.current.busy).toBe(false);
  expect(h.refresh).not.toHaveBeenCalled();
  h.send.mockResolvedValueOnce({ ...receipt, outcome: "unknown" });
  await act(async () => { await h.result.current.start(CareActionType.Feed, h.send); });
  h.rerender({ ...h.initial, tx: { stage: "failed", signature: receipt.signature } });
  expect(h.result.current.busy).toBe(false);
  expect(h.recorded).not.toHaveBeenCalled();
});

it.each(["sending", "reading"])("discards %s feedback when a preserved page deactivates and reactivates the same controller", async (stage) => {
  const care = new ChainCare(OWNER, PET);
  const deactivate = care.activate();
  const sent = deferred<SendResult | null>();
  const read = deferred<OwnedPetsRefresh>();
  const send = vi.fn(() => stage === "sending" ? sent.promise : Promise.resolve(receipt));
  const refresh = vi.fn(() => read.promise);
  const recorded = vi.fn();
  const pending = care.start({ before: entry(), action: CareActionType.Feed, refresh, onRecorded: recorded }, send);
  await Promise.resolve();
  expect(care.snapshot()?.stage).toBe(stage);

  deactivate();
  const deactivateAgain = care.activate();
  expect(care.snapshot()).toBeNull();
  sent.resolve(receipt);
  read.resolve(success([fresh]));
  await pending;
  care.observe(fresh, { stage: "confirmed", signature: receipt.signature });
  expect(care.snapshot()).toBeNull();
  expect(recorded).not.toHaveBeenCalled();
  expect(send).toHaveBeenCalledOnce();
  expect(refresh).toHaveBeenCalledTimes(stage === "reading" ? 1 : 0);
  deactivateAgain();
});
