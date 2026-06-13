# Pawket Architecture

## Monorepo

- `apps/mobile`: Expo React Native mobile app.
- `apps/api`: Hono API and Prisma data layer.
- `programs/pawket`: Anchor program for pet identity, care state, passport, and item ownership foundations.
- `packages/shared`: Game enums, schemas, constants, utility math.
- `packages/pawket-sdk`: Typed client for API, program skeleton, payment helpers.
- `docs`, `scripts`: documentation and utilities.

## Mobile architecture

The mobile app is split into navigation, UI components, theme tokens, hooks, API client, wallet abstraction, Solana config, and payment client. Demo state lives in `src/dev/demoPet.ts` so it can be removed cleanly when API/program reads are wired.

## Backend architecture

Hono exposes small resource routes. Zod validates all inputs. Services own business logic and persistence boundaries. Prisma models users, pets, care actions, passport events, items, inventory, seasonal events, and payment intents.

## Solana program architecture

Anchor owns the canonical, low-cost state for player profile, pet, passport counters, item definitions, and item ownership. Instructions validate signer ownership, PDA seeds, cooldowns, input length, and stat bounds. Events are emitted for indexers/API consumers.

## Data model

On-chain stores canonical ownership and compact state. Off-chain Postgres stores rich histories, indexed queries, social/event views, and payment intent lifecycle.

## On-chain vs off-chain

On-chain: pet identity, owner, core stats, level/XP, cooldown timestamps, item ownership, verified purchase records.

Off-chain: feed views, full passport timeline, descriptions, friend graph, event metadata, rate limits, webhook processing, analytics.

## Payment flow

1. API creates a pending payment intent with SKU, amount, token, wallet, and expiry.
2. Mobile signs a SOL/USDC transfer or future Jupiter swap transaction.
3. API verifies finality and recipient/amount/mint before marking confirmed.
4. Program/API grants item/pass only after verified confirmation.

## Jupiter role

Jupiter will quote and build swap routes so users can pay with other Solana tokens while Pawket receives SOL or USDC. The current code only defines interfaces and does not fake swaps.

## Mercuryo role

Mercuryo will offer fiat on-ramp into SOL/USDC. The webhook route is a placeholder that rejects unsigned/unconfigured production use.

## Security considerations

No custody, explicit signing copy, PDA validation, signer ownership checks, payment finality verification, webhook signature verification, API rate limits, bot prevention, and minimal on-chain state.
