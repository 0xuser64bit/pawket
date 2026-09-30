# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary, this version: a player in the browser. They adopt one companion and care for it with no wallet, no token and no account. The pet is saved on the device.

Later, if a chain path is built: Solana collectors adopting a PDA pet. That audience is not served by the current screens. The core loop must stay completable without a wallet.

## Product Purpose

Pawket is a living on-chain companion game. Each companion grows an evolving Passport — care history, personality, level, achievements, and collectible memories — on Solana's low-cost, fast ownership records, without custodial accounts.

Success, this version, means a player adopts one pet, cares for it, sees honest stats, XP, level, cooldown, mood, streak and care history, and can dress it and finish a playground round. Success later still means the same loop on a PDA, with the same math. The Passport as an on-chain record is not built.

## Positioning

Living Passport identity: a pet's care history and progression become a persistent, visible part of its owner's on-chain identity. A neighboring pet game could copy feeding mechanics; it could not truthfully copy the Passport as accumulated proof of care.

## Operating Context

Browser-first on devnet: Wallet Standard wallets, one Kit v8 browser client (`browser-client.ts` via `ClientProvider`), explicit-sign sends with simulation first and Explorer receipt after, state reloaded from chain after confirmation (no optimistic adopt/care state). Deploy target is Vercel; local loop is `pnpm dev` at `http://localhost:3000`; Done gate is `pnpm verify` (typecheck + lint + test + build).

Target loop: connect wallet → adopt PDA pet (name 2–24 UTF-8 bytes, species, personality) → daily care (4 actions, ~30-min cooldown display, decay projection labeled estimate-only when shown) → XP / streaks / memories / visual progression → social showcase, seasonal events, cosmetics.

## Capabilities and Constraints

Ships today: landing, adoption, the room and care loop — the room drawn in 3D with the player and the pet together, a saved care shown as a moment between them, emotes, and the player's own look (flat SVG room wherever 3D cannot draw) — the care log and UTC streak, a free wardrobe (one wearable, no effect on vitals, drawn on the pet in 3D), one solo playground round with a once-a-day XP bonus, the guild boundary page, and `GET /api/health`. Persistence is `localStorage` only.

Built and not on a screen: Kit v8 client, PDAs, adopt/care instruction builders, the representative SOL send path. Do not add a send button until a devnet program deploy is real and the screen can show a signature and an Explorer link.

Explicitly deferred — do not build speculatively, and do not fake: chain adopt/care, a market or any price, guild membership, swaps, treasuries, multiplayer, a database, Passport-as-chain, seasons, friends, payments, mainnet, push notifications.

Durable constraints: devnet default, never mainnet in code; no custody (never ask for, log, or persist seeds/keys); every send needs explicit user action + preflight simulation + visible signature and Explorer link; Server Components by default, `use client` only at interactive leaves; no `NEXT_PUBLIC_` secrets (server config via `getServerEnv()` only); honest UI — no "on-chain" / "owned" / mainnet language unless wired; no pay-to-win (token balances never touch game stat/XP/matchmaking inputs); pets outrank guild tokens in every surface; standard adoption is fixed-price SOL, never a bonding curve; `register_item` / `record_purchase` are not a store and stay unwired until admin-gated.

Explicitly undecided (see `docs/OPEN-QUESTIONS.md`): Q1 NFT standard, Q2 backend DB, Q3 Meteora presets, Q4 indexer, Q5 marketplace settlement, Q6 legal sign-off for any guild token. Q7 and Q8 are decided for this version only: localStorage guest, one solo game. See `docs/DECISIONS.md`.

## Brand Commitments

Name: Pawket. Tagline in the shell: "A living companion". The mark, type and palette live in the design system (`docs/DESIGN.md`). Do not invent a new logo or mascot. Binding commitments: welcoming before protocol-savvy, expression over speculation, transparent about what is saved and where.

## Evidence on Hand

Real implementation: the routes in `docs/ROUTES.md`, `src/lib/guest/` (the record), `src/lib/game/` (math), `src/lib/closet/` (wearables), `src/lib/play/` (the round), `src/lib/guilds/boundary.ts`, `src/lib/solana/` (library only), `src/components/pk/` (design system and the geometric pet), `e2e/` Playwright.

Absences future work must not fabricate: no pet NFT, no testimonials, customers, press, benchmarks, prices, or live player data. A wearable does not change the flat drawing, and changes nothing but looks in the 3D room. An emote changes nothing on the record. Marketplace, guild launches and multiplayer remain specs.

## Product Principles

1. Care creates identity — the Passport earns value from history, not from purchase size.
2. Collecting serves expression — customization and trading make pets personal and recognizable, never powerful.
3. Progress must be visible — every care action shows growth on the pet and its record.
4. Ownership enriches, never gates or advantages — baseline play stays open; money never buys stats, speed, or wins.
