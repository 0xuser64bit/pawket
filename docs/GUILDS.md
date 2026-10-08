# Pawket — Guilds (optional community layer)

**Status:** Guilds ship on Solana (2026-10). A guild of three pets may launch one optional coin on Meteora from Pawket's presets (devnet; `METEORA-INTEGRATION.md`). A guild's founder plans events its pets RSVP to and check in at, and asks polls each wallet with a pet in it answers once. The product hierarchy holds: pets > guilds > coins, and a coin is traded only on its own page.

## 0. What ships

- A pet founds a guild (`found_guild`): a slug that is its address, a name, a motto and a crest (one of eight glyphs in one of six colours, bloom first). The founding pet is its first member.
- A pet joins one guild at a time (`join_guild`) and leaves when its owner likes (`leave_guild`; the rent goes back to whoever paid it). Pawket's sponsor pays the fee and the rent.
- `/guilds` lists every guild read live (most members first), `/guilds/[slug]` shows its pets read from their own accounts and what they have done together counted from their Passports, `/guilds/new` founds one, and a pet's Passport names its guild. The sticker book has *In a guild*.
- `src/lib/guilds/boundary.ts` is what a guild can and can never do; `src/lib/guilds/delisted.ts` stops Pawket promoting a guild without pretending to remove it. There is no review before founding.
- Starter guilds on devnet: Sunbeam Club, Muddy Paws, Cloud Nine (`scripts/seed-guilds.mts`), each with a coin at a different stage (`scripts/seed-coins.mts`).
- Gatherings on a guild's page: events (`create_event`, `rsvp`, `check_in`) and polls (`create_poll`, `vote`, one ballot per wallet, no weight). The founder plans and asks; the sponsor pays the rent.
- A guild's coin (`/guilds/[slug]/coin`): launched by the founder once three pets are in the guild, on the gentle or lively preset; holders' pets wear the crest pin on the guild's page, and nothing else. See `METEORA-INTEGRATION.md`.

## 1. What a guild is

A name, a motto and a crest kept on Solana, and the pets in it. Membership
is a program account per pet (`GuildMember`, one guild at a time); holding
the guild's coin is a token balance. The two are independent: a pet can be
in a guild whose coin its owner never holds, and anyone can hold a coin
without a pet in the guild. Holding only pins the guild's crest on the
holder's pets, on the guild's own page.

## 2. Who can do what

| Who | Can | Never |
| --- | --- | --- |
| A pet's owner | join or leave with that pet, RSVP and check in, answer a poll once per wallet | vote twice, or with weight |
| The founder (a wallet, set at founding) | plan events, ask polls, launch the coin while the founding pet is in the guild, claim the founder's share of its fees | add or remove a pet, change a pet |
| Pawket | stop promoting a guild (`src/lib/guilds/delisted.ts`), which also stops coin trades on Pawket's pages | reverse anything on chain, take a pet out, touch a coin |

## 3. Reports and delisting

A report about a guild (impersonation, a scam link, a misleading claim,
abuse) is an email to hi@pawket.world from the guild's page. Pawket's one
lever is delisting: the guild leaves discovery, its page says what Pawket
stopped doing, and its coin's stage reads `suspended` (no trades offered).
Everything on chain stays as it is.

## 4. UI hierarchy (normative)

- Guild flair never outranks pet identity: the pet's face and name first,
  the guild as a small secondary chip.
- Launch and trade live only on the coin's page (`/guilds/[slug]/coin`),
  never on Home, Profile, a pet's record or the Market.
- Pets before guilds in every navigation (`ROUTES.md`).
