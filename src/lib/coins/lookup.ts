/** The lookup-table facts that decide whether a graduation may use it. */
export interface CoinLookupTable {
  key: { toBase58(): string };
  state: {
    deactivationSlot: bigint;
    authority?: unknown;
    addresses: readonly unknown[];
  };
}

const U64_MAX = (1n << 64n) - 1n;

/**
 * A graduation may only use the configured table while it is frozen and
 * active. An authority could still rewrite its addresses, and a deactivated
 * table is no longer loaded by the runtime.
 */
export function isUsableCoinLookup(table: CoinLookupTable, expected: string): boolean {
  return (
    table.key.toBase58() === expected &&
    table.state.addresses.length > 0 &&
    table.state.deactivationSlot === U64_MAX &&
    table.state.authority === undefined
  );
}
