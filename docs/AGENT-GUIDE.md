# Pawket — Agent Guide (how to implement without breaking things)

**Status:** NORMATIVE for all implementation work. Read before starting any task in `TASKS.md`. Extends `AGENTS.md` hard rules + `WORKFLOW.md` Definition of Done.

## 1. Start-of-turn checklist (2 min)

1. Read `AGENTS.md` + the **one** spec for your layer (`GAME-DESIGN.md` for math, `METEORA-INTEGRATION.md` for launches, etc.) + the closest existing module. Copy its shape.
2. Answer "where does this fact live?" from the sources-of-truth table (§5). If two places (math + program, schema + builder), you change both + tests.
3. Name the files before coding (per `WORKFLOW.md` §3). If you need a new source of truth, say so in the PR before creating it.
4. Check `OPEN-QUESTIONS.md`: if your task's blocking question is unresolved, do the **interface/schema** subtask only — never guess the integration.

## 2. Task sizing (one turn = one task in TASKS.md)

- Smallest coherent diff; one purpose per commit. No drive-by refactors, no new state library, no second client, no hand-rolled instruction bytes.
- A screen that sends a transaction is a Server shell + client leaf + `TransactionStatus` + an Explorer link. The guest record, wardrobe and playground do not send, and they do not get a fake transaction status.
- New API = Zod schema + handler + contract test. No unvalidated `req.json()`.

## 3. File ownership (who owns what — do not duplicate)

| Fact | Owner | You may… |
| --- | --- | --- |
| Game math, enums | `src/lib/game/` | extend values only with program + tests in same PR |
| Program ID/seeds/discriminators | `src/lib/solana/program.ts` | read; change only on human deploy-plan ask |
| PDA derivation | `src/lib/solana/pda.ts` | add new PDA only with seed review + determinism tests |
| Instruction builders | `src/lib/solana/instructions.ts` | add builders for adopted program ix only |
| Cluster/RPC/Explorer | `src/lib/solana/cluster.ts` | extend (no mainnet default change) |
| Browser client | `src/lib/solana/browser-client.ts` | never fork; server reads use read-only client |
| Tx lifecycle + UX copy | `src/lib/solana/transactions.ts` | reuse `toUserFacingError`, stages, 30s timeout |
| Meteora presets/stages | `src/lib/meteora/*` [FUTURE] | presets only; no raw curve math in components |
| Guest companion record | `src/lib/guest/` | extend with a migration; do not add a second store |
| Wearables | `src/lib/closet/catalog.ts` | add looks only; never a stat, XP, or cooldown field |
| Playground pattern | `src/lib/play/gates.ts` | score is presentation; the daily bonus stays flat |
| Guild boundary copy | `src/lib/guilds/boundary.ts` | the rule, not a fake guild |
| Eligibility (cosmetic/social) | future, not this file | never add power fields |
| Env | `.env.example` + `config/env.ts` + `server-env.ts` | example-first; secrets server-only |
| Routes | `app/` | Server by default; nav order pets-before-guilds |

## 4. Power-flow ban (pay-to-win prevention, enforced in review)

- `src/lib/game/` and scoring/eligibility code must never import token-balance, price, holder, or launch modules. Acceptable: reviewer runs `grep -r "token\|balance\|price\|holder\|launch" src/lib/game src/lib/guilds/eligibility*` and finds only comments explicitly marked `// SAFETY:` explaining absence.
- `Benefit` / `CosmeticDef` / scoring types must not contain `stat*`, `xp*`, `boost*`, `priority*`, `multiplier*`, `advantage*` fields. Tests assert key absence (`expect(Object.keys(b)).not.toContain(...)` style).
- Guild votes are 1-person-1-vote; token-weighted voting PRs are rejected with pointer to `GUILDS.md` §4.

## 5. Honesty & safety gates (PR checklist)

- [ ] Copy says "on-chain pet record" until NFT wiring exists; "preview — not saved" for off-chain equips; "estimate" for decay projections; "unknown — look up" for timeouts (never "failed").
- [ ] No "on-chain/owned/mainnet" unless wired; no guild-token prices outside Guild → Launch tab; no value promises anywhere.
- [ ] Banned-phrase grep clean: `guaranteed|moon|100x|risk-free|passive income|yield|APY|profit share|price support|can't lose` (case-insensitive) outside `SAFETY-ECONOMY.md` itself.
- [ ] Every send: explicit action → simulate/preflight → sign → confirm(30s) → reload → signature + Explorer link; CTA disabled while sending.
- [ ] No `NEXT_PUBLIC_` secrets; no seed/private-key handling; suspended-guild copy distinguishes product-surface vs chain.

## 6. Testing gates (extends TESTING.md)

- Touch math → exact-value tests. Touch PDA/ix → seeds, metas (order+role), discriminator bytes, arg encoding. Touch component → its test or manual note. Touch API → schema reject + envelope + pagination tests. Touch launch/eligibility → stage-machine + no-power-keys tests.
- Wallet signing verified in browser (devnet), never unit tests. E2E asserts shell/presence, never signatures.
- NewEpic? Add its contract/state-machine test first (fail → implement) when practical.

## 7. Prompt template (paste into agent turns)

```text
Implement TASKS.md <T##> (<title>).
Specs: <spec file> §<section> + DOMAIN-MODEL.md §<n> + ROUTES.md §<n> (if UI) + API-CONTRACTS.md §<n> (if API).
Constraints: AGENTS.md hard rules + AGENT-GUIDE.md §§3–5. Copy closest existing module (<path>).
Files: <list>. Tests: <list>.
Verify: <layer cmd> + typecheck; full `pnpm verify` before Done.
Report: files changed, commands+results, stubbed items, assumptions (per WORKFLOW.md §8).
If blocked by OPEN-QUESTIONS.md <Q#>, implement the interface subtask only and mark blocked.
```

## 8. Parallelization (safe to split after types freeze)

- After `DOMAIN-MODEL.md` types land: avatar + Home UI ∥ marketplace schema ∥ guild registry schema (different files, shared types).
- After presets freeze: quote-ticket UI ∥ launch-progress UI ∥ indexer verification job (contract-first: `LaunchStage` + quote envelope).
- Never parallelize: program-constant changes with UI that reads them (sequence: program → builders → UI → tests, one PR or stacked with explicit order).
