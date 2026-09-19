# Pawket — agent operating system

Read this before changing code. Product context lives in `docs/PRODUCT.md`,
architecture in `docs/ARCHITECTURE.md`. This file is the contract for how an
agent works in this repo.

## What this is

Pawket is a **web-first** living companion on Solana. A player connects a
Wallet Standard wallet in the browser, adopts a companion, and cares for it
(feed / play / groom / rest). Devnet by default.

**Current truth:** the M1 care loop is live — a wallet-free guest companion
(persisted locally, locked game math) plus an honest on-chain adopt path
(PDA preview → builder → simulate → sign → confirm → Explorer receipt,
with an explicit undeployed-program state). No DB, indexer, marketplace,
guilds, or launches — do not claim they exist.

## Read first

| If you are…               | Read                                                        |
| ------------------------- | ----------------------------------------------------------- |
| New to the repo           | this file → `docs/ARCHITECTURE.md` → `docs/VISION.md` → `docs/PRODUCT.md` |
| Planning any feature      | `docs/ROADMAP.md` → `docs/EPICS.md` → `docs/TASKS.md` → `docs/OPEN-QUESTIONS.md` |
| Implementing a task       | `docs/AGENT-GUIDE.md` + the one spec for your layer         |
| Running the app           | `docs/DEVELOPMENT.md`                                       |
| Changing env/config       | `docs/ENVIRONMENT.md`                                       |
| Touching Solana / wallets | `docs/SOLANA.md`                                            |
| Touching game math        | `docs/GAME-DESIGN.md` (`src/lib/game/` is lockstep)         |
| Touching pets/NFTs        | `docs/NFT-CUSTOMIZATION.md` + `docs/DOMAIN-MODEL.md`        |
| Touching marketplace      | `docs/MARKETPLACE.md` + `docs/API-CONTRACTS.md`             |
| Touching guilds/launches  | `docs/GUILDS.md` + `docs/METEORA-INTEGRATION.md` + `docs/SAFETY-ECONOMY.md` |
| Touching indexer/API      | `docs/INDEXER.md` + `docs/API-CONTRACTS.md` + `docs/ROUTES.md` |
| Adding tests              | `docs/TESTING.md`                                           |
| Declaring work done       | `docs/WORKFLOW.md` (Definition of Done)                     |
| Questioning a decision    | `docs/DECISIONS.md` (history) + `docs/OPEN-QUESTIONS.md` (pending) |

## Sources of truth

One home per fact. If two files disagree, the left column wins.

| Fact                              | Authoritative file                  |
| --------------------------------- | ----------------------------------- |
| Game math, enums                  | `src/lib/game/`                     |
| Program ID, seeds, discriminators | `src/lib/solana/program.ts`         |
| PDA derivation                    | `src/lib/solana/pda.ts`             |
| Instruction builders              | `src/lib/solana/instructions.ts`    |
| Cluster / RPC / Explorer links    | `src/lib/solana/cluster.ts`         |
| Browser client singleton          | `src/lib/solana/browser-client.ts`  |
| Transaction lifecycle + UX copy   | `src/lib/solana/transactions.ts`    |
| Env names and defaults            | `.env.example` + `src/config/env.ts`|
| Server-only env (guarded)         | `src/config/server-env.ts`          |
| Routes                            | `app/`                              |
| Target architecture (M3–M6)       | `docs/ARCHITECTURE-TARGET.md`       |
| Domain types, state machines      | `docs/DOMAIN-MODEL.md`              |
| Route IA + Server/Client split    | `docs/ROUTES.md`                    |
| API envelopes + error codes       | `docs/API-CONTRACTS.md`             |
| Meteora presets + launch stages   | `docs/METEORA-INTEGRATION.md`       |
| Eligibility (cosmetic/social)     | `docs/GUILDS.md` + `docs/INDEXER.md`|
| Task sequence + blockers          | `docs/TASKS.md` + `docs/OPEN-QUESTIONS.md` |

Do not introduce a second store of any of these.

## Commands

```sh
cp .env.example .env.local
pnpm install
pnpm dev              # http://localhost:3000
pnpm verify           # typecheck + lint + test + build (run before Done)
pnpm test             # Vitest
pnpm e2e              # Playwright (needs no wallet; asserts shell, not signing)
```

## Workflow (short version)

1. Read the matching doc and the closest existing module — copy that shape.
2. Change the smallest set of layers that own the fact.
3. Keep game math ↔ program constants ↔ tests in sync. Never "just update the UI."
4. Add or extend a test at the layer you changed (see `docs/TESTING.md`).
5. Run `pnpm verify`. Report what you ran, what changed, and what is stubbed.

## Hard rules

- **No custody.** Never ask for, log, upload, or persist seed phrases or
  private keys. Wallets sign; the app never holds keys.
- **No hand-rolled instruction bytes in components.** Use
  `src/lib/solana/instructions.ts`. Never invent discriminators.
- **No silent sends.** Every send needs explicit user action, simulation
  first (preflight on), and a visible signature + Explorer link after.
- **No optimistic adopt/care state.** Wait for confirmation, then reload from
  the source of truth.
- **No `NEXT_PUBLIC_` secrets.** Server-only config has no such prefix and is
  read only via `getServerEnv()` in server code.
- **No program ID / seed / discriminator changes** without an explicit human
  ask and a program deploy plan.
- **Server Components by default.** `"use client"` only at interactive
  leaves. Never fetch in `useEffect` what a Server Component or `useRequest`
  can own.
- **Honest UI.** No "on-chain", "owned", or mainnet language unless wired.
- **Devnet default.** Never target mainnet in code; cluster comes from env.
