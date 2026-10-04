"use client";

import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import type { Address } from "@solana/kit";
import { ThemeMenu } from "@/components/pk";
import { useCloset } from "@/lib/market/use-closet";
import { wallet } from "@/lib/solana/browser-client";

/** The shell's room switch, with the Market rooms the connected wallet's closet holds. */
export function RoomMenu() {
  const connected = useConnectedWallet(wallet);
  const closet = useCloset((connected?.account.address as Address | undefined) ?? null);
  return <ThemeMenu owned={new Set(closet.data?.items ?? [])} />;
}
