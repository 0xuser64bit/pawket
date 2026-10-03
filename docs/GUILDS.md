# Pawket — Guilds (optional community layer)

**Status:** Social guilds SHIP, on Solana, with **zero token mechanics** (2026-10, `DECISIONS.md`). Everything below §4's membership — events, votes, badges as their own items, moderation queues, and all of M6 — is still SPEC. Building token UI before M5 exits violates the product hierarchy (pets > guilds, play > protocol).

## 0. What ships

- A pet founds a guild (`found_guild`): a slug that is its address, a name, a motto and a crest (one of eight glyphs in one of six colours, bloom first). The founding pet is its first member.
- A pet joins one guild at a time (`join_guild`) and leaves when its owner likes (`leave_guild`; the rent goes back to whoever paid it). Pawket's sponsor pays the fee and the rent.
- `/guilds` lists every guild read live (most members first), `/guilds/[slug]` shows its pets read from their own accounts and what they have done together counted from their Passports, `/guilds/new` founds one, and a pet's Passport names its guild. The sticker book has *In a guild*.
- `src/lib/guilds/boundary.ts` is what a guild can and can never do; `src/lib/guilds/delisted.ts` stops Pawket promoting a guild without pretending to remove it. There is no review before founding.
- Starter guilds on devnet: Sunbeam Club, Muddy Paws, Cloud Nine (`scripts/seed-guilds.mts`).

## 1. What a guild is

A shared identity around a creator, pet community, event series, or cosmetic theme — with a public profile, events, votes, badges, and (M6) an optional token + treasury. Membership is social (DB); holding is chain balance. The two axes are independent: you can be a member without holding, and a holder without joining.

## 2. Roles

| Role | Powers | Notes |
| --- | --- | --- |
| Member | join/leave, RSVP, vote (1-person-1-vote), equip guild badges/cosmetics | no token required where guild allows |
| Moderator | pin events, hide abusive posts, escalate reports | appointed by admins, listed publicly |
| Admin | edit profile/utility, manage events/votes, propose treasury spends | wallets published; multisig for treasury (M6) |
| Pawket ops | approve/suspend/delist, publish incident records | product-surface only; never reverses chain state |

## 3. Lifecycle (product-surface)

```text
apply (branding, admins, utility, moderation plan, allocation, treasury policy, requestedPreset)
 → in-review (fit, misleading claims, prohibited utility, impersonation, legal, readiness)
 → approved (preset assigned, constrained — never free-form params v1)
 → published (supply, allocations, vesting, wallets, fees, quote asset, curve, threshold, DAMM v2 destination ALL public)
 → live (social features on; launch tab appears only M6+)
 → suspended (delisted, benefits off, factual record kept) → [appeal → reinstated | retired]
```

Application intake: `POST /api/guilds/apply` (rate-limited). Review queue is server-only; approval writes the public policy page before any launch config is visible.

## 4. Social features (M5 — no tokens)

- Discovery (`/guilds`): approved/live only, search by pet-type/creator/event; suspended excluded; each card shows purpose + member count + upcoming event — never prices.
- Profile (`/guilds/[slug]`): purpose, admins, utility statement, policy status, events, votes, badges, treasury summary (wallets + allowed uses; flows live M6).
- Events: create/RSVP/check-in; participation feeds game-health metrics + cosmetic drops (attendance badge).
- Votes: cosmetic themes, space decoration, event formats. One-member-one-vote; token-weighted voting is **banned** (would financialize governance). Double-vote rejected; non-members can't vote.
- Badges: non-competitive identity items (off-chain v1, Core NFT later); equippable in flair slot; sellable only if `tradeable:true` and never power-bearing.

## 5. Token-linked benefits (M6 — cosmetic/social only)

Eligibility service (`GET /api/guilds/:slug/eligibility?wallet=`) returns **only**: badges, flair, cosmetic unlocks, event-access flags, vote eligibility (still 1-person-1-vote; token may gate *which* cosmetic poll you can enter, never weight). Response type **must not** contain stat/xp/matchmaking/priority fields — asserted by test.

Selling may end these benefits; copy states this pre-purchase. Losing benefits never removes pets or blocks core play.

## 6. Moderation & impersonation

- Report flow on every guild surface (impersonation, scam links, misleading claims, abuse). Triage SLA published (e.g., 24h first response during pilot).
- Official-vs-third-party link badge: `official` (registry-verified domain/wallet) vs `community` (unverified) vs `blocked` (known scam). External links open with interstitial on first click during pilot.
- Suspension: delist + benefits off + banner on retained factual page. Copy: "Pawket removed promotion and in-app benefits under [policy]. On-chain assets are unaffected — we can't reverse transactions." Incident record created (see `SAFETY-ECONOMY.md`).

## 7. UI hierarchy (normative)

- Guild flair never outranks pet identity: pet avatar/name first, guild badge as small secondary chip (opt-in display).
- Launch/swap UI lives **only** under Guild → Launch tab, never in Home/Inventory/Pet/Marketplace.
- Pet-first nav order enforced (see `ROUTES.md`).

## 8. Agent DoD (E07)

- Two seed guilds operable: join → RSVP → vote → badge equip, all wallet-free except signing-gated writes (clearly marked).
- Tests: membership uniqueness, double-vote rejection, suspended-guild exclusion from discovery, report creation.
- Zero mint/quote/swap strings in guild routes (grep gate in PR).
