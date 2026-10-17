# Guilds

A guild is a name, motto, crest and group of pets recorded on Solana. Guilds
support optional community participation; membership and coin holdings are
independent. The product hierarchy is pets, guilds, then coins.

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

`src/lib/guilds/guild.ts` owns slug, name, motto and crest validation;
`src/lib/guilds/boundary.ts` owns the community boundaries.

## Gatherings and permissions

| Actor | Permissions |
| --- | --- |
| Pet owner or authorized device | Join/leave, RSVP, check in and vote through a pet they keep |
| Founder | Create events and polls; launch the guild's coin while its founding pet remains a member; claim the founder's fees |
| Pawket | Delist its product surfaces; cannot move pets, change membership or reverse chain transactions |

Events have program-checked times and RSVPs per pet. Check-in uses that RSVP
within the allowed window. Polls accept one ballot per wallet with a pet in
the guild; coin balance and number of pets never increase vote weight.

The program still permits a founder to create events and polls after the
founding pet leaves. Existing RSVPs can also check in after membership ends.
Founder departure and succession remain unresolved in Q9 (`OPEN-QUESTIONS.md`);
do not describe the API's coin launch check as a general program role rule.

## Optional coins

A guild of three pets may launch one coin on a constrained devnet preset.
Trading is available only on `/guilds/[slug]/coin`, with disclosed terms and
risks. Holding only adds the crest pin to the holder's pets on that guild's
page; it grants no membership, vote weight or progression benefit.
`METEORA-INTEGRATION.md` describes the lifecycle and `SAFETY-ECONOMY.md` the
player protections.

## Reports and delisting

Guild pages link reports to the support contact in `src/config/site.ts`.
`src/lib/guilds/delisted.ts` controls promotion. A delisted guild leaves
discovery; its page explains the restriction and its coin is `suspended`, with
no trades offered by Pawket. Chain membership and holdings remain unchanged.
Pet identity stays primary; coin launch and trade controls stay off Home,
Profile, Passports and the Market.
