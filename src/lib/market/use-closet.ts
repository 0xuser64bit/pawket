"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useRequest } from "@solana/react";
import type { Address } from "@solana/kit";
import { fetchCloset } from "@/lib/solana/accounts";
import { rpc } from "@/lib/solana/browser-client";

const revisions = new Map<Address, number>();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

export function useCloset(owner: Address | null) {
  const revision = useSyncExternalStore(subscribe, () => owner ? revisions.get(owner) ?? 0 : 0, () => 0);
  const fetcher = useCallback(() => fetchCloset(rpc, owner!), [owner, revision]); // eslint-disable-line react-hooks/exhaustive-deps
  const request = useRequest(owner ? fetcher : null);
  const refresh = useCallback(() => {
    if (!owner) return;
    revisions.set(owner, (revisions.get(owner) ?? 0) + 1);
    for (const listener of listeners) listener();
  }, [owner]);
  return { ...request, refresh };
}
