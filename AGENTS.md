# Pawket — agent operating system

Read this before changing code. Product context lives in `docs/PRODUCT.md`,
architecture in `docs/ARCHITECTURE.md`. This file is the contract for how an
agent works in this repo.

## What this is

Pawket is a **web-first** living companion on Solana. A player adopts a pet
in the browser with no wallet, cares for it (feed / play / groom / rest),
and — when they choose — keeps it on Solana, where every care is a signed
record anyone can check. Devnet by default; Pawket pays the fees.

**Current truth:** a pet starts in this browser. `/adopt` writes it through
`src/lib/guest/` and `src/lib/game/`. Home runs care (feed, play, groom,
rest) with decay, cooldowns, XP, a UTC streak and a care log, in a room
drawn in 3D — the player and the pet in one scene (`src/components/room3d/`,
`docs/ROOM-3D.md`), with the flat SVG room wherever 3D cannot draw.

"Keep Pepper on Solana" (the labelled button beside Home's room switch, or the
last step of adoption) carries that pet into the program in
`programs/pawket/` (devnet `PawkHvXJKfsUfKs8mgLS7FXbLuNZ43fwEFGkzYdeM74`): a
`Pet` PDA holds vitals, XP, cooldowns and what it wears; its `PetPassport`
holds the streak, counts and the last eight cares. Decay, cooldowns, XP,
the streak and the daily round bonus are enforced on chain by the same
integer math as `src/lib/game/` (`src/lib/game/lockstep.txt` is replayed by
both). The sponsor (`/api/sponsor`) signs first, as fee payer and rent payer,
and signs nothing but Pawket instructions; the wallet signs second, as
owner. A care
on Solana plays its moment only after it is confirmed; nothing is optimistic.

`useCompanion` (`src/lib/companion/`) decides what a screen draws: a player
keeps as many pets as they adopt — the connected wallet's on Solana and the
browser's (`pawket.pets.v1`) — and one is at home (their pick, remembered on
the device). One record shape for all of them. Home is the room across the
whole width with a deck beneath it (care, Say, Today, Photo, Look). Profile
(the dock slot Inventory had) is the player: their name, their 3D look with
hats, glasses and saved outfits, and what they keep — pets, the wardrobe
(18 free pieces, five earned by stickers, and the Market's four; on Solana a
signed `dress` or `dress_owned`), stickers read from each record
(`src/lib/game/badges.ts`), and settings, including ten rooms
(`src/config/themes.ts`, two of them the Market's). The playground is four solo games
(Catch, Hop, Copy, Pairs) with a daily round everyone shares; on Solana a
finished round is kept when the player presses "Record the round".
`/pet/<address>` is the public Passport, server-rendered from chain, with its
guestbook: anyone but the owner waves (`wave`), once a UTC day, from the page
or the pet's Blink. `/park` is every pet the program keeps, read live, and
`/pulse` counts everything the program holds — pets, guilds, coins, Market
sales — read live, nothing added by hand. Guilds are on chain: a pet founds
or joins one (`found_guild`, `join_guild`, `leave_guild`; one guild per pet,
rent paid by the sponsor and returned on leave), discovery and each guild's
page are read live, and `src/lib/guilds/boundary.ts` is the rule every guild
lives inside: nothing in it touches a pet. Its founder plans events its pets
RSVP to and check in at, and asks polls each wallet with a pet in it answers
once (`create_event`, `rsvp`, `check_in`, `create_poll`, `vote`; the sponsor
pays the rent). A guild of three pets may launch one
optional coin on Meteora (`src/lib/coins/`, `src/server/coins/`): a Dynamic
Bonding Curve on one of Pawket's presets that graduates into a DAMM v2 pool
with its liquidity locked for good. The server builds every coin transaction
with Meteora's SDKs, the player signs and pays (the sponsor never does), a
coin is traded only on its own page, and holding one only pins the guild's
crest on its pets there.
A player can keep a Pawket Wallet (`/wallet`): a `PawketWallet` PDA whose
balance only its owner fills or empties (withdrawals go only back to the
owner), and one linked device — a non-extractable WebCrypto key made and kept
in this browser (`src/lib/wallet/device.ts`) — that signs with no prompt
whatever the owner signs for their pets except money: care, rounds, clothes,
adoption, guilds, gatherings and waves (each a `*_by_device` twin;
`DEVICE_VARIANTS` in `program.ts` is the list), until the end date and
inside the daily limit the owner set. `usePawketSend().act` is the one way
those are sent. The sponsor pays a device's fee and rent as it does the
owner's; with no sponsor the device pays its own fee from a float the
balance refills by at most that fee per action. Its history is read from
Solana (`src/lib/wallet/history.ts`).
The Market (`/market`) sells looks for SOL at prices fixed in the program
(`item_price`): four pieces for pets and two rooms. `buy` sends the price
from the owner straight to Pawket's treasury and records the item in the
owner's `Closet` on Solana for good; the sponsor pays only the fee and the
closet's rent. A bought piece goes on with `dress_owned` (the program checks
the closet). Nothing sold changes a vital, XP, a cooldown or a score, and
there is no resale or secondary market. A pet on Solana can have a keepsake: a card in its owner's wallet, a
Metaplex Core asset in Pawket's collection, frozen for good, that points at
the pet (`src/lib/solana/core.ts`, `src/server/keepsake.ts`). The pet stays
the program's account; the card cannot be sold or sent. Do not put a
simulated price, treasury, member count or lobby on a screen, and call a pet
"on Solana" only when it was read from chain.

Pawket is also an Android app (`android/`, `docs/ANDROID.md`): the official
Solana Mobile webshell around the hosted app, so the pages, rules and sends
are these ones. The wallet apps on the phone (Seed Vault, Phantom…) sign
through Mobile Wallet Adapter, registered in `browser-client.ts` on Android
only; `send.ts` is unchanged. The phone's share sheet, gallery, calendar,
haptics, back gesture and bars are reached through one origin-locked bridge
(`PawketBridge.kt` ↔ `src/lib/native/android.ts`) that never carries a key
or a transaction. Inside the app a pet is kept "in this app" (`useHere()`).

## Read first

| If you are…               | Read                                                        |
| ------------------------- | ----------------------------------------------------------- |
| New to the repo           | this file → `docs/ARCHITECTURE.md` → `docs/VISION.md` → `docs/PRODUCT.md` |
| Planning any feature      | `docs/ROADMAP.md` → `docs/EPICS.md` → `docs/TASKS.md` → `docs/OPEN-QUESTIONS.md` |
| Implementing a task       | `docs/AGENT-GUIDE.md` + the one spec for your layer         |
| Running the app           | `docs/DEVELOPMENT.md`                                       |
| Changing env/config       | `docs/ENVIRONMENT.md`                                       |
| Touching Solana / wallets | `docs/SOLANA.md`                                            |
| Touching game math        | `docs/GAME-DESIGN.md` (`src/lib/game/` is lockstep)         |
| Touching pets/NFTs        | `docs/NFT-CUSTOMIZATION.md` + `docs/DOMAIN-MODEL.md`        |
| Touching the 3D room      | `docs/ROOM-3D.md` + `docs/DESIGN.md` (“The room in 3D”)     |
| Touching the Android app  | `docs/ANDROID.md` (+ `docs/ANDROID-HANDOFF.md` while it is in progress) |
| Touching marketplace      | `docs/MARKETPLACE.md` + `docs/API-CONTRACTS.md`             |
| Touching guilds/launches  | `docs/GUILDS.md` + `docs/METEORA-INTEGRATION.md` + `docs/SAFETY-ECONOMY.md` |
| Touching indexer/API      | `docs/INDEXER.md` + `docs/API-CONTRACTS.md` + `docs/ROUTES.md` |
| Preparing mainnet (v1)    | `docs/MAINNET.md`                                           |
| Reviewing security, or an audit | `docs/SECURITY.md`                                    |
| Adding tests              | `docs/TESTING.md`                                           |
| Declaring work done       | `docs/WORKFLOW.md` (Definition of Done)                     |
| Questioning a decision    | `docs/DECISIONS.md` (history) + `docs/OPEN-QUESTIONS.md` (pending) |

## Sources of truth

One home per fact. If two files disagree, the left column wins.

| Fact                              | Authoritative file                  |
| --------------------------------- | ----------------------------------- |
| Game math, enums                  | `src/lib/game/`                     |
| The program (rules on chain)      | `programs/pawket/src/lib.rs`        |
| Game math ↔ program lockstep      | `src/lib/game/lockstep.txt`         |
| Program ID, seeds, discriminators | `src/lib/solana/program.ts` (held to `src/lib/solana/idl/pawket.json`) |
| PDA derivation                    | `src/lib/solana/pda.ts`             |
| Instruction builders              | `src/lib/solana/instructions.ts`    |
| Account decoding, chain → record  | `src/lib/solana/accounts.ts`        |
| Cluster / RPC / Explorer links    | `src/lib/solana/cluster.ts`         |
| Browser rpc + wallet client       | `src/lib/solana/browser-client.ts`  |
| The one send path                 | `src/lib/solana/send.ts`            |
| Transaction lifecycle + UX copy   | `src/lib/solana/transactions.ts`    |
| What the sponsor will sign        | `src/lib/solana/sponsor.ts`         |
| Sponsor key, float, availability  | `src/server/sponsor.ts`             |
| Keepsake instructions, collection | `src/lib/solana/core.ts` (Metaplex Core) |
| Keepsake key, metadata, creation  | `src/server/keepsake.ts`            |
| Server-side chain reads           | `src/server/solana.ts`              |
| The pet a screen draws            | `src/lib/companion/use-companion.ts`|
| Env names and defaults            | `.env.example` + `src/config/env.ts`|
| Server-only env (guarded)         | `src/config/server-env.ts`          |
| Routes                            | `app/`                              |
| Design system (tokens, components)| `app/globals.css` + `src/components/pk/` |
| Guest companion record            | `src/lib/guest/`                    |
| Wearables (expression only)       | `src/lib/closet/catalog.ts` (the last four are the Market's) |
| The Market: items, prices, treasury | `programs/pawket/src/lib.rs` (`item_price`) ↔ `MARKET` in `src/lib/solana/program.ts` |
| What a wallet bought              | its `Closet` on chain, read with `useCloset` (`src/lib/market/use-closet.ts`) |
| Pawket's counts                   | `src/server/pulse.ts` (read from chain, never stored) |
| Playground games (pure, seeded)   | `src/lib/play/`                     |
| Guild boundary copy               | `src/lib/guilds/boundary.ts`        |
| Guild coin presets, terms, configs| `src/lib/coins/presets.ts` (held to Meteora's validation by `src/server/coins/curve.test.ts`) |
| A coin's stage                    | `src/lib/coins/stage.ts` (decided on the server, never in a client) |
| What Pawket says about a coin     | `src/lib/coins/copy.ts` (banned phrases tested) |
| Meteora reads, quotes, transactions | `src/server/coins/meteora.ts` (the only module on Meteora's SDKs) |
| Guild rules (slug, crest, limits) | `src/lib/guilds/guild.ts` (held to `GUILD_LIMITS` in `program.ts`) |
| Delisted guilds (product surface) | `src/lib/guilds/delisted.ts`        |
| Stickers (read from a record)     | `src/lib/game/badges.ts`            |
| Rooms (themes)                    | `src/config/themes.ts` + the token blocks in `app/globals.css` |
| Player name and outfits           | `src/lib/player/profile.ts`         |
| Player hats and glasses in 3D     | `src/components/room3d/accessories.ts` |
| Player look (3D room)             | `src/lib/player/look.ts`            |
| This device's key (Pawket Wallet) | `src/lib/wallet/device.ts`          |
| A Pawket Wallet as screens see it | `src/lib/wallet/pawket-wallet.ts`   |
| A Pawket Wallet's history         | `src/lib/wallet/history.ts` (read from chain) |
| Moments and emotes                | `src/lib/room/moments.ts`           |
| 3D assets (built, never hand-edited) | `scripts/3d/` → `public/3d/`     |
| The Android app (shell, origin, version) | `android/` (`android/gradle.properties` holds the URL, id and version) |
| What the page may ask of the phone | `android/app/src/main/java/app/pawket/android/PawketBridge.kt` ↔ `src/lib/native/android.ts` |
| Links that open in the app        | `public/.well-known/assetlinks.json` (held to the build by `assetlinks.test.ts`) |
| Target architecture (M3–M6)       | `docs/ARCHITECTURE-TARGET.md`       |
| Domain types, state machines      | `docs/DOMAIN-MODEL.md`              |
| Route IA + Server/Client split    | `docs/ROUTES.md`                    |
| API envelopes + error codes       | `docs/API-CONTRACTS.md`             |
| Meteora presets + launch stages   | `docs/METEORA-INTEGRATION.md`       |
| Eligibility (cosmetic/social)     | `docs/GUILDS.md` + `docs/INDEXER.md`|
| Task sequence + blockers          | `docs/TASKS.md` + `docs/OPEN-QUESTIONS.md` |

Do not introduce a second store of any of these.

## Commands

```sh
cp .env.example .env.local
pnpm install
pnpm dev              # http://localhost:3000
pnpm verify           # typecheck + lint + test + build (run before Done)
pnpm test             # Vitest
pnpm e2e              # Playwright (needs no wallet; asserts shell, not signing)
pnpm assets:3d        # rebuild public/3d from the source files in assets/
pnpm program:test     # anchor build (SBF v2) + the LiteSVM suite, incl. the lockstep replay
pnpm e2e:devnet       # Vitest against the deployed program: a 0-SOL wallet adopts and cares
PAWKET_DEVNET=1 pnpm e2e --workers=1 e2e/chain.spec.ts e2e/coins.spec.ts   # the same paths, and a coin's trades, through the real screens
(cd android && ./gradlew testDebugUnitTest)   # the Android shell's own checks (JDK 17+, Android SDK)
PAWKET_ANDROID_KEYSTORE=… scripts/android-release.sh   # the signed release APK, and what to record (docs/ANDROID.md)
```

## Workflow (short version)

1. Read the matching doc and the closest existing module — copy that shape.
2. Change the smallest set of layers that own the fact.
3. Keep game math ↔ program constants ↔ tests in sync. Never "just update the UI."
4. Add or extend a test at the layer you changed (see `docs/TESTING.md`).
5. Run `pnpm verify`. Report what you ran, what changed, and what is stubbed.

## Hard rules

- **No custody.** Never ask for, log, upload, or persist a player's seed
  phrase or key. Wallets sign. The only key the app holds is its own devnet
  sponsor (`SPONSOR_KEYPAIR`, server-only), which signs only what
  `checkSponsorable` allows, and the keepsakes `src/server/keepsake.ts`
  builds (it is the collection's authority). It is not the program's
  upgrade authority. The one key made for a player is a Pawket Wallet's
  device key (`src/lib/wallet/device.ts`): generated by WebCrypto as
  non-extractable, kept in that browser's IndexedDB, never read, exported
  or uploaded, linked only by the owner's own signature, and able to do only
  what `PawketWallet` lets a device do — never move the balance. Do not
  widen what a device may sign without a program change.
- **No hand-rolled instruction bytes in components.** Use
  `src/lib/solana/instructions.ts`. Never invent discriminators;
  `program.test.ts` holds them to the IDL.
- **No silent sends.** Every send needs explicit user action, simulation
  first (preflight on, here or at the sponsor), and a visible signature +
  Explorer link after (the send's toast, `src/components/wallet/tx-toast.tsx`,
  pushed by `usePawketSend`). Go through `send.ts`; never a second path.
- **No optimistic adopt/care state.** Wait for confirmation, then reload from
  the source of truth.
- **No `NEXT_PUBLIC_` secrets.** Server-only config has no such prefix and is
  read only via `getServerEnv()` in server code.
- **No program ID / seed / discriminator changes** without an explicit human
  ask and a program deploy plan. A change to the program's math moves
  `src/lib/game/`, `lockstep.txt` and both test suites together.
- **Server Components by default.** `"use client"` only at interactive
  leaves. Never fetch in `useEffect` what a Server Component or `useRequest`
  can own.
- **Honest UI.** "On Solana" only for a pet read from chain; a browser pet
  is "in this browser". No "owned"/NFT/mainnet language: a keepsake is a
  "card", shown only once it is read from chain. "Pawket pays the fee" only
  while `sponsorState()` says it does.
- **Devnet default.** Never target mainnet in code; cluster comes from env.
- **Meteora stays behind one door.** Meteora's SDKs, web3.js v1 and Anchor's
  client are imported only in `src/server/coins/` and `scripts/` (a lint
  rule refuses them anywhere else); every other Solana call is Kit. A coin
  is described, never sold: no surface promises it value, and its page
  carries what can go wrong (`src/lib/coins/copy.ts`).
- **The Android bridge stays narrow.** `PawketBridge.kt` is injected into
  Pawket's origin only, answers the main frame only, and takes pictures,
  links, a reminder, a haptic and colours — never a key, a transaction, a
  file path or a URL to load. Signing on a phone is the wallet app's, through
  Mobile Wallet Adapter and `send.ts`. A new request is a review like a new
  thing the sponsor signs: checked fields, a JVM test, no new permission
  without a reason in `docs/ANDROID.md`. The release key never enters the
  repository or the APK.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
