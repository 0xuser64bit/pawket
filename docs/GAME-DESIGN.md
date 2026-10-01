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

## 2. Decay (lazy, and enforced on chain)

Per hour: hunger **2.5**, happiness **1.8**, energy **1.5**, hygiene **1.2** (`STAT_DECAY_PER_HOUR`). Tuned so ~72 drifts to "needs care" over ~a day — daily-loop tension without missed-day punishment.

- Decay is **lazy**: stored stats = value at `statsUpdatedAt`; live = `applyStatDecay(stored, elapsed)`. A care decays to now first, then applies its deltas — in the browser record and in the program alike.
- Computed **exactly**, in integers: `round(v − rate·h)` = `floor((36000·v − 10·rate·s + 18000) / 36000)`, clamped 0–100, `s` whole seconds. `src/lib/game/lockstep.txt` holds the browser and the program to the same numbers.
- UI labels the projection between cares **"estimate"**: it is what the next care will find, not something the chain has written yet.
- `elapsedSecondsBetween` injects `now`; tests inject fixed clocks, never global-mock timers.

## 3. XP, levels, mood

- XP: **+10/care** (`XP_PER_CARE_ACTION`); daily-goal bonus **+25** (`DAILY_GOAL_REWARD_XP`, M4+).
- Level: `floor(xp/100)+1` (`BASE_XP_PER_LEVEL=100`); `xpForNextLevel(level)=level*100`.
- Mood priority: hunger<25→Hungry; energy<25→Tired; hygiene<25→Scruffy; happiness<25→Lonely; else avg≥88 Radiant, ≥68 Happy, else Okay. (`calculatePetMood` — exact thresholds tested.)

## 4. Passport (progression record)

`PetPassport` PDA (`[passport, pet]`) holds the UTC-day streak and best streak, care and round counts, an event count, and a ring of the last eight cares. `/pet/<address>` renders it from chain for anyone. Achievements and memories (M4+) can be derived from these counts without new state. A browser pet's record is local-only and labeled as such.

## 4b. Guest record (this version)

The browser companion stores a care log (latest 40), a UTC streak, one
wearable id, and a play count. A finished playground round grants
`DAILY_GOAL_REWARD_XP` once per UTC day and does not change vitals. The
score does not scale the bonus. On Solana, `finish_round` grants the same
bonus by the same rule, when the player records the round.

## 5. Daily loop (target, M4)

1. Open Home → see mood + decay estimate.
2. 2–4 care actions (cooldown-spaced) → XP + Passport entries.
3. Daily goal (e.g., "3 cares + 1 playground game") → +25 XP + cosmetic fragment.
4. Streak: consecutive-active-days counter (timezone-safe: UTC day boundaries, inject `now`); streak break is forgiving copy ("Come back anytime — no penalties").
5. Share moment (playground result / new level) → share card.

## 6. Playground (power-free)

Three games ship, each one round, each a pure step function of a seed and
the player's input (`src/lib/play/`), tested for determinism:

| Game | Round | Score |
| --- | --- | --- |
| Catch (`catch.ts`) | 30 s or three storm clouds | treats caught (a star is three) |
| Hop (`hop.ts`) | until the first bump; the path speeds up from 0.42 to 1.05 field widths a second | ten a field width run, five a heart |
| Copy (`copy.ts`) | until the first wrong bean; the pattern grows by one | longest pattern copied |

- Finishing any of them is the day's round: `DAILY_GOAL_REWARD_XP` once per
  UTC day, the same rule `finish_round` enforces on chain. The score never
  scales it and is never sent anywhere; a player's best per game is kept on
  their device only (`best.ts`).
- No game module imports `src/lib/game`, `guest`, `closet` or `solana`
  (`games.test.ts` holds this): a vital, a level, a wearable or a balance
  cannot reach a score.
- Hop is always clearable: every gap is a full jump, the obstacle and the
  pet's own width apart at the speed it is met. The jump is floaty enough
  that the starting window is about 0.3 s.
- Rewards: XP (existing path). No SOL prizes (legal/ops simplicity).

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
| 2026-10 | Decay computed in exact integers (same values, no float edge); decay, streak and the daily round enforced on chain | Program v2: the browser record and the program must agree to the point |

Agents: any rebalance edits `constants.ts` + program + `math.test.ts` exact values together, with a deploy-plan note and a new row here.
