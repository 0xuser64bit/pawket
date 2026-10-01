# Decisions

Record of architectural decisions. Newest first. Add an entry when a decision
changes — never rewrite history.

## 2026-10: A pet can live on Solana, and Pawket pays the fees

**Context:** The product's position is a pet whose care history is a
record nobody can edit. The pet lived only in `localStorage`; the program
from before the reset was never deployed (its program ID held no account on
devnet) and its keypair was gone. A player on devnet also needs SOL before
they can sign anything, which stops most people at the door.
**Decision:** Program v2 on Anchor 1.2, deployed to devnet as
`PawkHvXJKfsUfKs8mgLS7FXbLuNZ43fwEFGkzYdeM74` (a new ID, ground for the
prefix). Decay, cooldowns, XP, the UTC streak and the daily round bonus are
enforced on chain with the browser's integer math, held together by
`src/lib/game/lockstep.txt`; the Passport keeps the last eight cares.
`register_item` and `record_purchase` are deleted, not ported. `adopt_pet`
takes a separate rent payer, and a server sponsor signs first, as fee payer,
for Pawket instructions only (first, because wallets rewrite unsigned
transactions and the sponsor would refuse the rewrite). A pet still starts in the browser: "Keep it on
Solana" carries it into the program, and the record there starts that day.
One record shape serves both, through `useCompanion`. This resolves Q7 for
this version: a Wallet Standard wallet as identity, no embedded wallet, no
server session.
**Consequence:** The app holds one key — the sponsor's devnet float — so
custody language now distinguishes a player's keys (never) from the app's
own sponsor (server-only, Pawket instructions only, not the upgrade
authority). Carrying a pet resets its level and streak, said before the
wallet opens. Rate limits are per serverless instance. There is no NFT: Q1
stays open.

## 2026-10: The Park is a place

**Context:** "Meet others" had no surface, and pets on Solana are public by
construction.
**Decision:** `/park`, the fifth slot in the dock between Home and
Playground, lists every pet the program keeps, read live with
`getProgramAccounts`: who was cared for today, what just happened (merged
from every Passport's last cares), and everyone, most cared-for first.
`/pet/<address>` is each pet's public Passport, server-rendered from chain.
**Consequence:** No indexer and no database: the park reads the chain on
every request. That is fine at hackathon scale and is the first thing to
cache (or index, Q4) if the program holds thousands of pets.

## 2026-09: Home is a 3D room, and the flat room stays

**Context:** Home is where the player and the pet are together. The flat
room could not show them doing anything together. Two CC0 packs were
supplied: Kenney's Cube Pets and Quaternius' Universal Base Characters
(free edition — no animation, no clothes).
**Decision:** Home draws one React Three Fiber Canvas, loaded only by Home,
with the player and the pet in the design system's room: toon shading, ink
outlines, Daylight materials under a changing light. The asset pipeline
(`scripts/3d/`) is part of the repo: it recolours the pets to their PetArt
coats, cuts clothes from the body, fits hair across heads, authors the
clips, and validates every GLB. Moments are data (`src/lib/room/`), so an
emote is a clip and an entry. The player's look is saved on the device. The
flat SVG room is kept, complete, for no WebGL, a failed load, a lost
context, and a player who prefers it.
**Consequence:** three.js (~275 KB gzipped) and about 1 MB of GLB load
after the first paint, on Home only. A care plays its moment only after it
is saved. The player is now the one likeness in the product — outside the
3D room it is still the peg doll.

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
