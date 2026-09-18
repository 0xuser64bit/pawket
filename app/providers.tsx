import type { ReactNode } from "react";

/**
 * Client providers live here so `app/layout.tsx` stays a Server Component.
 * Solana wallet providers are added in the wallet-integration commit;
 * this passthrough keeps the App Router server/client boundary explicit.
 */
export default function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
