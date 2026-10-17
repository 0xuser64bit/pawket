# Testing

## Layers

| Layer                          | Where                                   | Runner   |
| ------------------------------ | --------------------------------------- | -------- |
| The program, every instruction | `programs/pawket/tests/program/` (incl. `market.rs`, `gatherings.rs`, `guestbook.rs`) | cargo + LiteSVM (`pnpm program:test`) |
| Program ↔ browser math         | `src/lib/game/lockstep.txt`, replayed by `lockstep.rs` and `lockstep.test.ts` | both |
| Game math                      | `src/lib/game/*.test.ts`                | Vitest   |
| Solana PDAs / instruction bytes| `src/lib/solana/*.test.ts`              | Vitest   |
| `program.ts` against the IDL   | `src/lib/solana/program.test.ts`        | Vitest   |
| Account decoding (hand-laid bytes) | `src/lib/solana/accounts.test.ts`   | Vitest   |
| What the sponsor signs         | `src/lib/solana/sponsor.test.ts`        | Vitest (node) |
| The whole path on devnet       | `src/lib/solana/devnet.test.ts`         | `pnpm e2e:devnet` (skipped otherwise; needs the test funder and a sponsor above 2 SOL, `docs/ENVIRONMENT.md`) |
| A guild coin's life on devnet  | `src/server/coins/devnet.test.ts`       | `pnpm e2e:coins` (skipped otherwise) |
| Coin presets ↔ Meteora's validation, stages, copy | `src/server/coins/curve.test.ts`, `src/lib/coins/*.test.ts` | Vitest |
| The path through the screens   | `e2e/chain.spec.ts` + `e2e/test-wallet.ts` | `PAWKET_DEVNET=1 pnpm e2e --workers=1 e2e/chain.spec.ts` |
| A coin's trades through its page | `e2e/coins.spec.ts` (buy and sell on a curve, buy in a graduated pool) | `PAWKET_DEVNET=1 pnpm e2e --workers=1 e2e/coins.spec.ts` |
| Documentation links and file references | `src/config/docs.test.ts` | Vitest (node) |
| Bundled font copyright and licenses | `src/config/docs.test.ts` | Vitest (node) |
| Env / cluster / format / errors| colocated `*.test.ts`                   | Vitest   |
| Counts carry only fixed words, honour the opt-out, GPC and DNT, and keep addresses out of page URLs | `src/lib/analytics/events.test.ts` | Vitest |
| Presentational components      | `src/components/*.test.tsx`             | Vitest + Testing Library |
| Guest record, wardrobe, games  | `src/lib/guest`, `closet`, `play`       | Vitest   |
| Player look, moment registry (checked against the shipped GLBs' clips) | `src/lib/player`, `src/lib/room` | Vitest |
| 3D room: palette ↔ `:root` tokens, every wearable drawn, two-bone reach | `src/components/room3d/*.test.ts` | Vitest |
| 3D room: live room, emote, care moment after save, flat choice, no-WebGL fallback, reduced motion, saved look, empty room, 320px | `e2e/room.spec.ts` | Playwright |
| Shell, adopt, care, wardrobe, playground, guild boundary, park, passport miss, connect sheet, health | `e2e/smoke.spec.ts` | Playwright |
| Layout: no sideways scroll at 320/375/768, dock placement | `e2e/layout.spec.ts` | Playwright |
| Local Profile tabs/history, a slow place's top bar with the link left as it was, whole-card guild links, founding-page rails and its head stacked on a 320px phone, and shared Home sound | `e2e/experience.spec.ts` | Playwright |
| Day/time chips and calendar (past days out of reach, keyboard, 12/24-hour), guild roles and membership grouping, camera-facing photo poses, the toast stack (fold, fan, flick, leave), the send toast's own line, Home's music box and its quiet when hidden, muted or left | colocated component tests | Vitest |
| Classic scrollbar space: 44px touch targets and dock centring | `e2e/scrollbars.spec.ts` | Playwright, including hosts with overlay scrollbars |
| Mobile touch: sheet focus/close, short viewport, Catch drag, game pause/resume and hidden-page pause | `e2e/mobile.spec.ts` | Playwright Chromium touch emulation (not physical-device proof) |
| The page's half of the Android bridge; the app and the site agree on the package | `src/lib/native/*.test.ts` | Vitest |
| The Android shell's checks: origin, picture, file name | `android/app/src/test/…/BoundaryTest.kt` | `cd android && ./gradlew testDebugUnitTest` |
| The Android app on a phone: wallet, sends, bridge, lifecycle | the physical-device release checklist in `docs/ANDROID.md` | emulator or device, with a Mobile Wallet Adapter wallet |

```sh
pnpm test       # Vitest, single run
pnpm e2e        # Playwright (starts dev server, asserts shell only)
pnpm verify     # typecheck + lint + test + build
CI=1 pnpm e2e --workers=2  # test the production build created by verify
gitleaks git --redact --log-opts=--all .  # every local Git ref, including old commits
```

## Mandatory coverage

- Touch game math → extend `math.test.ts` (exact values, not snapshots).
- Touch PDA/instruction code → lock seeds, account metas (order, role),
  discriminator bytes, and arg encoding in the colocated test.
- Delete or rename a document → update its links and run `docs.test.ts`.
- Touch a component → extend its test, or exercise manually and say so.
- Touch layout → add the screen to `SCREENS` in `e2e/layout.spec.ts` if it
  is new; the spec fails on any page wider than a 320px phone.
- Wallet compatibility is verified on devnet with `e2e/test-wallet.ts` or
  a real wallet. Unit tests of routing and errors do not prove wallet
  compatibility. Default browser tests do not sign; public chain pages may
  read RPC and must also handle an unavailable network honestly.
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

## Verification boundaries

The GitHub `Verify` workflow runs `pnpm verify`, Chromium browser tests against
that production build, a full fetched-history Gitleaks scan, the program's
build and LiteSVM suite (failing when the built IDL differs from the committed
one), the Android shell's unit tests and lint, and `pnpm audit` and `cargo
audit`. Playwright starts `pnpm start` when `CI` is set; build first when
reproducing CI locally. Without `CI`, it starts or reuses the development
server. The workflow has no signing secrets and does not run the opt-in devnet
suites or the Android release and device checks; changes to those layers still
require their owning checks. The `Watch` workflow checks the live site, its RPC
and the sponsor's float every four hours once `main` carries it. Gitleaks extends its
default rules with Solana CLI keypair-array detection; its only value
exceptions are two public browser-storage names from early commits.

Avoid tests tied only to decorative pixels or gradient strings. Test layout,
accessibility and observable player behavior. Unit mocks do not establish RPC
provider or consumer-wallet compatibility. Default suites do not verify mainnet
or physical Android behavior; those need their separately authorized release
procedures.
