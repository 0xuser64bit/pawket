# Pawket — agent operating system

Read this before changing code. Product essays live in `docs/`. This file is the contract for how an agent works in this repo.

## What this is

Pawket is a mobile-first virtual pet on Solana. A player mints an on-device Ed25519 companion key, adopts one pet, cares for it (feed / play / groom / rest), and builds a Pet Passport.

**The playable loop is API + Postgres.** The Anchor program and unsigned SDK transaction builders exist, but mobile does **not** sign, send, or read on-chain accounts. Do not claim "on-chain" in UI copy or PR text unless that path is actually wired.

## Read first

| If you are…                  | Read                                                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| New to the repo              | this file → [docs/REPO_MAP.md](docs/REPO_MAP.md) → [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                 |
| Changing mobile UI           | [docs/engineering/MOBILE.md](docs/engineering/MOBILE.md) + [docs/MOBILE_UI_DESIGN.md](docs/MOBILE_UI_DESIGN.md) |
| Changing game rules          | [docs/engineering/SOLANA.md](docs/engineering/SOLANA.md) + skill `changing-game-math`                           |
| Changing the API             | [docs/engineering/API.md](docs/engineering/API.md) + skill `adding-api-endpoint`                                |
| Touching Anchor / PDAs / IDL | [docs/engineering/SOLANA.md](docs/engineering/SOLANA.md) + [docs/GUARDRAILS.md](docs/GUARDRAILS.md)             |
| Sending / confirming txs     | [docs/engineering/TRANSACTIONS.md](docs/engineering/TRANSACTIONS.md)                                            |
| Adding tests                 | [docs/engineering/TESTING.md](docs/engineering/TESTING.md)                                                      |
| Declaring work done          | [docs/engineering/WORKFLOW.md](docs/engineering/WORKFLOW.md)                                                    |

## Current truth

**Real**

- Per-device companion key (`apps/mobile/src/wallet/`)
- Adopt / care / decay / daily goals / streak / passport via Hono + Prisma
- Shared game math and Zod contracts in `@pawket/shared`
- SDK API client + unsigned Anchor-compatible builders for init / adopt / care
- Expo app with three tabs (Home, Passport, Seasons) + Settings

**Stubbed — do not fake**

- Solana Mobile Wallet Adapter signing
- Sending or confirming program transactions
- On-chain account reads
- Payments, Jupiter, Mercuryo, store, friends
- API authentication (wallet address is a client-supplied string)

## Sources of truth

One home per fact. If two files disagree, the left column wins.

| Fact                                      | Authoritative file                                                                |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| Game math, enums, request/response shapes | `packages/shared/src/`                                                            |
| Live pet lifecycle                        | `apps/api/src/services/pet.service.ts`                                            |
| HTTP surface                              | `apps/api/src/app.ts`                                                             |
| DB schema                                 | `apps/api/prisma/schema.prisma`                                                   |
| On-chain program                          | `programs/pawket/programs/pawket/src/lib.rs`                                      |
| Committed IDL                             | `programs/pawket/idl/pawket.json` (copy via `pnpm idl:sync` after `anchor build`) |
| Program ID, PDAs, instruction layouts     | `packages/pawket-sdk/src/solanaClient.ts`                                         |
| API HTTP client                           | `packages/pawket-sdk/src/apiClient.ts`                                            |
| Mobile session / navigation side effects  | `apps/mobile/src/state/PawketSessionContext.tsx`                                  |
| Design tokens                             | `apps/mobile/src/theme/tokens.ts`                                                 |
| Routes                                    | `apps/mobile/app/*`                                                               |
| Solana cluster/RPC shown in UI            | `apps/mobile/src/solana/config.ts`                                                |
| Env names                                 | `.env.example`                                                                    |

Do not introduce a second store of any of these.

## Commands

```sh
pnpm install
cp .env.example .env
pnpm --filter @pawket/api prisma:generate

pnpm --filter @pawket/api dev          # API :8787
pnpm --filter @pawket/mobile dev       # Expo

pnpm invariants                        # program id / IDL / constant drift
pnpm verify                            # invariants + format + lint + typecheck + test
pnpm test                              # workspace Vitest (turbo)
cd programs/pawket && anchor test      # on-chain (needs Rust/Anchor/wallet)
```

Android emulator API host is `http://10.0.2.2:8787`, not `localhost`.

## Workflow

Follow [docs/engineering/WORKFLOW.md](docs/engineering/WORKFLOW.md). Short version:

1. Read the matching engineering doc and the closest existing feature.
2. Change the smallest set of layers that own the fact (see table above).
3. Keep shared → API/SDK/program/mobile in sync. Never "just update the screen."
4. Add or extend a test at the layer you changed.
5. Run the layer command, then `pnpm invariants`. Before you say done: `pnpm verify` for TS, plus `anchor test` if you touched Rust.
6. Report what changed, what you ran, and what is still stubbed.

## Skills

Project playbooks in `.agents/skills/`. Load the matching one before implementing:

| Skill                       | Use when                                                  |
| --------------------------- | --------------------------------------------------------- |
| `adding-mobile-feature`     | New screen, route, session method, or UI flow             |
| `adding-api-endpoint`       | New or changed HTTP route / Prisma model / SDK method     |
| `adding-solana-instruction` | New or changed Anchor instruction, account, PDA, or event |
| `changing-game-math`        | Stats, XP, cooldown, decay, daily goals, name/SKU limits  |
| `adding-transaction-flow`   | Sign / send / confirm / simulate / MWA                    |

## Hard rules

- **No custody.** Never log, upload, or persist the companion secret off-device. Never ask for a seed phrase.
- **No silent dual-write.** Do not send adopt/care on-chain as a side effect of the API call. See TRANSACTIONS.md.
- **No hand-edited generated artifacts.** Rebuild + `pnpm idl:sync`. Never invent discriminators.
- **No production RPC, treasury, or program ID changes** without an explicit human ask.
- **API trusts `walletAddress`.** Do not add paid or irreversible actions on that trust model.
- **Honest UI.** Seasons / payments / "on-chain" language must match reality.
- **Tokens, not raw colors.** Use `Text`, `Screen`, `GlassPanel`, `Button` — see MOBILE.md.

## Guardrails

[docs/GUARDRAILS.md](docs/GUARDRAILS.md) lists files you must not casually edit (program ID, IDL, keypairs, `.env`, companion storage).
