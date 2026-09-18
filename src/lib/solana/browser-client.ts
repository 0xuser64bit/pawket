"use client";

import { getPublicEnv } from "@/config/env";
import { createPawketClient } from "./client";

/**
 * One wallet-backed Solana client for the whole app, created once at module
 * scope. The connected Wallet Standard wallet becomes fee payer + identity.
 * Published via `ClientProvider` in `app/providers.tsx`; leaf components read
 * it with `useClient<AppClient>()`.
 */
const env = getPublicEnv();

export const pawketClient = createPawketClient({
  cluster: env.solanaCluster,
  rpcUrl: env.solanaRpcUrl,
});

export type AppClient = Awaited<typeof pawketClient>;
