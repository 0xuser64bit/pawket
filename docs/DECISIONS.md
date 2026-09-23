# Decisions

Record of architectural decisions. Newest first. Add an entry when a decision
changes — never rewrite history.

## 2026-09: The shipped game is one browser companion

**Context:** The screens for a market, guild swaps, treasuries and multiplayer
lobbies rendered fixtures and said so. That is not a product a player can
trust, and it is not buildable without a program deploy, a database, an
indexer and a legal review that are still open questions.
**Decision:** The MVP is one companion in `localStorage`. Care uses the locked
math. The wardrobe is a fixed free catalog with no effect on vitals. The
playground is one solo memory round; the first finish of a UTC day grants
`DAILY_GOAL_REWARD_XP` and does not touch stats. Guilds is the boundary copy,
not a directory. The market routes redirect to inventory. Chain adopt stays
in `src/lib/solana/` until a program deploy is real. This resolves Q7
(local guest, no embedded wallet) and Q8 (one solo game, no netcode) for
this version.
**Consequence:** A player who clears site data loses the pet. There is no
account, no sync, and no second pet. That is stated on the screen.

## 2026-09: Kit v8 over web3.js v1 / wallet-adapter

**Context:** The ecosystem moved. Official Solana docs mark `@solana/web3.js`
v1 and `@solana/wallet-adapter-*` legacy; the maintained path is
`@solana/kit` with plugins plus `@solana/react`.
**Decision:** Build on `@solana/kit` 8.x, `kit-plugin-rpc`,
`kit-plugin-wallet`, `@solana/react`, and `@solana-program/*` builders.
**Consequence:** Pre-reset web3.js `Transaction` builders were not ported;
adopt/care builders were rewritten as Kit instructions. Verified against the
official Next.js + Kit tutorial, not the bundled skill (which still
recommends the stale framework-kit stack).

## 2026-09: Single Next.js app, no monorepo

**Context:** Pre-reset history had Expo + Hono + Anchor + packages with Turbo.
The foundation needs none of those deployables.
**Decision:** One Next.js app. Reintroduce package boundaries only when a
second deployable or a generated program client forces it.

## 2026-09: No backend in the foundation

**Context:** The live pre-reset game ran on Hono + Postgres, with the Anchor
program unwired.
**Decision:** Defer persistence. The foundation proves wallet + transaction
paths; adoption/care product state comes later with an explicit
chain-first vs API-first choice per feature (see `docs/SOLANA.md` lifecycle).
No Prisma, no stubs pretending otherwise.

## 2026-09: Tailwind v4 for styling

**Context:** Needed utility styling consistent with the Next.js tutorial and
Vercel-native defaults.
**Decision:** Tailwind v4 via `@tailwindcss/postcss`. No component library
until product UI demands one.

## 2026-09: Vitest + Playwright, no Storybook/Cypress

**Context:** Need unit locks on math/bytes plus a real-browser shell check.
**Decision:** Vitest (colocated) + Playwright smoke. Wallet signing stays a
manual devnet check; E2E asserts shell, not signatures.
