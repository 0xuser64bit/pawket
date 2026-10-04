# Decisions

Record of architectural decisions. Newest first. Add an entry when a decision
changes — never rewrite history.

## 2026-10: Everything before mainnet is v0

**Context:** Devnet upgrades had started to be counted (v2, v3, v4…) for a
product nobody outside the team has used yet. A number like that promises a
history Pawket does not have.
**Decision:** The program, the app and the docs are v0 for the whole of
devnet and the hackathon, however often the program is upgraded there. A
devnet upgrade is named by what it adds and the date it landed. Mainnet is
v1. Versions of other projects — Kit v8, Tailwind v4, Meteora's DAMM v2, the
SBF v2 target — keep their own names.
**Consequence:** A backup of a replaced devnet binary is named by date
(`.keys/backups/`). Commit messages written before this decision still say
"v5"; history is not rewritten.

## 2026-10: A guild may launch a coin, on Meteora, from Pawket's presets

**Context:** The vision always had guild coins (`VISION.md`, M6), and the
Colosseum Crypto World's Fair runs a Meteora DBC track. Guilds already live
on Solana; what a coin needed was a launch path that cannot be bent into a
pump: no free-form curves, no allocations, no liquidity anyone can pull,
and nothing a coin can do to a pet.
**Decision:** A guild with at least three pets may launch one coin, by its
founder, on one of two presets — gentle (the price rises 3× along the
curve) or lively (10×) — each a Meteora Dynamic Bonding Curve config
account Pawket made once (`scripts/coin-presets.mts`): one billion coins,
fixed, immutable authority, no vesting, 1% fee (a fifth to Meteora, the
rest halved between the founder and Pawket's treasury), and graduation
into a DAMM v2 pool with all of its liquidity permanently locked, half in
the founder's position and half in Pawket's. A coin's mint key derives
from the sponsor's secret and the guild's slug, as a keepsake's does, so a
guild has one coin at one address and nobody else can make one there.
Quotes, launches, trades, graduation and the founder's fee claim are built
on the server with Meteora's SDKs and signed only in the player's wallet;
the player pays every fee — the sponsor pays for pets, never for coins.
Stages (none, curve, graduating, graduated, suspended) are read from chain
on each request; the graduated pool is trusted only at the address the
preset derives. Holders' pets wear the guild's crest pin on its page, and
nothing else. Meteora's SDKs (web3.js v1, Anchor) are confined to
`src/server/coins/` and `scripts/` by a lint rule.
**Consequence:** M6 ships on devnet without a database or an indexer, and
the order changed for the hackathon: coins before guild events and votes.
Mainnet waits on a legal review of the coin copy (Q6) and on presets made
there (`docs/MAINNET.md`). On devnet, graduation is a button anyone may
press (Meteora's keepers do it on mainnet). Rotating the sponsor key moves
where new coins are looked for, as it does keepsakes. The starter guilds
show a coin at every stage (`scripts/seed-coins.mts`).

## 2026-10: With 3D chosen, the room waits with the paw, not the flat room

**Context:** The flat room held the frame while the 3D one built, so every
refresh showed the flat room's characters for a second before the 3D ones
replaced them — two versions of the same two characters in a row.
**Decision:** With 3D chosen, the frame holds the paw loader over the room's
wall and floor until the first 3D frame, then crossfades; choosing 3D from
the flat room clears it to the loader first. The flat room shows only where
it is the room: chosen, without WebGL 2, or after a failure.
**Consequence:** A refresh shows the paw for the second the 3D room takes,
never the flat room; the 300ms "pill" over the flat room is gone.

## 2026-10: A Pawket Wallet, so care stops asking every time

**Context:** Every care, round and outfit for a pet on Solana opened the
wallet to approve it — the sponsor paid, but the player still clicked
Approve dozens of times a day. Players were happy to pay their own fees;
they were not happy to be asked each time.
**Decision:** An additive program upgrade: a `PawketWallet` PDA per owner
(`[wallet, owner]`) whose lamports above rent are a balance only the owner
fills or empties, and one linked device key that may sign
`care_by_device`, `finish_round_by_device` and `dress_by_device` for the
owner's pets — and nothing that moves money — until an end date (≤ 30
days) and under a daily limit (≤ 500), both set by the owner when linking.
The device key is a non-extractable WebCrypto key made and kept in the
browser; the device co-signs its own link. The device pays its own fees
from a 0.001 SOL float and each action refills it from the balance by at
most that fee, so the balance pays for actions and nothing else. The
sponsor pays the fee to manage a wallet but never signs a device's action,
and never pays a wallet's rent. History is read from the chain.
**Consequence:** A linked device on Solana acts with no prompt; everything
else still asks. A device key is the one key Pawket makes for a player —
AGENTS.md's custody rule now says exactly what it can and cannot do. A key
that leaked can at worst spend the daily limit's fees and the float, and
the owner can unlink it from anywhere. Clearing site data loses only the
float (0.001 SOL). An additive devnet upgrade; the binary before it is
kept in `.keys/backups/`.

## 2026-10: The room crosses between 3D and flat, and a page waits in the middle

**Context:** Switching to the flat room read as the 3D room failing (its
own teardown lost the WebGL context), switching back dropped the flat room
before the canvas drew, and a full load showed nothing but a small paw in a
corner.
**Decision:** The flat room holds the frame until the first 3D frame, with
a "Building the room in 3D" pill; the canvas crossfades in over it and out
from over it. Every full load paints the splash first; a page waiting on
this browser centres the full-size loader. One thing becoming another is
seen happening (`--ease-swap`, 240ms) — a pick, a panel, a page, a theme.
**Consequence:** A full load holds the splash for 1.35s from the start of
the load (never longer than the load itself plus that). Motion stops under
reduced motion, as all of it does.

## 2026-10: Guilds live on Solana, without a database

**Context:** Guilds were a page of rules about a layer that did not exist,
and M5 planned a database registry (Q2) before any guild could. Pets were
already on Solana, read live; a guild is pets and their people.
**Decision:** Two program accounts in an additive upgrade: `Guild`
(`[guild, slug]`: name, motto, crest, founder, member count) and
`GuildMember` (`[member, pet]`: one guild per pet, and who paid its rent).
`found_guild`, `join_guild`, `leave_guild`; leaving closes the member
account to its payer. No token, no treasury, no vote weight; nothing in a
guild reaches a vital, XP or a score. The sponsor pays the rent (its
allow-list grows by exactly those slots), discovery and each guild's page
read the program live, and Pawket's delisting list stops promotion without
pretending to remove anything. Three starter guilds were founded on devnet
by `scripts/seed-guilds.mts`; guilds the tests found are named "Devnet
Check" and left out of discovery.
**Consequence:** Q2 is not needed for social guilds. Anyone with a pet on
Solana can found one — there is no review queue before founding, so
moderation is delisting after the fact, and a guild's name and motto are
strangers' text, cleaned like pet names. Events, votes and anything with a
token stay specs (M5 rest, M6), behind Q3, Q4 and Q6.

## 2026-10: A player keeps many pets, and Profile is their page

**Context:** A browser kept one pet, so a second adoption had to ask the
player to give up the first; customising the player lived in a card on
Home and the shelf was its own place.
**Decision:** The browser keeps a list (`pawket.pets.v1`; the one pet from
before moves in on first read) and one pet is at home, the player's pick
among all of theirs on Solana and here. Profile takes Inventory's dock slot:
the player's name, their whole look (with hats, glasses, pastels and three
outfits), every pet, the wardrobe for any pet, the sticker book and
settings. Stickers are read from each record, never stored.
**Consequence:** A name is refused if one of the player's browser pets has
it already. "Start over" is "Let {name} go", one pet at a time.
`/inventory` redirects to the profile.

## 2026-10: Home is a stage, and the room can take a picture

**Context:** Home split the screen between the room and every card, so the
vitals, the emotes and the look took as much room as the pet.
**Decision:** The room spans the width, and a deck floats over its foot —
the floor, never the animal — with the level as a ring, the vitals
minimized, the four cares and the tools; Say and Today open panels below.
Photo prints the 3D room on the room's own paper to save or share.
**Consequence:** The full numbers are a tap away rather than always shown.

## 2026-10: Four games, and a daily round everyone shares

**Context:** Each round was new, only the pet at home could play, and a
score went nowhere.
**Decision:** Each game card plays today's round — one seed per game per
UTC day (`dailySeed`), the same for every player — so a score can be shared
and compared with no server; practice is a new round. Any of the player's
pets can play, and the day's bonus goes to that pet. A fourth game, Pairs,
is pure and seeded like the others. Bests (all-time and today's) stay on
the device.
**Consequence:** A daily round can be studied before it is played; it is
a game among friends, not a ranked ladder, and nothing about it is kept
anywhere but the player's device. Q8 stays "no netcode".

## 2026-10: Eight rooms

**Context:** Daylight and Lamplight were the only themes.
**Decision:** Six more — Strawberry, Honey, Matcha, Seaside, Lavender,
Starlight — each a complete token block that also applies to any element
marked `data-theme-preview`, so a preview is the room itself. Every hue
keeps its job; `themes.test.ts` holds every room to the contrast floor.
**Consequence:** A new room is a token block and a line in
`src/config/themes.ts`, and it must pass the same test.

## 2026-10: The wardrobe is eighteen pieces, and five are earned

**Context:** Six free pieces were the whole wardrobe.
**Decision:** Twelve more, appended (catalog order is the on-chain slot;
`WEARABLE_COUNT` 18, deployed as an upgrade). Five are earned by a sticker —
the wardrobe offers them once the record has it.
**Consequence:** Earning is the wardrobe's rule, not the program's: a pet on
Solana could be dressed in an earned piece by a hand-built transaction.
Every piece is still only looks, so nothing is gained by it.

## 2026-10: A pet's keepsake is a frozen Metaplex Core card

**Context:** Q1 asked for an NFT standard because the vision wants pets
people collect and show. Pets are `Pet` PDAs, and the program is the
authority for everything about them; there is no market (Q5) and nothing
should invite one.
**Decision:** Metaplex Core, as a keepsake rather than the pet: one asset
per pet on Solana, in Pawket's collection, held by the pet's owner, with a
`pet` attribute pointing at the PDA. It is frozen for good
(`PermanentFreezeDelegate`, held by the collection), so it cannot be sold
or sent. The owner asks for it on the Passport; the server builds it, the
sponsor pays the rent, and the owner's wallet signs last. Its key derives
from the sponsor's and the pet's address, so there is one per pet and no
indexer is needed to find it. No program change: the Core program is
called from the transaction, not from Pawket's program.
**Consequence:** Q1 is decided for this version: Core, PDA stays the
authority, the asset is a soulbound pointer. The sponsor key is now also
the collection's update authority, so rotating it moves the collection
too. Copy says "card" or "keepsake", never NFT. A tradeable asset waits on
Q5.

## 2026-10: A pet can live on Solana, and Pawket pays the fees

**Context:** The product's position is a pet whose care history is a
record nobody can edit. The pet lived only in `localStorage`; the program
from before the reset was never deployed (its program ID held no account on
devnet) and its keypair was gone. A player on devnet also needs SOL before
they can sign anything, which stops most people at the door.
**Decision:** The program on Anchor 1.2, deployed to devnet as
`PawkHvXJKfsUfKs8mgLS7FXbLuNZ43fwEFGkzYdeM74` (a new ID, ground for the
prefix). Decay, cooldowns, XP, the UTC streak and the daily round bonus are
enforced on chain with the browser's integer math, held together by
`src/lib/game/lockstep.txt`; the Passport keeps the last eight cares.
`register_item` and `record_purchase` are deleted, not ported. `adopt_pet`
takes a separate rent payer, and a server sponsor signs first, as fee payer,
for Pawket instructions only (first, because wallets rewrite unsigned
transactions and the sponsor would refuse the rewrite). A pet still starts in the browser: "Keep it on
Solana" carries it into the program, and the record there starts that day.
One record shape serves both, through `useCompanion`. This resolves Q7 for
this version: a Wallet Standard wallet as identity, no embedded wallet, no
server session.
**Consequence:** The app holds one key — the sponsor's devnet float — so
custody language now distinguishes a player's keys (never) from the app's
own sponsor (server-only, Pawket instructions only, not the upgrade
authority). Carrying a pet resets its level and streak, said before the
wallet opens. Rate limits are per serverless instance. There is no NFT: Q1
stays open (later decided: the keepsake, above).

## 2026-10: The Park is a place

**Context:** "Meet others" had no surface, and pets on Solana are public by
construction.
**Decision:** `/park`, the fifth slot in the dock between Home and
Playground, lists every pet the program keeps, read live with
`getProgramAccounts`: who was cared for today, what just happened (merged
from every Passport's last cares), and everyone, most cared-for first.
`/pet/<address>` is each pet's public Passport, server-rendered from chain.
**Consequence:** No indexer and no database: the park reads the chain on
every request. That is fine at hackathon scale and is the first thing to
cache (or index, Q4) if the program holds thousands of pets.

## 2026-09: Home is a 3D room, and the flat room stays

**Context:** Home is where the player and the pet are together. The flat
room could not show them doing anything together. Two CC0 packs were
supplied: Kenney's Cube Pets and Quaternius' Universal Base Characters
(free edition — no animation, no clothes).
**Decision:** Home draws one React Three Fiber Canvas, loaded only by Home,
with the player and the pet in the design system's room: toon shading, ink
outlines, Daylight materials under a changing light. The asset pipeline
(`scripts/3d/`) is part of the repo: it recolours the pets to their PetArt
coats, cuts clothes from the body, fits hair across heads, authors the
clips, and validates every GLB. Moments are data (`src/lib/room/`), so an
emote is a clip and an entry. The player's look is saved on the device. The
flat SVG room is kept, complete, for no WebGL, a failed load, a lost
context, and a player who prefers it.
**Consequence:** three.js (~275 KB gzipped) and about 1 MB of GLB load
after the first paint, on Home only. A care plays its moment only after it
is saved. The player is now the one likeness in the product — outside the
3D room it is still the peg doll.

## 2026-09: The shipped game is one browser companion

**Context:** The screens for a market, guild swaps, treasuries and multiplayer
lobbies rendered fixtures and said so. That is not a product a player can
trust, and it is not buildable without a program deploy, a database, an
indexer and a legal review that are still open questions.
**Decision:** The MVP is one companion in `localStorage`. Care uses the locked
math. The wardrobe is a fixed free catalog with no effect on vitals. The
playground is one solo memory round; the first finish of a UTC day grants
`DAILY_GOAL_REWARD_XP` and does not touch stats. Guilds is the boundary copy,
not a directory. The market routes redirect to inventory. Chain adopt stays
in `src/lib/solana/` until a program deploy is real. This resolves Q7
(local guest, no embedded wallet) and Q8 (one solo game, no netcode) for
this version.
**Consequence:** A player who clears site data loses the pet. There is no
account, no sync, and no second pet. That is stated on the screen.

## 2026-09: Kit v8 over web3.js v1 / wallet-adapter

**Context:** The ecosystem moved. Official Solana docs mark `@solana/web3.js`
v1 and `@solana/wallet-adapter-*` legacy; the maintained path is
`@solana/kit` with plugins plus `@solana/react`.
**Decision:** Build on `@solana/kit` 8.x, `kit-plugin-rpc`,
`kit-plugin-wallet`, `@solana/react`, and `@solana-program/*` builders.
**Consequence:** Pre-reset web3.js `Transaction` builders were not ported;
adopt/care builders were rewritten as Kit instructions. Verified against the
official Next.js + Kit tutorial, not the bundled skill (which still
recommends the stale framework-kit stack).

## 2026-09: Single Next.js app, no monorepo

**Context:** Pre-reset history had Expo + Hono + Anchor + packages with Turbo.
The foundation needs none of those deployables.
**Decision:** One Next.js app. Reintroduce package boundaries only when a
second deployable or a generated program client forces it.

## 2026-09: No backend in the foundation

**Context:** The live pre-reset game ran on Hono + Postgres, with the Anchor
program unwired.
**Decision:** Defer persistence. The foundation proves wallet + transaction
paths; adoption/care product state comes later with an explicit
chain-first vs API-first choice per feature (see `docs/SOLANA.md` lifecycle).
No Prisma, no stubs pretending otherwise.

## 2026-09: Tailwind v4 for styling

**Context:** Needed utility styling consistent with the Next.js tutorial and
Vercel-native defaults.
**Decision:** Tailwind v4 via `@tailwindcss/postcss`. No component library
until product UI demands one.

## 2026-09: Vitest + Playwright, no Storybook/Cypress

**Context:** Need unit locks on math/bytes plus a real-browser shell check.
**Decision:** Vitest (colocated) + Playwright smoke. Wallet signing stays a
manual devnet check; E2E asserts shell, not signatures.
