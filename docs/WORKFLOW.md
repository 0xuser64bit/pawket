# Change workflow

## Before editing

Read [AGENTS.md](../AGENTS.md), `ARCHITECTURE.md` and the owning system document. Inspect
Git status and the closest existing module. Identify the source of each fact,
its callers, tests, fixtures, config and exports. Name the files the change
must reach and the player data or compatibility behavior it could affect.

## Implement and review

Make the smallest complete change in the layers that own the behavior.
Preserve validation, error recovery, accessibility, storage migrations and
public redirects. Do not change program identities, game math or device
permissions as incidental cleanup. Keep program/client parity where required.

Before deleting a symbol or file, check runtime imports, dynamic references,
tests, scripts, route conventions and documentation. A protocol compatibility
instruction or a data migration is not dead simply because today's UI does
not call it. Keep operational scripts discoverable in their owning docs.

Review the diff for generated output, accidental env files, secret material,
honest UI copy and broken references. Update the owning document when a
contract or workflow changes. Docs describe current behavior; pending choices
belong in `OPEN-QUESTIONS.md`, and accepted choices in `DECISIONS.md`.

## Verify

Run the owning tests listed in `TESTING.md` and the full gate:

```sh
pnpm verify
```

Program or IDL changes also require `pnpm program:test` and a checked IDL diff.
Game math changes require both lockstep replays. Room asset changes require
`pnpm assets:3d`. Android changes require the relevant JVM, lint and device
checks. Complete a logical change and its checks before committing it with a
clear message.

## Definition of done

- [ ] One purpose per commit; callers, tests, fixtures, config and exports agree.
- [ ] Matching docs describe the implemented behavior and link to existing files.
- [ ] Relevant verification and `pnpm verify` pass.
- [ ] Program parity, custody, signing and source-of-truth boundaries remain intact.
- [ ] No secrets, unrelated work or generated build output included.
- [ ] Report states what changed, what was checked and any remaining verification gaps.

Temporary task notes, screenshots, release artifacts and local verification
logs belong outside tracked product docs. Keep release evidence with the
release artifacts; Git history retains earlier source and design decisions.
