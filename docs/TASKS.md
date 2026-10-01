# Pawket — Tasks (sequenced, atomic, agent-ready)

**Status:** T01–T06 are done in the shape the product took (browser adoption first, "Keep it on Solana", a fee sponsor — see `DECISIONS.md` 2026-10); T09's equip is on chain; T15 shipped as the Park, the public Passport and its share card (the link is also a Blink); Q1's keepsake (a frozen Core card per pet) shipped outside this table. The rest is PLAN for the database and guild-token work — do not re-implement shipped loops as fixtures, and do not start T10+ while its question is open. Report per `WORKFLOW.md` §8. Mark done only with `pnpm verify` green (or the listed layer cmd + typecheck for docs-only steps — state which).

## M1 — Care loop (E01–E02)

| ID | Task | Files | Tests | Blocker | Done when |
| --- | --- | --- | --- | --- | --- |
| T01 | Adopt route shell + form (name/species/personality, validation, PDA preview) | `app/(game)/adopt/page.tsx`, `components/pet/adopt-form.tsx` | form validation test (2–24B, trim, emoji-bytes) | — | invalid names blocked pre-sign; valid shows derived-PDA preview |
| T02 | Adopt send wiring (builder → simulate → sign → confirm → reload → Explorer) | `adopt-form.tsx`, reuse `TransactionStatus` | component send-state test (mock client) + manual devnet note | T01 | devnet adopt confirms with Explorer link |
| T03 | Pet detail + care panel (stats/XP/mood/cooldown/decay-estimate) | `app/(game)/pet/[address]/page.tsx`, `components/pet/care-panel.tsx` | cooldown render test; mood thresholds covered by existing math tests | T02 | 4 actions work on devnet; cooldown countdown honest |
| T04 | Chain read helpers (Pet/Passport decode, loading/empty/wrong-owner) | `src/lib/solana/accounts.ts`, detail page | decode tests with fixture bytes; not-found path test | T01 | detail shows live RPC data labeled "live RPC read" |
| T05 | Guest mode + Home v1 (local pet, emotes, scene pickers, upgrade CTA) | `src/lib/guest/*`, `app/(game)/home/page.tsx`, `components/home/*` | guest reducer tests; banner + disabled-send test | T03 (types) | incognito completes loop wallet-free |
| T06 | M1 e2e + copy audit (shell, adopt presence, no-signing, honesty grep) | `e2e/game.spec.ts`, copy fixes | Playwright green | T02–T05 | `pnpm verify` green; audit checklist in PR |

## M2 — Identity + Inventory (E03)

| ID | Task | Files | Tests | Blocker | Done when |
| --- | --- | --- | --- | --- | --- |
| T07 | Freeze Pet/Cosmetic types + static catalog | `DOMAIN-MODEL.md` (confirm), `data/cosmetics.json`, `src/lib/cosmetics.ts` | catalog validation test (slots, species compat) | M1 exit | types imported by T08–T09 with no churn |
| T08 | Avatar renderer v1 (deterministic SVG + manifest) | `components/pet/pet-avatar.tsx`, `public/pets/v1/*` | determinism hash test | T07 | same input → same art everywhere |
| T09 | Inventory + customize (grid, equip preview, validation) | `app/(game)/inventory/page.tsx`, `app/(game)/pet/[address]/customize/page.tsx` | equip-validation tests (slot conflict, species) | T08 | equip reflects on Home/Inventory/Playground header |

## M3 — Backend + Marketplace (E04–E05)

| ID | Task | Files | Tests | Blocker | Done when |
| --- | --- | --- | --- | --- | --- |
| T10 | DB + sessions + env (Prisma schema per DOMAIN-MODEL §5, server-env, example) | `prisma/schema.prisma`, `src/server/db.ts`, `src/config/server-env.ts`, `.env.example` | contract smoke (migrate fresh) + secret-grep note | **Q2 human** | fresh `migrate deploy` works; no client secret leak |
| T11 | Pets/marketplace read APIs + envelopes | `app/api/pets/**`, `app/api/marketplace/listings/route.ts` + schemas | schema-reject + pagination tests | T10 | paginated reads with freshness meta |
| T12 | Marketplace browse + detail UI | `app/(game)/marketplace/**`, `components/marketplace/listing-card.tsx` | empty/loaded/error tests; e2e presence | T11 | wallet-free browse; no bonding-curve language |
| T13 | Checkout + receipts (intent → sign → confirm → receipt) | `components/marketplace/checkout-sheet.tsx`, `app/api/marketplace/orders/**`, receipt page | fee-math exact; idempotency; unknown-lookup path | T12 | devnet purchase → receipt + Explorer link |

## M4 — Playground + Social (E06, E12-part)

| ID | Task | Files | Tests | Blocker | Done when |
| --- | --- | --- | --- | --- | --- |
| T14 | Mini-game v1 (async, power-free scoring) + goals/streaks | `app/(game)/playground/page.tsx`, `src/lib/play/scoring.ts`, goals API | scoring determinism; streak TZ tests | T09 | wallet-free play earns XP-path rewards; no token imports in scoring |
| T15 | Share cards + friend visits (read-only) | `app/(game)/share/[petId]/page.tsx`, visit view | OG render test; visit read-only test | T14 | share link renders without wallet |
| T16 | Analytics events v1 (game-health stream + gates) | `src/server/analytics/*`, dashboard stub | schema tests (PII rejected) | T14 | retention + wallet-free-completion events flowing |

## M5 — Social guilds (E07, E11-part)

| ID | Task | Files | Tests | Blocker | Done when |
| --- | --- | --- | --- | --- | --- |
| T17 | Guild registry + discovery + profile (no tokens) | `app/(game)/guilds/**`, `app/api/guilds/**`, `components/guilds/guild-card.tsx` | membership + suspended-exclusion tests | T10 | approved guilds browsable; suspended hidden |
| T18 | Events + votes (1p1v) + badges (off-chain) | event/vote/badge tables + pages + APIs | double-vote + non-member rejection tests | T17 | seed guild runs event + vote end-to-end |
| T19 | Moderation queue + report flow + suspension semantics | server console pages, report API, incident record | suspension tests (benefits off, record kept) | T17 | report → review → suspend drill passes |

## M6 — Launches (E08–E10, E11–E12 rest)

| ID | Task | Files | Tests | Blocker | Done when |
| --- | --- | --- | --- | --- | --- |
| T20 | Preset registry + stage machine (pure, no SDK yet) | `src/lib/meteora/presets.ts`, `launch-state.ts` | preset + stage tests (incl. lag case) | **Q3 human** | presets frozen + hashed; stages cover all 5 |
| T21 | Quote API (server, SDK-backed) + launch-state API | `app/api/guilds/[slug]/quotes`, `.../launch` | quote envelope; ROUTE_PAUSED on pending | T20 + **Q4** | expiring quotes; unverified pool never quoted |
| T22 | Launch tab UI (progress + ticket + disclosure + treasury) | `guilds/[slug]/launch/*`, `quote-ticket.tsx`, `risk-disclosure.tsx`, `treasury-table.tsx` | disclosure-gate; pending-blocks-send tests (mocked) | T21 + **Q6 legal** | devnet pilot buy works with full disclosure |
| T23 | Migration verification job + tx-status + eligibility + lag status | `src/server/indexer/*`, `/api/tx/:sig`, `/api/guilds/:slug/eligibility`, `/api/indexer/status` | verification mismatch; reconciliation; no-power-keys | T21 | kill-indexer drill passes; DAMM v2 activates on verification |
| T24 | Pilot hardening (limits, alerts, runbooks, gate checklist) | alerts, dashboards, `SAFETY-ECONOMY.md` checklist evidence | gate tests (missing signal blocks ready-flag) | T22–T23 | pilot evaluated on participation/retention/safety, not price |

## M7 — Scale gate (human sign-off)

| ID | Task | Files | Tests | Blocker | Done when |
| --- | --- | --- | --- | --- | --- |
| T25 | Self-service application flow (behind review) + DLMM evaluation note | apply flow hardening, `OPEN-QUESTIONS.md` updates | load + abuse tests | M6 metrics green | broader availability explicitly approved or deferred with reasons |

**Parallelization notes:** T08 ∥ T11-schema-design after T07/T10-types; T22-subcomponents ∥ T23-job after T20/T21-contracts. Never parallelize program-constant edits with their consumers.
