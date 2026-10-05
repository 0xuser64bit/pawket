# Pawket Android handoff

The work record for the Android build. The assignment is
`docs/ANDROID-BUILD-BRIEF.md`; this file is what has actually been done.
Read the brief, `AGENTS.md`, then this, before touching anything.

## Current objective and checkpoint

- Checkpoint identifier: `A1-first-gate`
- Overall state: in progress
- Current task: web side of the native bridge (`src/lib/native/`): photo
  share/save, link share, calendar reminder, haptics, back for sheets, the
  room's colours for the system bars; "in this app" copy where the web says
  "in this browser".
- Next concrete action: write `src/lib/native/android.ts` against the
  requests `android/app/src/main/java/app/pawket/android/PawketBridge.kt`
  accepts, then wire `photo.tsx`, `share-button.tsx`, `playground-screen.tsx`
  (share), `remind-me.tsx`, `sheet.tsx` (back), haptics in `home-screen.tsx`
  and `use-send.ts`.
- Immediate caution for the next agent: the work lives in the sibling
  worktree `/Users/user64bit/Code/pawket-android` (branch `android`), not
  in `/Users/user64bit/Code/pawket` (branch `main`, other work continues
  there). Its `.env` is a symlink to `../pawket/.env` (gitignored; holds
  the devnet sponsor key — never print or copy its contents).

## Source and working environment

- Repository: `pawket` (private, GitHub `origin`). Baseline: `main` at
  `43881c6` ("feat(rpc): browsers can read and send through the server's
  provider…"). Branch `android` was cut from it as a worktree.
- Task commits so far (branch `android`): the brief and handoff; MWA
  registration (`7282080`); the generated webshell (`d16ffd1`); Pawket's
  branding (`86edb95`); the shell's behaviour and bridge (`cd5691d`).
- Task-owned files: `docs/ANDROID-HANDOFF.md`, `docs/ANDROID-BUILD-BRIEF.md`
  (copied from the owner's untracked file in the main checkout; identical
  bytes — leave the untracked original alone), `android/`, the MWA lines in
  `src/lib/solana/browser-client.ts`, `transactions.ts`, `wallet-sheet.tsx`,
  `package.json`/`pnpm-lock.yaml`.
- Release key (not in the repo): `/Users/user64bit/Code/pawket/.keys/android/pawket-release.jks`
  (PKCS12, alias `pawket`, RSA 4096, 10,000 days, cert SHA-256
  `A2:EF:F8:EE:78:3B:3E:F2:00:96:D5:EC:C6:1D:EF:F8:5A:13:37:56:8F:59:68:4A:03:67:DE:F0:72:B2:61:21`).
  Its password is only in this Mac's login Keychain, service
  `pawket-android-release-keystore`. The owner must back up both (see
  Artifacts); losing either means the app can never be updated.
- Emulator: AVD `pawket36` (Pixel 7 profile, `android-36.1` Google APIs
  arm64, System WebView 134.0.6998.135 — too old for WebCrypto Ed25519).
  Official MWA test wallet installed from the CLI's catalog
  (`fakewallet-v1-release.apk`, SHA-256 `550055…46e9`, matches).
- Local server for device tests: `pnpm build && pnpm start -p 3000` in the
  worktree, `adb reverse tcp:3000 tcp:3000`, debug APK built with
  `-PSOLANA_MOBILE_URL=http://localhost:3000/home`. DevTools over
  `adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>`.
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
| Architecture choice + Android source in repo | implemented; verified on emulator | `android/` | debug APK loads Pawket, 3D room draws | release APK |
| MWA registration in the web client | implemented; verified on emulator | `src/lib/solana/browser-client.ts` (`registerPhoneWallets`) | connect, decline, authorize with fakewallet in the debug APK | a real wallet app (Phantom/Solflare/Seed Vault) on hardware |
| First gate: sponsored send signed through MWA in the APK | verified on emulator (mock wallet) | `send.ts` unchanged | adopt `5fhwzMUH…wsDYZ` and care `4YwcFakT…4AjQF` on devnet: sponsor fee payer + owner signature, preflight, confirmed, record reloaded, toast with Explorer link | repeat with a real wallet on hardware |
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
| WebView capability probe | CDP `Runtime.evaluate` in the debug app | emulator API 36.1, WebView 134 | UA has `wv` and `Solana Mobile Web Shell`; secure context; bridge injected; MWA registered; WebGL2 yes; `navigator.share` absent; Ed25519 `generateKey` NotSupportedError | scratchpad `cdp.mjs` |
| MWA connect: decline | tap the phone wallet, DECLINE in fakewallet | emulator, fakewallet | Pawket: "You declined in your wallet. Nothing changed." The wallet stays on "Session active" until the player backs out (MWA 0.6.0 closes its session only on success) | screenshots |
| MWA connect: authorize | AUTHORIZE in fakewallet | emulator, fakewallet | returns to Pawket on its own; chip `Gde5…VqmB`; `pawket.wallet` and MWA cache persisted | — |
| Sponsored adopt via MWA | adopt Pixel in /adopt, Keep on Solana, approve | emulator, fakewallet, local server on devnet | finalized `5fhwzMUHngriJALGHCGdsBN5xmHCkCaGCqVfRvgbiGtE9pkTX9gmzNxtws3KbDV4q8ZS8ckGjjpTZ6pYj1ZwsDYZ`: 2 signers, fee payer = sponsor `HoayYx…LPuS`, `AdoptPet`; Home shows On Solana, the browser copy removed | devnet RPC `getTransaction` |
| Confirmed care via MWA | Feed, approve | same | toast: approve → sent, waiting → "Recorded on Solana, Pawket paid the fee" + Explorer link; moment and sticker after confirmation only | `4YwcFakTK3uva5FzzwxfSQmdyZx4mtis1662p1TQXkdZvsRwnDS2NUjcpNyVMMDodcK2gm5vahAgEwu17Wq4AjQF` |
| Keyboard avoidance | type a name on /adopt | emulator | page resizes, field stays above the keyboard; back closes the keyboard first | screenshot |

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
