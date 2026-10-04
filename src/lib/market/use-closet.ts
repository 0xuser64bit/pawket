"use client";

import { useCallback } from "react";
import { useRequest } from "@solana/react";
import type { Address } from "@solana/kit";
import { fetchCloset } from "@/lib/solana/accounts";
import { rpc } from "@/lib/solana/browser-client";

/**
 * What the connected wallet bought in the Market, read from its closet on
 * Solana; null data before its first purchase. Read again (`refresh`) after
 * a purchase is confirmed — nothing here is assumed before Solana says so.
 */
export function useCloset(owner: Address | null) {
  const fetcher = useCallback(() => fetchCloset(rpc, owner!), [owner]);
  return useRequest(owner ? fetcher : null);
}
