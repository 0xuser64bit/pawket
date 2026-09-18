"use client";

import { pawketClient } from "@/lib/solana/browser-client";
import { ClientProvider } from "@solana/react";
import type { ReactNode } from "react";

/**
 * Client providers live here so `app/layout.tsx` stays a Server Component.
 */
export default function Providers({ children }: { children: ReactNode }) {
  return <ClientProvider client={pawketClient}>{children}</ClientProvider>;
}
