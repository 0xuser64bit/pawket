"use client";

import type { Address } from "@solana/kit";
import { ThemeButton } from "@/components/pk";
import { useCloset } from "@/lib/market/use-closet";
import { useConnected } from "@/lib/solana/browser-client";

/** The shell's room switch, with the Market rooms the connected wallet's closet holds. */
export function RoomButton() {
  const connected = useConnected();
  const closet = useCloset((connected?.account.address as Address | undefined) ?? null);
  return <ThemeButton owned={new Set(closet.data?.items ?? [])} />;
}
