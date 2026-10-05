"use client";

import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import type { Address } from "@solana/kit";
import { ThemeButton } from "@/components/pk";
import { useCloset } from "@/lib/market/use-closet";
import { wallet } from "@/lib/solana/browser-client";

/** The shell's room switch, with the Market rooms the connected wallet's closet holds. */
export function RoomButton() {
  const connected = useConnectedWallet(wallet);
  const closet = useCloset((connected?.account.address as Address | undefined) ?? null);
  return <ThemeButton owned={new Set(closet.data?.items ?? [])} />;
}
