---
name: adding-api-endpoint
description: Use when adding or changing a Pawket HTTP route, Prisma model, PetService method, or SDK API client method.
---

# Adding an API endpoint

Read `docs/engineering/API.md`.

## Inspect

- `packages/shared/src/schemas.ts` — contract
- `apps/api/src/app.ts` — routes
- `apps/api/src/services/pet.service.ts` — how a real resource is done
- `packages/pawket-sdk/src/apiClient.ts`
- `apps/api/src/app.test.ts`

## Pattern

1. Zod schema + types in `@pawket/shared`.
2. Service method. Persistence through the repository interface. Implement **both** Prisma and `InMemoryPetRepository`.
3. Route in `createApp` with `zValidator` and the shared error shape.
4. `PawketApiClient` method that parses input with the same schema.
5. Tests: validation 400, owner 403, missing 404, happy path.

## Do not

- Trust `walletAddress` for anything paid or irreversible. There is no auth.
- Confirm payments from the client.
- Compute XP / decay / streaks in the route.
- Skip the in-memory repo — API tests will break.

## Verify

```sh
pnpm --filter @pawket/shared test
pnpm --filter @pawket/api test
pnpm --filter @pawket/sdk test
```
