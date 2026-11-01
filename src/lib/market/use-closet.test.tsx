import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { Address } from "@solana/kit";

const read = vi.hoisted(() => vi.fn());
vi.mock("@/lib/solana/accounts", () => ({ fetchCloset: read }));
vi.mock("@/lib/solana/browser-client", () => ({ rpc: {} }));
import { useCloset } from "./use-closet";

afterEach(() => vi.clearAllMocks());

it("aborts obsolete owner and unmounted reads instead of leaving requests running", async () => {
  const signals: AbortSignal[] = [];
  read.mockImplementation((_rpc, _owner, signal) => {
    signals.push(signal);
    return new Promise(() => {});
  });
  const hook = renderHook(({ owner }) => useCloset(owner), { initialProps: { owner: "11111111111111111111111111111111" as Address | null } });
  await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
  expect(signals[0]).toBeInstanceOf(AbortSignal);
  hook.rerender({ owner: "So11111111111111111111111111111111111111112" as Address });
  await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
  expect(signals[0].aborted).toBe(true);
  expect(signals[1].aborted).toBe(false);
  hook.unmount();
  expect(signals[1].aborted).toBe(true);
});

it("refreshes the shell and photo entitlements when a purchase refreshes the Market", async () => {
  const owner = "11111111111111111111111111111111" as Address;
  read.mockResolvedValue(null);
  const market = renderHook(() => useCloset(owner));
  const shell = renderHook(() => useCloset(owner));
  await waitFor(() => expect(shell.result.current.data).toBeNull());
  read.mockResolvedValue({ items: [66, 83] });
  act(() => market.result.current.refresh());
  await waitFor(() => {
    expect(market.result.current.data?.items).toEqual([66, 83]);
    expect(shell.result.current.data?.items).toEqual([66, 83]);
  });
});
