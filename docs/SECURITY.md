# Security

## Wallet safety

Pawket never asks for seed phrases or custody. Wallet actions must show human-readable intent, recipient, token, and amount.

## Signing UX

Use explicit signing copy: adopt, care, purchase, or claim. Avoid opaque transaction batches until users trust the product.

## On-chain validation

Validate signer ownership, account ownership, PDA seeds, bumps, stat bounds, timestamps, and input length. Emit useful events for indexers.

## PDA validation

Every PDA account is constrained with deterministic seeds and bump checks in Anchor contexts.

## Payment validation

Never mark payments confirmed from client claims. Verify chain finality, recipient treasury, mint/token, exact amount, intent expiry, and replay status.

## Backend auth/session safety

Wallet sessions should use nonce-based sign-in, short-lived sessions, secure cookies or signed bearer tokens, and replay protection.

## Rate limiting

Apply wallet/IP limits for adopt/care/payment routes and stricter webhook limits.

## Abuse prevention

Cooldown care actions, detect sybil patterns, cap rewards, review seasonal reward logic, and separate cosmetics from financial promises.

## No custody principle

Pawket stores metadata and game state. It does not custody user funds, private keys, or recovery phrases.

## Current trust model (read before adding features)

- The companion key never leaves the device. `disconnect` keeps it; `startOver` destroys it. Do not log it.
- It is a **devnet game identity**, stored in AsyncStorage. It is not a funds wallet.
- The API does **not** authenticate. `walletAddress` is a client-supplied string. Anyone who knows a wallet + pet id can call care/claim.
- Do not add purchases, inventory grants, or irreversible rewards until nonce sign-in exists.
- `record_purchase` on-chain does not move tokens. `register_item` is not admin-gated. Do not expose either as a store.
- Payment intents are in-memory stubs. Webhooks return 501. Never mark a payment confirmed from the client.
