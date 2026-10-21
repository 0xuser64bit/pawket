"use client";

import { useEffect } from "react";
import { THEME_KEY, isThemeId, roomOpen } from "@/config/themes";
import { setTheme, useThemeChoice } from "@/components/pk";
import type { Address } from "@solana/kit";
import { ThemeButton } from "@/components/pk";
import { useCloset } from "@/lib/market/use-closet";
import { useConnected } from "@/lib/solana/browser-client";

export function RoomButton() {
  const connected = useConnected();
  const closet = useCloset((connected?.account.address as Address | undefined) ?? null);
  const choice = useThemeChoice();
  useEffect(() => {
    if (connected && (closet.data === undefined || closet.error)) return;
    const owned = new Set(closet.data?.items ?? []);
    let saved: string | null = null;
    try { saved = window.localStorage.getItem(THEME_KEY); } catch {}
    const next = isThemeId(saved) && roomOpen(saved, owned) ? saved : isThemeId(choice) && !roomOpen(choice, owned) ? "system" : null;
    if (!next || next === choice) return;
    let active = true;
    queueMicrotask(() => { if (active) setTheme(next); });
    return () => { active = false; };
  }, [connected, closet.data, closet.error, choice]);
  return <ThemeButton owned={new Set(closet.data?.items ?? [])} />;
}
