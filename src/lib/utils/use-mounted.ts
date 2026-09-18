import { useSyncExternalStore } from "react";

/**
 * True only after hydration. Gate wallet-state-dependent UI on this so the
 * server and the first client render produce identical HTML — wallet stores
 * resolve synchronously in the browser and would otherwise mismatch SSR.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
