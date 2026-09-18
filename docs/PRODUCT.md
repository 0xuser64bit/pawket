# Pawket product context (web-first)

## What Pawket is

Pawket is a living on-chain companion game. Each companion has an evolving
Passport: care history, personality, level, achievements, and collectible
memories. Solana makes low-cost, fast ownership records possible without
custodial accounts.

## Core user loop (target)

1. Connect a wallet in the browser (devnet).
2. Adopt a first companion.
3. Care through feeding, playing, grooming, and resting.
4. Earn XP, streaks, memories, and visual progression.
5. Visit friends and join seasonal community events.
6. Collect cosmetics and event rewards.

## Why web-first

The previous direction was mobile-first (Expo + Solana Mobile). The reset
moves to the browser: Wallet Standard wallets, no app-store gate, instant
iteration, Vercel deployment, and a larger testing surface (Vitest +
Playwright). Native mobile is explicitly out of scope until the web loop is
proven.

## What exists today

- App shell, provider architecture, wallet connection foundation.
- Solana client infrastructure (Kit v8, PDAs, adopt/care builders).
- Representative SOL send flow proving the transaction path.
- Health endpoint, env strategy, verification loop.

## What is deferred (do not build speculatively)

- Adoption / care product UI and persistence (no backend yet).
- Passport timeline, daily goals, streaks, seasons, friends.
- Payments, Jupiter routing, Mercuryo on-ramp, marketplace.
- Mainnet launch, push notifications, creator pipeline.

## Monetization (future)

Premium companions, cosmetics, event passes, item bundles — settling in SOL
or USDC. Nothing in the foundation implies checkout; `register_item` /
`record_purchase` on-chain are not a store and must not be exposed as one.

## Risks to respect

Wallet/signing UX friction, botting of care actions and rewards,
over-financializing a companion game, on-chain account bloat.
