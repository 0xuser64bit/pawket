# Testing

## What exists

| Layer                             | Where                                          | Runner                            |
| --------------------------------- | ---------------------------------------------- | --------------------------------- |
| Game math / daily goals / schemas | `packages/shared/src/game.test.ts`             | Vitest                            |
| SDK API client                    | `packages/pawket-sdk/src/apiClient.test.ts`    | Vitest                            |
| SDK PDAs + instruction layouts    | `packages/pawket-sdk/src/solanaClient.test.ts` | Vitest                            |
| API lifecycle                     | `apps/api/src/app.test.ts`                     | Vitest + `InMemoryPetRepository`  |
| Mobile                            | none (`vitest --passWithNoTests`)              | —                                 |
| Anchor                            | `programs/pawket/tests/pawket.ts`              | **stub** — does not adopt or care |

```sh
pnpm test                  # turbo, all TS packages
pnpm invariants            # program id / IDL / constant lock
pnpm verify                # invariants + format + lint + typecheck + test
cd programs/pawket && anchor test
```

## Mandatory coverage

| Change                                  | Required tests                                                                                                                      |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Shared math / schemas / daily goals     | Update `game.test.ts`. If a constant changed, `pnpm invariants` must pass.                                                          |
| API route or `PetService`               | Extend `app.test.ts` (happy path + authz + conflict). Update the in-memory repo.                                                    |
| SDK HTTP method                         | `apiClient.test.ts` for URL / body / error mapping.                                                                                 |
| SDK PDA or builder                      | Lock address + account metas + discriminator + arg bytes in `solanaClient.test.ts`.                                                 |
| Anchor instruction / constraint         | A real `anchor test` case that submits the ix. The stub "documents required test cases" is not coverage.                            |
| Mobile presentational tweak             | No new test required.                                                                                                               |
| Mobile session / navigation / care flow | Add a Vitest test next to the module if you extract logic; otherwise exercise via typecheck + a manual route walk listed in the PR. |

## How to write them

- API tests go through `createApp({ petService: new PetService(new InMemoryPetRepository(now), now) })` and `app.request`. Clock injection is how decay and cooldown are tested.
- Shared tests are pure functions. Prefer exact objects over loose snapshots.
- SDK Solana tests must keep the locked PDA addresses for owner `So1111…112` + name `Nova`. If they change, the seeds changed — that is a breaking change, not a test fix.
- Anchor tests should cover: adopt, care state change, foreign-owner reject, cooldown reject, invalid name reject. Those four names are already listed in the stub.

## What not to test

- Pixel positions, gradient strings, haptic calls.
- Prisma SQL.
- Jupiter / Mercuryo until they have a real implementation.
- Mainnet.

## Agent rule

If you changed behavior and did not change a test, the change is incomplete unless it is purely visual.
