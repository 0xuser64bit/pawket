# Product direction

Pawket gives a player a companion they recognize and a reason to return.
A care session should be understandable in seconds and rewarding without a
purchase. Solana makes the history portable and public when the player chooses.

`PRODUCT.md` defines what is implemented. This document guides product
choices; it does not authorize new features or changes to the asset model.

## Priorities

1. Make adoption, care and return visits reliable and accessible on web and
   Android. A player should understand where their pet is saved.
2. Make the pet's history and personality visible through its room, look,
   stickers and Passport. Progress should come from care.
3. Support community through guild membership and gatherings without
   requiring coins or spending.
4. Keep optional financial surfaces transparent and separate from care.

## Asset model

| Record | Role |
| --- | --- |
| Local pet | Device-local companion and care history |
| Solana pet and Passport | Program accounts containing identity, rules and confirmed history |
| Keepsake | Frozen Metaplex Core card pointing to the pet; no transfer or resale |
| Closet item | Permanent cosmetic entitlement; no gameplay effect or resale |
| Guild coin | Optional token with on-chain liquidity and explicit risk disclosures |

A pet's program account remains authoritative. Tradable pets, guild treasuries
and new token utilities require a separate product decision, technical design
and review. `OPEN-QUESTIONS.md` tracks the decisions; `MAINNET.md` tracks the
release requirements.

## How to assess a proposal

Does it make care clearer, improve return visits, support expression or make
community participation easier? Can the player understand the state and undo
or recover from a mistake? Does it preserve the wallet-free loop and the
separation between spending and progression? If those answers are unclear,
validate the need before adding another system.
