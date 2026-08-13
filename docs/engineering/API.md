# API engineering

Hono on Node (`apps/api`). The API is the **live** pet lifecycle. Mobile does not talk to Solana for adopt/care.

## Shape

```txt
src/index.ts            listen
src/app.ts              routes + error mapping
src/config.ts           Zod env
src/db.ts               PrismaClient
src/services/*.ts       business logic
prisma/schema.prisma    models
```

`createApp({ petService })` is injectable so Vitest can use `InMemoryPetRepository`.

## Routes

| Method | Path                                    | Real?                            |
| ------ | --------------------------------------- | -------------------------------- |
| GET    | `/health` `/version`                    | yes                              |
| GET    | `/pets/:walletAddress`                  | yes                              |
| POST   | `/pets/adopt`                           | yes                              |
| POST   | `/pets/:petId/care`                     | yes                              |
| GET    | `/pets/:petId/daily-goals`              | yes                              |
| POST   | `/pets/:petId/daily-goals/claim`        | yes                              |
| GET    | `/pets/:petId/passport`                 | yes                              |
| GET    | `/items` `/events`                      | hardcoded placeholders           |
| POST   | `/payments/create-intent`               | in-memory stub, does not persist |
| POST   | `/webhooks/mercuryo` `/webhooks/solana` | 501                              |

All JSON bodies/queries validate with `@pawket/shared` Zod schemas via `zValidator`. Errors are `{ error: { code, message, details? } }`.

## Rules

1. **Shared schemas own the contract.** Add the Zod schema first, then the route, then `PawketApiClient`.
2. **Services own rules.** Routes do not compute decay, XP, or streaks.
3. **Pet writes go through `PetService`.** Care persists decayed stats and resets `statsUpdatedAt`. Reads project decay; they do not write.
4. **One active pet per wallet** (`Pet.active`). On-chain allows one pet per `(owner, name)` — do not silently collapse those models.
5. **No auth.** `walletAddress` is whatever the client sends. Refuse to add payments, grants, or admin powers until nonce sign-in exists.
6. **Do not fake chain verification.** Payment confirm and Solana webhooks stay 501 / pending until they verify finality.

## Landmines

- `GET /pets/:petId/passport` has **no owner check**. Anyone with a pet id can read the timeline. Do not "fix" this casually if clients rely on it; do not put secrets in passport metadata.
- `GET /pets/:walletAddress` uses `walletAddressSchema.parse` (not the validator hook). Invalid wallets become **500**, not 400. New param parses should use `zValidator` or a mapped `ApiError`.
- A care that levels up writes **only** `level_up`, not a second `care_action`. A daily claim that levels writes **only** `daily_reward`. Don't "complete the timeline" by emitting both unless product asks.
- Claim updates XP/level only. It does **not** persist decayed vitals. That is intentional.
- `petId` path params are unvalidated strings (cuid from Prisma). Don't invent a second id scheme.
- `walletAddressSchema` is length 32–64, **not** a Solana pubkey check. Demo wallets in API tests are not valid pubkeys; SDK tx builders will reject them.
- Zod `petNameSchema` is JS string length; Rust/SDK enforce UTF-8 **bytes**. Multi-byte names can pass the API and fail on-chain. Trim on the client; stay in ASCII for names until this is unified.
- Item / event / payment Prisma tables exist. Services do **not** use them. Do not wire Prisma halfway and call it done.

## Persistence

Prisma + Postgres. Migrations live in `apps/api/prisma/migrations/`.

```sh
pnpm --filter @pawket/api prisma:generate
pnpm --filter @pawket/api prisma:migrate
```

Enums in Prisma (`luna_cat`, `feed`, …) match `@pawket/shared` string enums. Keep them identical.

## Adding an endpoint

Use skill `adding-api-endpoint`. Minimum set:

1. Schema + types in `packages/shared`
2. Service method + repository method (include the in-memory repo or tests cannot run)
3. Route in `app.ts`
4. Method on `PawketApiClient`
5. Test in `apps/api/src/app.test.ts` and, if the client encoding matters, `packages/pawket-sdk/src/apiClient.test.ts`
