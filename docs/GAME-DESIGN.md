# Game design

Numbers below mirror `src/lib/game/` exactly. If the Anchor program changes, math + program constants + tests move together — never one side alone. Token balances must never enter these formulas.

## Stats and care

Playground rounds have a Pause/Resume control and pause when the page is
hidden, preserving the round. Catch captures the finger until it lifts;
hovering before the first tap does not start a round. Copy locks its input
between patterns and replays the current demonstration after a pause.
Pairs keeps a completed round until its result is delivered, even across
pause/resume or a changed render callback. These are interaction rules;
the scores, seeds, daily XP and program math are unchanged.

- Initial: **72** all vitals (`INITIAL_STAT_VALUE`). Range 0–100, rounded, clamped.
- Cooldown: **30 min per action** (`CARE_COOLDOWN_SECONDS`), client-validated + on-chain 6002.
- No death state; floor 0.

| Action | Hunger | Happiness | Energy | Hygiene | XP |
| --- | --- | --- | --- | --- | --- |
| Feed | +23 | +2 | — | — | +10 |
| Play | −6 | +23 | −12 | — | +10 |
| Groom | — | +3 | — | +25 | +10 |
| Rest | — | — | +28 | — | +10 |

Implemented in `applyCareAction` (pure, tested exact). Home shows the recorded
XP gain after a successful care; it does not preview each stat delta.

## Decay

Per hour: hunger **2.5**, happiness **1.8**, energy **1.5**, hygiene **1.2** (`STAT_DECAY_PER_HOUR`). Tuned so ~72 drifts to "needs care" over ~a day — daily-loop tension without missed-day punishment.

- Decay is **lazy**: stored stats = value at `statsUpdatedAt`; live = `applyStatDecay(stored, elapsed)`. A care decays to now first, then applies its deltas — in the browser record and in the program alike.
- Computed **exactly**, in integers: `round(v − rate·h)` = `floor((36000·v − 10·rate·s + 18000) / 36000)`, clamped 0–100, `s` whole seconds. `src/lib/game/lockstep.txt` holds the browser and the program to the same numbers.
- UI labels the projection between cares **"estimate"**: it is what the next care will find, not something the chain has written yet.
- `elapsedSecondsBetween` injects `now`; tests inject fixed clocks, never global-mock timers.

## XP, levels and mood

- XP: **+10/care** (`XP_PER_CARE_ACTION`); first recorded round of a UTC day **+25** (`DAILY_GOAL_REWARD_XP`).
- Level: `floor(xp/100)+1` (`BASE_XP_PER_LEVEL=100`); the next level comes at `level*100` XP.
- Mood priority: hunger<25→Hungry; energy<25→Tired; hygiene<25→Scruffy; happiness<25→Lonely; else avg≥88 Radiant, ≥68 Happy, else Okay. (`calculatePetMood` — exact thresholds tested.)

## Passport

`PetPassport` PDA (`[passport, pet]`) holds the UTC-day streak and best streak, care and round counts, an event count, and a ring of the last eight cares. `/pet/<address>` renders it from chain for anyone. Stickers are derived from the record without separate entitlement state. A browser pet's record is local-only and labeled as such.

## Local record

A browser keeps as many companions as the player adopts (`pawket.pets.v1`),
and one is at home. Each stores a care log (latest 40), a UTC streak and its
best run (the Passport's `best_streak`, kept the same way), one wearable id,
and a play count. A finished playground round grants
`DAILY_GOAL_REWARD_XP` once per UTC day and does not change vitals. The
score does not scale the bonus. On Solana, `finish_round` grants the same
bonus by the same rule, when the player records the round.

## Daily loop

Home's Today panel contains the checklist below — each of the four cares and
one playground round, on the streak's UTC day. It grants nothing the record
does not already grant.


1. Open Home → see mood + decay estimate.
2. 2–4 care actions (cooldown-spaced) → XP + Passport entries.
3. Finish one playground round → +25 XP once per pet per UTC day. The care checklist grants no extra reward.
4. Streak: consecutive-active-days counter (timezone-safe: UTC day boundaries, inject `now`); streak break is forgiving copy ("Come back anytime — no penalties").
5. Share a playground score as text and a link, or use Home's Photo tool to
   capture the room with the selected frame. A new level is announced after care.

## Playground

Four games ship, each one round, each a pure step function of a seed and
the player's input (`src/lib/play/`), tested for determinism. A game card
plays today's round — one seed per game per UTC day, the same for everyone
(`dailySeed`) — and Practice plays a new one. Any of the player's pets can
play; the bonus goes to that pet.

| Game | Round | Score |
| --- | --- | --- |
| Catch (`catch.ts`) | 30 s or three storm clouds | treats caught (a star is three) |
| Hop (`hop.ts`) | until the first bump; the path speeds up from 0.42 to 1.05 field widths a second | ten a field width run, five a heart |
| Copy (`copy.ts`) | until the first wrong bean; the pattern grows by one | longest pattern copied |
| Pairs (`pairs.ts`) | until all six pairs are found | 60, less 2 a miss, never under 6 |

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

## Customization

Cosmetics change appearance only. The catalog test excludes stat modifiers,
XP boosts, cooldown reductions and matchmaking weights. Three pet pieces are
free; twenty-five more are sold once in the Market at program-fixed prices,
then worn with `dress_owned`. Stickers derive from the record
(`src/lib/game/badges.ts`) and grant no entitlement. Player hats and glasses
also change appearance only.

## Fairness and abuse limits

- Reuse on-chain cooldown as the primary throttle (can't farm faster than 30m/action on-chain).
- Rate limits: the RPC proxy, the Actions and the coin routes limit each caller, and the rent the sponsor pays is limited per key and by an hourly budget read from its balance (`mayPayRent`, `src/server/sponsor.ts`).
- There is no bot detection or review queue. Wallet and guestbook counts are not Sybil-resistant.
- No pay-to-win also means no "energy refill for SOL" — rejected explicitly. Rest is the only energy path.

## Changing the rules

A rebalance changes `src/lib/game/constants.ts`, the program, the lockstep
fixture and both replay suites together, with an explicit deploy plan.
Cosmetic additions do not rebalance the game. Historical balance and catalog
changes remain in Git history; current slots and prices live in the catalog
and program.
