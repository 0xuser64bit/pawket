# Workflow

Use this on every non-trivial task. "It typechecks" is not done.

## 1. Understand

Read `AGENTS.md` and the one doc for the layer you will touch. Skim the
closest existing module — copy that shape, not a blog-post architecture.

## 2. Locate

Answer "where does this fact live?" from the Sources of Truth table in
`AGENTS.md`. If the answer is two places (game math + program constants,
schema + builder), you will change both.

## 3. Plan

Name the files before coding. If a change needs a new source of truth, say so
before creating it.

## 4. Implement

Smallest coherent change. No drive-by refactors, no new state library, no
second client, no hand-rolled instruction bytes in components.

## 5. Test

Add the tests `docs/TESTING.md` marks mandatory. Watch a new rule fail before
implementing it when practical.

## 6. Review the diff

- Accidental files (`.next`, `coverage`, `.env*` other than example)? Revert.
- Honest copy? No "on-chain" unless wired.
- Program ID / discriminators / seeds only changed if that was the task.

## 7. Verify

```sh
pnpm verify
```

If you changed Rust or the IDL (future program work), also rebuild, re-sync,
and re-run program tests — and say so explicitly if the toolchain is missing.

## 8. Report

What changed (files), commands run and results, what is still stubbed, and
any invariant or product assumption you interpreted.

## Definition of Done

- [ ] Smallest coherent diff; one purpose per commit with a clear message.
- [ ] Matching doc updated if behavior or contracts changed.
- [ ] Mandatory tests added/extended and passing.
- [ ] `pnpm verify` green (typecheck + lint + test + build).
- [ ] No secrets, no custody violations, no optimistic on-chain state.
- [ ] UI copy honest about what is wired vs stubbed.
- [ ] Report lists changes, verification, and deferred work.
