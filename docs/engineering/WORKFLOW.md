# Agent workflow

Use this on every non-trivial task. "It typechecks" is not done.

## 1. Understand

Read `AGENTS.md` and the one engineering doc for the layer you will touch. Skim the closest existing feature — copy that shape, not a blog-post architecture.

## 2. Locate

Answer "where does this fact live?" from [../REPO_MAP.md](../REPO_MAP.md). If the answer is two places (shared + Rust, schema + SDK), you will change both.

## 3. Plan

Name the layers: shared / api / prisma / sdk / mobile / program. If a feature needs a new source of truth, say so before coding.

## 4. Implement

Smallest coherent change. No drive-by refactors. No new state library. No second API client. No hand-rolled instruction bytes.

Load the matching skill in `.agents/skills/` when the task is one of: mobile feature, API endpoint, Solana instruction, game math, transaction flow.

## 5. Validate

| You touched           | Run                                                                        |
| --------------------- | -------------------------------------------------------------------------- |
| TS in one package     | that package's `typecheck` + `test`                                        |
| Shared contracts      | `pnpm --filter @pawket/shared test` and the API/SDK tests that import them |
| Program or SDK Solana | `pnpm invariants` + SDK solana tests                                       |
| Several packages      | `pnpm verify`                                                              |

## 6. Test

Add the tests [TESTING.md](TESTING.md) marks mandatory. Watch them fail if you are adding a new rule, then implement.

## 7. Review the diff

- Accidental files (`dist`, `.expo`, `target`, `.env`)? Revert.
- Honest copy? No "on-chain" unless you wired it.
- Program ID / discriminators / seeds only changed if that was the task.

## 8. Verify

Before you say done:

```sh
pnpm verify
```

If you changed Rust:

```sh
cd programs/pawket && anchor build
pnpm idl:sync
pnpm invariants
cd programs/pawket && anchor test
```

If Anchor CLI is missing, say so. Do not pretend `anchor test` passed.

## 9. Report

- What changed (layers + files).
- Commands run and their results.
- What is still stubbed.
- Any invariant or product assumption you had to interpret.
