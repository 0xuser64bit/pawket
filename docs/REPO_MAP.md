# Repository map

Monorepo: pnpm workspaces + Turborepo.

```txt
apps/mobile                 Expo 54 / RN 0.81 / Expo Router
apps/api                    Hono + Prisma + Postgres
packages/shared             Enums, Zod, game math, daily goals
packages/pawket-sdk         API client + Solana PDA/tx builders
programs/pawket             Anchor 0.31.1 program
programs/pawket/idl         Committed IDL (not target/)
docs/                       Product + engineering
scripts/                    invariants, idl sync, tooling check
.agents/skills/             Project playbooks
```

## Where do I change X?

| I need to…                                   | Open                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Add a route / tab                            | `apps/mobile/app/<name>.tsx` and, if it's a tab, `navItems` in `src/components/DesignSystem.tsx` |
| Add a substantial screen                     | `apps/mobile/src/screens/` + thin route file in `app/`                                           |
| Add a primitive / glass / button             | `apps/mobile/src/components/`                                                                    |
| Change color, type, space, motion            | `apps/mobile/src/theme/tokens.ts`                                                                |
| Change session, adopt, care, wallet restore  | `apps/mobile/src/state/PawketSessionContext.tsx`                                                 |
| Change identity / signing                    | `apps/mobile/src/wallet/`                                                                        |
| Swap storage backend                         | `apps/mobile/src/wallet/storage.ts` only                                                         |
| Call the API from mobile                     | `apps/mobile/src/api/client.ts` → `@pawket/sdk`                                                  |
| Show cluster / program / RPC                 | `apps/mobile/src/solana/config.ts`                                                               |
| Add MWA / device wallet                      | `apps/mobile/src/integrations/` (reserved) + `walletAdapter.ts`                                  |
| Change pet rules (XP, decay, cooldown, mood) | `packages/shared/src/game.ts` + `constants.ts` + Rust twins                                      |
| Change request/response types                | `packages/shared/src/schemas.ts`                                                                 |
| Change daily goals / streak                  | `packages/shared/src/dailyGoals.ts`                                                              |
| Add an API route                             | `apps/api/src/app.ts` + a service + shared schema + SDK method                                   |
| Change adopt/care persistence                | `apps/api/src/services/pet.service.ts` + Prisma                                                  |
| Change DB tables                             | `apps/api/prisma/schema.prisma` + a migration                                                    |
| Add a Solana instruction                     | `programs/pawket/programs/pawket/src/lib.rs` + SDK builders                                      |
| Change PDAs / discriminators                 | Rust + `packages/pawket-sdk/src/solanaClient.ts` + committed IDL                                 |
| Change program ID                            | `declare_id!`, `Anchor.toml`, SDK, committed IDL — never one of them                             |

## Package names

| Dir                   | npm name         |
| --------------------- | ---------------- |
| `apps/mobile`         | `@pawket/mobile` |
| `apps/api`            | `@pawket/api`    |
| `packages/shared`     | `@pawket/shared` |
| `packages/pawket-sdk` | `@pawket/sdk`    |
| `programs/pawket`     | `@pawket/anchor` |

Mobile imports `@pawket/sdk` (which re-exports `@pawket/shared`). API imports `@pawket/shared` only.

## Empty / reserved

- `apps/mobile/src/integrations/` — Solana Mobile Wallet Adapter, not used yet
- `apps/mobile/src/types/` — do not add a parallel type system; use `@pawket/shared`
- `apps/api/src/config/` — unused extra dir; config is `apps/api/src/config.ts`

## Generated vs source

| Generated (do not hand-edit)      | Produce with                      |
| --------------------------------- | --------------------------------- |
| `packages/*/dist`                 | `pnpm --filter <pkg> build`       |
| `apps/api/dist`                   | `pnpm --filter @pawket/api build` |
| `programs/pawket/target/**`       | `anchor build`                    |
| `node_modules`, `.turbo`, `.expo` | package managers                  |

Committed IDL at `programs/pawket/idl/pawket.json` is a **copy** of `target/idl/pawket.json`. Refresh it with `pnpm idl:sync` after a program build. Then update the SDK if the layout changed.
