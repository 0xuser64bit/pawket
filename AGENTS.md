# Pawket — agent operating system

Read this before changing code. The documentation index is `docs/README.md`.
Product context lives in `docs/PRODUCT.md`,
architecture in `docs/ARCHITECTURE.md`. This file is the contract for how an
agent works in this repo.

## Releases

`main` deploys `https://pawket.world`; `dev` deploys
`https://dev.pawket.world`. Develop on `dev` and target it with development
pull requests. A release is a pull request from `dev` to `main`, merged only
when the user authorizes it. See `docs/DEVELOPMENT.md` for the deployment
boundaries.

## Product context

Pawket is a web-first companion game and an Android shell around the same
hosted app. Local adoption and care need no wallet. Keeping a pet on Solana
creates a new confirmed program record; local progression is not imported.
Devnet is the default. `docs/PRODUCT.md` describes supported behavior and limits.

App transactions require a linked Pawket Wallet; while Pawket sponsors it may
be empty, and Market looks, coins and unsponsored fees need SOL in it. Its non-extractable
device key signs program-scoped non-money actions; the owner approves setup
and spending. `usePawketSend` and `send.ts` are the only app send path.
Sponsorship is conditional. Coins and Market purchases spend Pawket Wallet;
the sponsor pays only eligible fees and account rent. Nothing bought changes
vitals, XP, cooldowns or scores. Chain care animates after confirmation and reload.

`useCompanion` combines local and chain pets in one record shape and selects
one pet at home. Game math and the program replay the same `lockstep.txt`.
The 3D room only renders; flat art is the fallback. Public Passports, discovery
and counts read chain state. Guilds are independent of coin holdings. A
keepsake is a frozen card pointing to the pet, never a transferable pet asset.

## Read first

| If you are…               | Read                                                        |
| ------------------------- | ----------------------------------------------------------- |
| New to the repo           | this file → `docs/ARCHITECTURE.md` → `docs/VISION.md` → `docs/PRODUCT.md` |
| Planning any feature      | `docs/PRODUCT.md` → `docs/VISION.md` → `docs/OPEN-QUESTIONS.md` → `docs/MAINNET.md` |
| Implementing a task       | `docs/WORKFLOW.md` + the one doc for your layer             |
| Running the app           | `docs/DEVELOPMENT.md`                                       |
| Changing env/config       | `docs/ENVIRONMENT.md`                                       |
| Touching Solana / wallets | `docs/SOLANA.md`                                            |
| Touching game math        | `docs/GAME-DESIGN.md` (`src/lib/game/` is lockstep)         |
| Touching pets/keepsakes   | `docs/SOLANA.md` (Keepsakes) + `docs/DECISIONS.md` (asset model) |
| Touching the 3D room      | `docs/ROOM-3D.md` + `docs/DESIGN.md` (“The room in 3D”)     |
| Touching the Android app  | `docs/ANDROID.md` (including the release and device checks) |
| Touching marketplace      | `docs/MARKETPLACE.md`                                       |
| Touching guilds/launches  | `docs/GUILDS.md` + `docs/METEORA-INTEGRATION.md` + `docs/SAFETY-ECONOMY.md` |
| Touching routes/API       | `docs/ROUTES.md`                                            |
| Preparing mainnet (v1)    | `docs/MAINNET.md`                                           |
| Reviewing security, or an audit | `docs/SECURITY.md`                                    |
| Adding tests              | `docs/TESTING.md`                                           |
| Declaring work done       | `docs/WORKFLOW.md` (Definition of Done)                     |
| Questioning a decision    | `docs/DECISIONS.md` (accepted choices) + `docs/OPEN-QUESTIONS.md` (pending) |

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
| Derived keepsake and coin keys    | `src/server/derive.ts`              |
| Server-side chain reads           | `src/server/solana.ts`              |
| The pet a screen draws            | `src/lib/companion/use-companion.ts`|
| Env names and defaults            | `.env.example` + `src/config/env.ts`|
| Server-only env (guarded)         | `src/config/server-env.ts`          |
| Routes                            | `app/`                              |
| Design system (tokens, components)| `app/globals.css` + `src/components/pk/` |
| Guest companion record            | `src/lib/guest/`                    |
| Wearables (expression only)       | `src/lib/closet/catalog.ts` (slots 4–28 are the Market's) |
| Room things (decor, expression only) | `src/lib/room/decor.ts` (drawn in `room3d/decor.ts` and `home/decor-art.tsx`) |
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
| Pet coats (on this device)        | `src/lib/player/coats.ts`           |
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
| Route IA + Server/Client split    | `docs/ROUTES.md`                    |
| Meteora presets + launch stages   | `docs/METEORA-INTEGRATION.md`       |
| Open decisions                    | `docs/OPEN-QUESTIONS.md`            |

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
pnpm e2e:devnet       # Vitest against the deployed program: adoption, care, guilds, the Market and a linked browser
PAWKET_DEVNET=1 pnpm e2e --workers=1 e2e/chain.spec.ts e2e/coins.spec.ts   # the same paths, and a coin's trades, through the real screens
(cd android && ./gradlew testDebugUnitTest)   # the Android shell's own checks (JDK 17+, Android SDK)
PAWKET_ANDROID_KEYSTORE=… scripts/android-release.sh   # the signed release APK, and what to record (docs/ANDROID.md)
```

## Workflow (short version)

1. Read the matching doc and the closest existing module — copy that shape.
2. Change the smallest set of layers that own the fact.
3. Keep game math ↔ program constants ↔ tests in sync. Never "just update the UI."
4. Add or extend a test at the layer you changed (see `docs/TESTING.md`).
5. Run `pnpm verify`. Report changes, checks and remaining verification gaps.

## Hard rules

- **No custody.** Never ask for, log, upload, or persist a player's seed
  phrase or key. Wallets sign. The only keys the app holds are server-only:
  its devnet sponsor (`SPONSOR_KEYPAIR`), which signs only what
  `checkSponsorable` allows and the keepsakes `src/server/keepsake.ts`
  builds, paying their fee and rent and, unless `COLLECTION_AUTHORITY_KEYPAIR`
  is set, signing as the collection's authority;
  that collection authority when set, which signs only those keepsakes; and
  `DERIVATION_SECRET`, which only derives keepsake and coin addresses. None is
  the program's upgrade authority. The one key made for a player is a Pawket Wallet's
  device key (`src/lib/wallet/device.ts`): generated by WebCrypto as
  non-extractable, kept in that browser's IndexedDB, never read, exported
  or uploaded, linked only by the owner's own signature, and able to do only
  what `PawketWallet` lets a device do — never move the balance. Do not
  widen what a device may sign without a program change. The one thing it
  signs outside the program is sending its own leftover fee float home to
  its owner's Pawket Wallet (`getReturnFloatInstruction`, destination
  derived from the owner), from its own screen, when its link is gone.
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
  links, reminders, a haptic and colours — never a key, a transaction, a
  file path or a URL to load. Signing on a phone is the wallet app's, through
  Mobile Wallet Adapter and `send.ts`. A new request is a review like a new
  thing the sponsor signs: checked fields, a JVM test, no new permission
  without a reason in `docs/ANDROID.md`. The release key never enters the
  repository or the APK.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
