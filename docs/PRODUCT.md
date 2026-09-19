# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: Solana-native collectors. Wallet-first users adopting and trading pets as persistent on-chain identity and collectibles, operating in the browser on devnet.

Secondary / required path: wallet-curious guests. Core loop must stay completable without a wallet, guild token, or token purchase (guest preview against pure game math, upgrade CTA to connect). This is a P0 release gate, not the primary audience.

## Product Purpose

Pawket is a living on-chain companion game. Each companion grows an evolving Passport — care history, personality, level, achievements, and collectible memories — on Solana's low-cost, fast ownership records, without custodial accounts.

Success means a collector adopts a PDA pet, performs daily feed / play / groom / rest care on-chain, and sees honest stats, XP, level, cooldown, and mood reflected back on the pet and its Passport.

## Positioning

Living Passport identity: a pet's care history and progression become a persistent, visible part of its owner's on-chain identity. A neighboring pet game could copy feeding mechanics; it could not truthfully copy the Passport as accumulated proof of care.

## Operating Context

Browser-first on devnet: Wallet Standard wallets, one Kit v8 browser client (`browser-client.ts` via `ClientProvider`), explicit-sign sends with simulation first and Explorer receipt after, state reloaded from chain after confirmation (no optimistic adopt/care state). Deploy target is Vercel; local loop is `pnpm dev` at `http://localhost:3000`; Done gate is `pnpm verify` (typecheck + lint + test + build).

Target loop: connect wallet → adopt PDA pet (name 2–24 UTF-8 bytes, species, personality) → daily care (4 actions, ~30-min cooldown display, decay projection labeled estimate-only when shown) → XP / streaks / memories / visual progression → social showcase, seasonal events, cosmetics.

## Capabilities and Constraints

Confirmed today (M0 foundation, only thing wired): app shell + provider architecture, wallet connection foundation, Solana client infrastructure (Kit v8, PDAs, adopt/care builders), representative SOL send flow proving the transaction path, health endpoint (`app/api/health/route.ts`), env strategy with devnet defaults.

Explicitly deferred — do not build speculatively: adoption / care product UI and persistence (no backend yet), Passport timeline, daily goals, streaks, seasons, friends, payments / Jupiter routing / Mercuryo on-ramp / marketplace, mainnet launch, push notifications, creator pipeline.

Durable constraints: devnet default, never mainnet in code; no custody (never ask for, log, or persist seeds/keys); every send needs explicit user action + preflight simulation + visible signature and Explorer link; Server Components by default, `use client` only at interactive leaves; no `NEXT_PUBLIC_` secrets (server config via `getServerEnv()` only); honest UI — no "on-chain" / "owned" / mainnet language unless wired; no pay-to-win (token balances never touch game stat/XP/matchmaking inputs); pets outrank guild tokens in every surface; standard adoption is fixed-price SOL, never a bonding curve; `register_item` / `record_purchase` are not a store and stay unwired until admin-gated.

Explicitly undecided (see `docs/OPEN-QUESTIONS.md`, all open): Q1 NFT standard (Core recommended), Q2 backend DB + hosting (Postgres + Prisma at M3), Q3 Meteora SDKs + presets, Q4 indexer + RPC provider, Q5 marketplace settlement, Q6 legal/compliance sign-off (blocks guild-token pilot), Q7 wallet-free auth model, Q8 playground netcode scope.

## Brand Commitments

Name: Pawket. Web-first foundation tagline in current shell: "A living companion on Solana". No confirmed logo, voice, palette, typography, or mascot assets — do not invent them. Binding product commitments that read as brand: welcoming before protocol-savvy, expression over speculation, transparent ownership.

## Evidence on Hand

Real implementation (paths): `app/page.tsx` foundation shell + copy, `src/components/wallet/` connection + balance + representative send flow, `src/components/transaction-status.tsx` (the one tx-status surface), `src/components/network-badge.tsx` cluster/program readout, `src/lib/game/` pure companion math (lockstep authority), `src/lib/solana/` cluster / client / PDAs / instructions / tx lifecycle, `src/config/env.ts` + `.env.example` env names and defaults, `e2e/` Playwright shell smoke tests, `docs/VISION.md` + `docs/ROADMAP.md` + `docs/EPICS.md` + `docs/TASKS.md` specs (planned, not built).

Absences future work must not fabricate: no pet artwork / NFT collection, no testimonials, customers, press, benchmarks, pricing, or live player data. Spec surfaces (marketplace, playground, guilds, launches) are specs until their milestone exits.

## Product Principles

1. Care creates identity — the Passport earns value from history, not from purchase size.
2. Collecting serves expression — customization and trading make pets personal and recognizable, never powerful.
3. Progress must be visible — every care action shows growth on the pet and its record.
4. Ownership enriches, never gates or advantages — baseline play stays open; money never buys stats, speed, or wins.
