# Testing

## Layers

| Layer                          | Where                                   | Runner   |
| ------------------------------ | --------------------------------------- | -------- |
| Game math                      | `src/lib/game/*.test.ts`                | Vitest   |
| Solana PDAs / instruction bytes| `src/lib/solana/*.test.ts`              | Vitest   |
| Env / cluster / format / errors| colocated `*.test.ts`                   | Vitest   |
| Presentational components      | `src/components/*.test.tsx`             | Vitest + Testing Library |
| Shell + health (no wallet)     | `e2e/smoke.spec.ts`                     | Playwright |

```sh
pnpm test       # Vitest, single run
pnpm e2e        # Playwright (starts dev server, asserts shell only)
pnpm verify     # typecheck + lint + test + build
```

## Mandatory coverage

- Touch game math → extend `math.test.ts` (exact values, not snapshots).
- Touch PDA/instruction code → lock seeds, account metas (order, role),
  discriminator bytes, and arg encoding in the colocated test.
- Touch a component → extend its test, or exercise manually and say so.
- Wallet signing flows are verified in the browser (devnet), never in unit
  tests. E2E asserts shell presence, not signatures.

## Conventions

- Colocate tests (`foo.test.ts` next to `foo.ts`). Pure functions, exact
  objects, deterministic clocks (inject `now`, never mock timers globally).
- PDA tests assert determinism (same input → same address) and separation
  (different name → different address), plus validation rejections.
- If a locked value changes, the seeds or encoding changed — that is a
  breaking on-chain change, not a test fix. Stop and confirm intent.

## What not to test

Pixel positions, gradient strings, RPC internals, Jupiter/Mercuryo (not
implemented), mainnet behavior.
