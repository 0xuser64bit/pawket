"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import type { Address } from "@solana/kit";
import type { CareActionType } from "@/lib/game/enums";
import type { PetOnChain } from "@/lib/solana/accounts";
import type { SendResult } from "@/lib/solana/send";
import type { TxState } from "@/lib/solana/use-send";
import type { OwnedPetsRefresh } from "./use-companion";
import { ChainCare, type RecordedCare } from "./chain-care";

export function useChainCare({ owner, active, tx, refresh, onRecorded }: {
  owner: Address | null;
  active: PetOnChain | null;
  tx?: TxState;
  refresh: (signal: AbortSignal) => Promise<OwnedPetsRefresh>;
  onRecorded: (care: RecordedCare) => void;
}) {
  const petAddress = active?.pet.address;
  const care = useMemo(() => new ChainCare(owner, petAddress), [owner, petAddress]);
  const state = useSyncExternalStore(care.subscribe, care.snapshot, () => null);
  useEffect(() => care.activate(), [care]);
  useEffect(() => care.observe(active, tx), [care, state, active, tx]);
  const start = useCallback(async (action: CareActionType, send: () => Promise<SendResult | null>) => {
    if (active) await care.start({ before: active, action, refresh, onRecorded }, send);
  }, [care, active, refresh, onRecorded]);
  const retry = useCallback(() => care.retry(), [care]);
  return { start, retry, state, busy: state !== null };
}
