# Pawket — Game Design (math, progression, retention)

**Status:** SPEC + LOCKED VALUES. Numbers below mirror `src/lib/game/` exactly. If the Anchor program changes, math + program constants + tests move together — never one side alone. Token balances must never enter these formulas.

## 1. Stats & care (locked)

- Initial: **72** all vitals (`INITIAL_STAT_VALUE`). Range 0–100, rounded, clamped.
- Cooldown: **30 min per action** (`CARE_COOLDOWN_SECONDS`), client-validated + on-chain 6002.
- No death state; floor 0.

| Action | Hunger | Happiness | Energy | Hygiene | XP |
| --- | --- | --- | --- | --- | --- |
| Feed | +23 | +2 | — | — | +10 |
| Play | −6 | +23 | −12 | — | +10 |
| Groom | — | +3 | — | +25 | +10 |
| Rest | — | — | +28 | — | +10 |

Implemented in `applyCareAction` (pure, tested exact). UI shows deltas before signing ("Feed: +23 hunger, +2 happiness, +10 XP").

## 2. Decay (off-chain estimate only)

Per hour: hunger **2.5**, happiness **1.8**, energy **1.5**, hygiene **1.2** (`STAT_DECAY_PER_HOUR`). Tuned so ~72 drifts to "needs care" over ~a day — daily-loop tension without missed-day punishment.

- Projection is **lazy**: stored stats = value at `statsUpdatedAt`; live = `applyStatDecay(stored, elapsed)`.
- UI labels projections **"estimate"** — chain never decays; only the display projects.
- `elapsedSecondsBetween` injects `now`; tests inject fixed clocks, never global-mock timers.

## 3. XP, levels, mood

- XP: **+10/care** (`XP_PER_CARE_ACTION`); daily-goal bonus **+25** (`DAILY_GOAL_REWARD_XP`, M4+).
- Level: `floor(xp/100)+1` (`BASE_XP_PER_LEVEL=100`); `xpForNextLevel(level)=level*100`.
- Mood priority: hunger<25→Hungry; energy<25→Tired; hygiene<25→Scruffy; happiness<25→Lonely; else avg≥88 Radiant, ≥68 Happy, else Okay. (`calculatePetMood` — exact thresholds tested.)

## 4. Passport (progression record)

`PetPassport` PDA (`[passport, pet]`) accumulates: care history, XP/level, streaks, achievements, memories (M4+). Timeline UI (`passport-timeline.tsx`) reads chain → indexer cache; guest passports are local-only and labeled as such.

## 4b. Guest record (this version)

The browser companion stores a care log (latest 40), a UTC streak, one
wearable id, and a play count. A finished playground round grants
`DAILY_GOAL_REWARD_XP` once per UTC day and does not change vitals. The
score does not scale the bonus. Chain care does not know about this bonus
yet — it stays a guest-record fact until a program change says otherwise.

## 5. Daily loop (target, M4)

1. Open Home → see mood + decay estimate.
2. 2–4 care actions (cooldown-spaced) → XP + Passport entries.
3. Daily goal (e.g., "3 cares + 1 playground game") → +25 XP + cosmetic fragment.
4. Streak: consecutive-active-days counter (timezone-safe: UTC day boundaries, inject `now`); streak break is forgiving copy ("Come back anytime — no penalties").
5. Share moment (playground result / new level) → share card.

## 6. Playground scoring (power-free)

- Scores derive from **care consistency + loadout flair display**, never token holdings, never spend.
- Formula sketch (E06 finalizes): `score = f(streak, moodAvg, varietyBonus) + cosmeticFlairDisplay(0 power)`. Flair affects presentation/tiebreak display only; document that tiebreaks are random-from-seed, not spend-weighted.
- Rewards: XP (existing path), cosmetic fragments, badges. No SOL prizes in v1 (legal/ops simplicity).

## 7. Customization (expression power = 0)

Cosmetics change look/mood-display only. Forbidden fields: `statModifier`, `xpBoost`, `cooldownReduction`, `matchmakingWeight`. Type + review gate in `AGENT-GUIDE.md`. Theory: attachment via recognition ("that's Maya's star-glasses MossPup"), not advantage.

## 8. Anti-bot & fairness

- Reuse on-chain cooldown as the primary throttle (can't farm faster than 30m/action on-chain).
- API rate limits: care-intent reads unlimited; order/vote/apply writes limited (see `API-CONTRACTS.md` 429).
- Anomaly flags (M4+): impossible care cadence across wallets, duplicate-device farming rings, wash-vote patterns → review queue, never auto-slash. Consequences published before enforcement.
- No pay-to-win also means no "energy refill for SOL" — rejected explicitly. Rest is the only energy path.

## 9. Balancing log (append, never rewrite)

| Date | Change | Reason |
| --- | --- | --- |
| 2026-09 | Initial 72 / deltas / 30m / decay table | Pre-reset shared package + program lockstep |

Agents: any rebalance edits `constants.ts` + program + `math.test.ts` exact values together, with a deploy-plan note and a new row here.
