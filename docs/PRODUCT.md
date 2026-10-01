# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary, this version: a player in the browser. They adopt a companion and care for it with no wallet, no token and no account. The pet starts on the device.

Second: the same player, or a Solana user, who keeps the pet on Solana devnet — a wallet signs each care and Pawket pays the fee, so a wallet with no SOL can play. The core loop stays completable without a wallet.

## Product Purpose

Pawket is a living on-chain companion game. Each companion grows an evolving Passport — care history, personality, level, achievements, and collectible memories — on Solana's low-cost, fast ownership records, without custodial accounts.

Success, this version, means a player adopts a pet, cares for it, sees honest stats, XP, level, cooldown, mood, streak and care history, dresses it and finishes a playground round — and can keep that pet on Solana, where the same loop runs on a PDA with the same math and the Passport (streak, counts, last cares) is a public record anyone can open.

## Positioning

Living Passport identity: a pet's care history and progression become a persistent, visible part of its owner's on-chain identity. A neighboring pet game could copy feeding mechanics; it could not truthfully copy the Passport as accumulated proof of care.

## Operating Context

Browser-first on devnet: Wallet Standard wallets, one rpc and one wallet client (`browser-client.ts`), explicit-sign sends through `send.ts` with preflight and an Explorer receipt after, state reloaded from chain after confirmation (no optimistic adopt/care state). A server sponsor pays fees and rent for Pawket instructions only. Live at https://pawket-pets.vercel.app (Vercel, from `main`); local loop is `pnpm dev`; Done gate is `pnpm verify` plus `pnpm program:test` when the program changes.

The loop: adopt in the browser → care (4 actions, 30-min cooldown each, decay projected and labeled an estimate) → keep it on Solana (one signature) → every care, round and outfit a signed record → the Passport and the Park show it to everyone.

## Capabilities and Constraints

Ships today: landing (with a live count from chain), adoption, the room and care loop — the room drawn in 3D with the player and the pet together, a saved or confirmed care shown as a moment between them, emotes, and the player's own look (flat SVG room wherever 3D cannot draw) — the care log and UTC streak, a free wardrobe (one wearable, no effect on vitals), one solo playground round with a once-a-day XP bonus, keeping a pet on Solana (adopt, care, round and dress as signed, sponsored transactions with receipts), the public Passport at `/pet/<address>`, the Park (every pet on chain, who was out today, what just happened), the guild boundary page, `GET /api/health` and `/api/sponsor`.

Explicitly deferred — do not build speculatively, and do not fake: a market or any price, NFTs (Q1), guild membership, swaps, treasuries, real-time multiplayer, a database or indexer, seasons, friends, payments, mainnet, push notifications.

Durable constraints: devnet default, never mainnet in code; no custody (never ask for, log, or persist a player's seed or key — the app's only key is its server-only devnet sponsor); every send needs explicit user action + preflight simulation + visible signature and Explorer link; Server Components by default, `use client` only at interactive leaves; no `NEXT_PUBLIC_` secrets (server config via `getServerEnv()` only); honest UI — "On Solana" only for a pet read from chain, no "owned" / NFT / mainnet language; no pay-to-win (token balances never touch game stat/XP/matchmaking inputs); pets outrank guild tokens in every surface; standard adoption, if it is ever priced, is fixed-price SOL, never a bonding curve; the pre-reset store instructions are deleted, and a store is a new design (Q5).

Explicitly undecided (see `docs/OPEN-QUESTIONS.md`): Q1 NFT standard, Q2 backend DB, Q3 Meteora presets, Q4 indexer, Q5 marketplace settlement, Q6 legal sign-off for any guild token. Q7 and Q8 are decided for this version only: browser pet first and a Wallet Standard wallet on Solana with a fee sponsor; one solo game. See `docs/DECISIONS.md`.

## Brand Commitments

Name: Pawket. Tagline in the shell: "A living companion". The mark, type and palette live in the design system (`docs/DESIGN.md`). Do not invent a new logo or mascot. Binding commitments: welcoming before protocol-savvy, expression over speculation, transparent about what is saved and where.

## Evidence on Hand

Real implementation: the program in `programs/pawket/` (deployed to devnet), the routes in `docs/ROUTES.md`, `src/lib/guest/` (the browser record), `src/lib/game/` (math, in lockstep with the program), `src/lib/solana/` (builders, decoders, send path, sponsor rules), `src/lib/companion/`, `src/lib/closet/`, `src/lib/play/`, `src/lib/guilds/boundary.ts`, `src/components/pk/` (design system and the geometric pet), LiteSVM, Vitest and Playwright suites, and a devnet path tested end to end.

Absences future work must not fabricate: no pet NFT, no testimonials, customers, press, benchmarks or prices. The only live player data is what the program holds, read as it is. A wearable changes nothing but looks. An emote changes nothing on the record. Marketplace, guild launches and real-time multiplayer remain specs.

## Product Principles

1. Care creates identity — the Passport earns value from history, not from purchase size.
2. Collecting serves expression — customization and trading make pets personal and recognizable, never powerful.
3. Progress must be visible — every care action shows growth on the pet and its record.
4. Ownership enriches, never gates or advantages — baseline play stays open; money never buys stats, speed, or wins.
