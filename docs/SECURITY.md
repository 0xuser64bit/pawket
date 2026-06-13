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
