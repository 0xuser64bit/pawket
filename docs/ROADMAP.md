# Pawket Roadmap

## Phase 0: repo setup

- Monorepo foundation.
- Mobile starter flow.
- API routes/services/schema.
- Anchor program skeleton.
- Shared types and SDK.

## Phase 1: playable MVP

Completed slices:

- Real per-device companion key (persisted Ed25519 keypair) — multi-user identity, silent session restore, disconnect/start-over.
- Real-time vital decay so the care loop has stakes; mood, focus, and streaks react to neglect.
- API-backed adoption, care actions, stat/XP/level progression, and passport timeline.
- Daily goals, UTC care streaks, and once-per-day bonus XP reward claims.
- Mobile SDK path for pet lifecycle, daily goals, reward claims, and passport loading.
- SDK PDA helpers and unsigned Anchor-compatible transaction builders for game config initialization, adoption, and care actions.
- Focused three-tab product surface (Home, Passport, Seasons) with confident devnet copy.

Still upcoming:

- Solana Mobile Wallet Adapter signing on device (and an optional path to import/export the companion key).
- Devnet deployment, on-chain reads, and mobile signing/sending/confirmation for adopt/care transactions.
- One polished pet species and progression loop expansion.

## Phase 2: social/items/events

- Friends and visits.
- Seasonal quests.
- Item catalog and inventory.
- Passport badges and achievements.

## Phase 3: marketplace/economy

- Verified SOL/USDC purchases.
- Jupiter token routing.
- Limited marketplace pilots.
- Anti-abuse economy monitoring.

## Phase 4: polish/growth

- Mainnet readiness review.
- Mercuryo onboarding.
- Push notifications.
- Content pipeline and creator partnerships.
