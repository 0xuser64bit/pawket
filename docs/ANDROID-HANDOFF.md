# Pawket Android handoff

The work record for the Android build. The assignment is
`docs/ANDROID-BUILD-BRIEF.md`; this file is what has actually been done.
Read the brief, `AGENTS.md`, then this, before touching anything.

## Current objective and checkpoint

- Checkpoint identifier: `A0-audit`
- Overall state: in progress
- Current task: initial audit done; no product code changed yet.
- Next concrete action: commit this handoff and the brief on branch
  `android`, then register Mobile Wallet Adapter in the web app
  (`src/lib/solana/browser-client.ts`) and generate `android/` from the
  webshell template.
- Immediate caution for the next agent: the work lives in the sibling
  worktree `/Users/user64bit/Code/pawket-android` (branch `android`), not
  in `/Users/user64bit/Code/pawket` (branch `main`, other work continues
  there). Its `.env` is a symlink to `../pawket/.env` (gitignored; holds
  the devnet sponsor key — never print or copy its contents).

## Source and working environment

- Repository: `pawket` (private, GitHub `origin`). Baseline: `main` at
  `43881c6` ("feat(rpc): browsers can read and send through the server's
  provider…"). Branch `android` was cut from it as a worktree.
- Latest task commit: none yet.
- Task-owned files: `docs/ANDROID-HANDOFF.md`, `docs/ANDROID-BUILD-BRIEF.md`
  (copied from the owner's untracked file in the main checkout; identical
  bytes — leave the untracked original alone).
- Unrelated changes to preserve: none in the main checkout at baseline
  (clean but for the untracked brief). Branch `room-3d` exists; untouched.
- Toolchain (this machine, Apple M4, macOS): Node + pnpm 10 (repo pins
  `pnpm@10.0.0`); JDK 21 (`brew install openjdk@21`, keg-only:
  `JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home`);
  Android command-line tools (`brew install --cask android-commandlinetools`);
  SDK at `~/Library/Android/sdk` with platform-tools, emulator,
  `platforms;android-37.0`, `build-tools;37.0.0`,
  `system-images;android-36.1;google_apis;arm64-v8a`.
- Release origin (proposed, not yet serving the Android changes):
  `https://pawket-pets.vercel.app` (Vercel production, deployed from `main`).

## Requirements and progress

| Requirement | State | Source/artifact | Verification evidence | Remaining work |
| --- | --- | --- | --- | --- |
| Audit current product + official requirements | in progress | this file | code read, terms PDF read | finish capability map as features land |
| Architecture choice + Android source in repo | not started | `android/` (planned) | — | generate from webshell template |
| MWA registration in the web client | not started | `src/lib/solana/browser-client.ts` | — | — |
| First gate: sponsored send signed through MWA in the APK | not started | — | — | emulator + mock MWA wallet, then a real wallet |
| Every signing flow on Android (matrix below) | not started | — | — | — |
| Photo share/save natively | not started | — | — | — |
| Haptics | not started | — | — | — |
| Back, lifecycle, return-to-play | not started | — | — | — |
| Phone layout, insets, keyboard | not started | — | — | — |
| Storage / device-key continuity story | not started | — | — | — |
| 3D, games, a11y on Android | not started | — | — | — |
| Network failure behaviour | not started | — | — | — |
| Release-signed APK + checksum + reproducible build | not started | — | — | — |
| Submission package (demo script, pitch, screenshots, store prep) | not started | — | — | — |

### Capability map (from the code at `43881c6`)

- Already implemented (web): guest pets in `localStorage` (`pawket.pets.v1`,
  `src/lib/guest/`), care/decay/XP/streak, 3D room with flat fallback and
  context-loss handling (`src/components/home/room.tsx`, `room3d/`), photos
  (`src/components/home/photo.tsx`), profile/look/outfits, four games and
  the daily round, keep-on-Solana, Passport, Park, Pulse, guilds +
  gatherings + polls, guestbook waves, keepsake cards, Pawket Wallet
  (device key in IndexedDB, `src/lib/wallet/device.ts`), Market, guild
  coins on Meteora, calendar reminders (`.ics`, `remind-me.tsx`).
- Missing for Android: MWA registration (none in the code); an Android
  project (none — the old Expo shell was removed, see `ARCHITECTURE.md`).
- Implemented but broken or unverified inside an Android WebView:
  `navigator.share` (photo, Passport link, playground), `<a download>` of a
  data/blob URL (photo save, `.ics` reminder), clipboard writes, WebCrypto
  Ed25519 for the device key, `visibilitychange` pausing of the 3D room,
  WebGL in the WebView, Web Audio after a tap.
- Depends on external configuration: the production deployment carrying the
  web changes (owner-authorised pushes to `main`), the sponsor float on
  devnet, `SOLANA_RPC_URL` on Vercel, a release keystore kept by the owner.

### Transaction capability matrix (call sites at `43881c6`)

Every send goes through `usePawketSend` (`src/lib/solana/use-send.ts`) →
`sendPawket` / `sendPrepared` (`src/lib/solana/send.ts`) → `walletSigns`,
which uses the signer's `modifyAndSignTransactions` (Wallet Standard
`solana:signTransaction`; MWA `sign_transactions`) and then checks the
message bytes are unchanged.

| Flow | Call | Owner signer | Fee payer | Rent | Built |
| --- | --- | --- | --- | --- | --- |
| Keep on Solana (adopt) | `act` (`keep-sheet.tsx`) | wallet or linked device | sponsor, else owner/device float | sponsor or owner | client |
| Care ×4 | `act` (`home-screen.tsx`) | wallet or device | sponsor, else owner/device | — | client |
| Finish a round | `act` (`playground-screen.tsx`) | wallet or device | sponsor | — | client |
| Dress / dress owned | `act` (`wardrobe.tsx`) | wallet or device | sponsor | — | client |
| Found / join / leave guild | `act` | wallet or device | sponsor | sponsor | client |
| Event, RSVP, check-in, poll, vote | `act` (`gatherings.tsx`) | wallet or device | sponsor | sponsor | client |
| Wave | `act` (`guestbook.tsx`) | visitor wallet or device | sponsor | sponsor | client |
| Keepsake card | `sendFromServer` (sponsored) | wallet | sponsor (pre-signed with the card key) | sponsor | server |
| Market buy | `send` | wallet only | sponsor fee; price from owner | sponsor (closet) | client |
| Link this browser | `send` (`link.ts`) | wallet + device co-signs | sponsor | sponsor | client |
| Deposit / withdraw / unlink other / close | `send` | wallet only | sponsor | — | client |
| Unlink this browser | `asDevice` | device | sponsor or device | — | client |
| Coin launch / trade / graduate / claim | `sendFromServer` (`sponsored: false`) | wallet | owner | owner | server (Meteora SDK) |

## Decisions and constraints

- Shell: the official Solana Mobile webshell (`solana-mobile` CLI 0.5.0,
  template `templates/webshell-android`) around the hosted app. Evidence:
  the shell launches `solana-wallet:` intents natively and marks its user
  agent `Solana Mobile Web Shell`, which `@solana-mobile/wallet-standard-mobile`
  ≥ 0.5.1 reads to register local association inside a WebView and skip
  Chrome's Local Network Access prompt (`getIsSupported.ts`, `initialize.ts`
  in the MWA repo). Rejected: TWA/Bubblewrap (Chrome's LNA gate and Digital
  Asset Links, no gain), React Native (would re-implement the 3D room, the
  games and every screen), Capacitor (no MWA advantage over the official
  shell).
- MWA package: `@solana-mobile/wallet-standard-mobile@0.6.0` (latest
  stable; webshell support since 0.5.1). Its signer path is
  `sign_transactions`, returning whole payloads, so `send.ts` keeps its
  message-integrity checks and the sponsor-signs-first order unchanged.
- Native features go through one narrow bridge
  (`WebViewCompat.addWebMessageListener`, origin-restricted), not
  `addJavascriptInterface`, and never carry keys or transactions.

## Verification record

| Check | Command or procedure | Environment/device/wallet | Result | Evidence or failure |
| --- | --- | --- | --- | --- |
| — | — | — | — | nothing run yet |

## Unfinished implementation and blockers

- None yet.

## Artifacts and release preparation

- None yet.

## Continuation procedure

1. `cd /Users/user64bit/Code/pawket-android && git status && git log --oneline -5`
   — confirm branch `android` and the commits listed above.
2. Read "Next concrete action" at the top and continue there.
3. If the worktree is missing: `git -C /Users/user64bit/Code/pawket worktree add ../pawket-android android`,
   then `ln -s ../pawket/.env .env` and `pnpm install --frozen-lockfile`.
