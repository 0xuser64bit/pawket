import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { Address } from "@solana/kit";

const read = vi.hoisted(() => vi.fn());
vi.mock("@/lib/solana/accounts", () => ({ fetchCloset: read }));
vi.mock("@/lib/solana/browser-client", () => ({ rpc: {} }));
import { useCloset } from "./use-closet";

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
