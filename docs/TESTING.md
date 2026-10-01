# Testing

## Layers

| Layer                          | Where                                   | Runner   |
| ------------------------------ | --------------------------------------- | -------- |
| The program, every instruction | `programs/pawket/tests/program/`        | cargo + LiteSVM (`pnpm program:test`) |
| Program ↔ browser math         | `src/lib/game/lockstep.txt`, replayed by `lockstep.rs` and `lockstep.test.ts` | both |
| Game math                      | `src/lib/game/*.test.ts`                | Vitest   |
| Solana PDAs / instruction bytes| `src/lib/solana/*.test.ts`              | Vitest   |
| `program.ts` against the IDL   | `src/lib/solana/program.test.ts`        | Vitest   |
| Account decoding (hand-laid bytes) | `src/lib/solana/accounts.test.ts`   | Vitest   |
| What the sponsor signs         | `src/lib/solana/sponsor.test.ts`        | Vitest (node) |
| The whole path on devnet       | `src/lib/solana/devnet.test.ts`         | `pnpm e2e:devnet` (skipped otherwise) |
| The path through the screens   | `e2e/chain.spec.ts` + `e2e/test-wallet.ts` | `PAWKET_DEVNET=1 pnpm e2e e2e/chain.spec.ts` |
| Env / cluster / format / errors| colocated `*.test.ts`                   | Vitest   |
| Presentational components      | `src/components/*.test.tsx`             | Vitest + Testing Library |
| Guest record, wardrobe, games  | `src/lib/guest`, `closet`, `play`       | Vitest   |
| Player look, moment registry (checked against the shipped GLBs' clips) | `src/lib/player`, `src/lib/room` | Vitest |
| 3D room: palette ↔ `:root` tokens, every wearable drawn, two-bone reach | `src/components/room3d/*.test.ts` | Vitest |
| 3D room: live room, emote, care moment after save, flat choice, no-WebGL fallback, reduced motion, saved look, empty room, 320px | `e2e/room.spec.ts` | Playwright |
| Shell, adopt, care, wardrobe, playground, guild boundary, park, passport miss, connect sheet, health | `e2e/smoke.spec.ts` | Playwright |
| Layout: no sideways scroll at 320/375/768, dock placement | `e2e/layout.spec.ts` | Playwright |

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
- Touch layout → add the screen to `SCREENS` in `e2e/layout.spec.ts` if it
  is new; the spec fails on any page wider than a 320px phone.
- Wallet signing is verified against devnet with `e2e/test-wallet.ts` (a
  Wallet Standard wallet that exists only in tests) or a real wallet, never
  mocked in unit tests. The default e2e run needs no wallet and no network.
- Touch the program → `pnpm program:test`. Touch its math → regenerate
  nothing: change `lockstep.txt` by hand, and both replays must agree.
- Touch the sponsor's rules → a refusal test for each new way in.
- Touch the moment registry or the clips → `moments.test.ts` reads the
  built GLBs, so run `pnpm assets:3d` first when the pipeline changed.
  `pnpm assets:3d` itself fails on any glTF-Validator error or blown budget.
- The 3D room is verified by what it says (its status line, its label) and
  what can be pressed, never by pixels.

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
