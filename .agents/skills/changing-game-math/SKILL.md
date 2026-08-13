---
name: changing-game-math
description: Use when changing Pawket stats, XP, level, care deltas, cooldowns, decay, mood, daily goals, streak, or name/SKU limits.
---

# Changing game math

Live rules live in `@pawket/shared`. On-chain twins live in `lib.rs`. Drift = two different games.

## Inspect

- `packages/shared/src/constants.ts`
- `packages/shared/src/game.ts`
- `packages/shared/src/dailyGoals.ts`
- `packages/shared/src/game.test.ts`
- `programs/pawket/programs/pawket/src/lib.rs` (care + level + name)
- `apps/api/src/services/pet.service.ts` (when decay is persisted)

## Pattern

1. Change the shared function/constant first. Extend `game.test.ts`.
2. If the rule exists on-chain (care deltas, XP 10, level `xp/100+1`, cooldown 1800, initial 72, name 2–24), change the Rust twin in the same PR.
3. `pnpm invariants` must pass.
4. Decay, mood, daily goals, +25 XP are **API-only**. Do not add them on-chain "to match" unless that is the task.
5. Care on-chain does not decay. If you change decay, only the API path moves — say so in the report.

## Do not

- Reimplement clamp / cooldown / streak in a screen or route.
- Change locked SDK PDA test vectors unless seeds changed (they should not).

## Verify

```sh
pnpm --filter @pawket/shared test
pnpm --filter @pawket/api test
pnpm invariants
```
