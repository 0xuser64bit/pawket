# Guilds

A guild is a name, motto, crest and group of pets recorded on Solana. Guilds
support optional community participation; membership and coin holdings are
independent. The product hierarchy is pets, guilds, then coins.

For membership and permissions, inspect `src/lib/guilds/guild.ts`, the builders
in `src/lib/solana/instructions.ts` and guild/gathering constraints in
`programs/pawket/src/lib.rs`. [SOLANA.md](SOLANA.md) explains signers and rent;
[METEORA-INTEGRATION.md](METEORA-INTEGRATION.md) owns coin transactions, not
this document. [SECURITY.md](SECURITY.md) records moderation and count limits.

## Membership and discovery

A pet founds or joins one guild at a time. Its `GuildMember` PDA records the
pet, owner, guild and rent payer. Leaving closes that account and returns rent
to the recorded payer; the guild remains. Non-money app actions use the linked
Pawket Wallet. Eligible fees and account rent are sponsored while
available; rent-bearing actions wait when sponsorship is unavailable.

`/guilds` reads guilds from chain and orders them by member count, excluding
test and delisted guilds. `/guilds/[slug]` reads its pets and Passport totals;
`/guilds/new` creates one. A pet's Passport links its guild. There is no
pre-founding approval workflow or off-chain membership database.

A slug is first come, first served. The program refuses `RESERVED_SLUGS`
(`new`, the create route), mirrored as `GUILD_LIMITS.reserved`.
`src/lib/guilds/guild.ts` owns slug, name, motto and crest validation;
`src/lib/guilds/boundary.ts` owns the community boundaries.

## Gatherings and permissions

| Actor | Permissions |
| --- | --- |
| Pet owner or authorized device | Join/leave, RSVP, check in and vote through a pet they keep |
| Founder (or authorized device for events/polls) | While the founding pet remains a member: create events and polls. Only the founder's owner wallet approves a coin launch or fee claim; fee claims do not require continued membership |
| Pawket | Delist its product surfaces; cannot move pets, change membership or reverse chain transactions |

Events have program-checked times and RSVPs per pet. Check-in uses that RSVP
within the allowed window. Polls accept one ballot per wallet with a pet in
the guild; coin balance and number of pets never increase vote weight.

An open guild page updates check-in availability at the early check-in window,
moves events to the past at their end time and closes voting at the poll's
closing time. It schedules the next boundary rather than ticking every second,
and catches up when the page becomes visible or regains focus. These are local
display updates; the program still checks times when a transaction is sent.

A founder's powers follow the founding pet. The program reads that pet's
member account for every event and poll, so they stop while it is out of the
guild and return if it rejoins. Nobody succeeds to the role: such a guild keeps
its pets, events and polls, and plans nothing new. A pet checks in only while
it is in the event's guild. The founder's coin-fee rights are Meteora's record
and stay with the founder's wallet (`DECISIONS.md`).

## Optional coins

A guild of at least three pets may launch one coin on a constrained devnet preset.
The threshold counts pets, not distinct owners. The launch API checks the
listed guild, founder wallet, member count and founding pet's current
membership before preparing a Meteora transaction. These are server checks;
the Pawket program owns membership and event/poll permissions, not the coin's
external pool rules. No coin launches automatically when the threshold is met.
Trading is available only on `/guilds/[slug]/coin`, with disclosed terms and
risks. Holding only adds the crest pin to the holder's pets on that guild's
page; it grants no membership, vote weight or progression benefit.
`METEORA-INTEGRATION.md` describes the lifecycle and `SAFETY-ECONOMY.md` the
player protections.

## Reports and delisting

Guild pages link reports to the support contact in `src/config/site.ts`.
`src/lib/guilds/delisted.ts` controls promotion. A delisted guild leaves
discovery; its page explains the restriction and its coin is `suspended`, with
no trades offered by Pawket. A guild without a curve still has stage `none`,
but its launch is refused. Chain membership and holdings remain unchanged.
Pet identity stays primary; coin launch and trade controls stay off Home,
Profile, Passports and the Market.
