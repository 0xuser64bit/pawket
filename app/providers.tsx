"use client";

import type { ReactNode } from "react";
import { useBarsFollowRoom } from "@/lib/native/android";

/**
 * Client providers live here so `app/layout.tsx` stays a Server Component.
 * The Solana client is not mounted: no screen sends a transaction, and
 * loading the wallet stack on every page would be a cost with no UI.
 * When a send screen exists, publish `pawketClient` from here. In the
 * Android app, the system bars follow the room from here too.
 */
export default function Providers({ children }: { children: ReactNode }) {
  useBarsFollowRoom();
  return children;
}
