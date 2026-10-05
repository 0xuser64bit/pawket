# Pawket Android handoff

The work record for the Android build. The assignment is
`docs/ANDROID-BUILD-BRIEF.md`; how the app works is `docs/ANDROID.md`; this
file is what has actually been done and checked. Read the brief, `AGENTS.md`,
`docs/ANDROID.md`, then this, before touching anything.

## Current objective and checkpoint

- Checkpoint identifier: `A3-release-audit`
- Overall state: in progress
- Current task: finish the release audit, transaction interruption handling,
  native failure handling, and the submission package; then run the release gates.
- Next concrete action: finish emulator export/coin checks and the submission
  package; rebuild the release, deploy the gated web changes, and install it.
- Reproducible dependency setup: settings moved to `pnpm-workspace.yaml`
  and pnpm pinned to 10.34.6 (10.0.0 cannot read these workspace settings).
  `corepack pnpm install --frozen-lockfile` passed without changing any
  dependency or the lockfile. Fresh `pnpm program:test`: 57 passed; IDL unchanged.
- Native failure audit: photo insertion/publication/cleanup failures return
  a failure instead of crashing; shares use unique temporary files; binary
  bridge messages are ignored; external intent URLs become fresh, restricted
  VIEW intents; refused external activities and disconnected bridge calls are
  harmless. Android JVM tests and debug build passed; 7 bridge tests and
  typecheck passed. Photo export and wallet intents still need runtime recheck.
- Popup renderer recovery: both the main view and temporary link catcher
  handle renderer loss. Fresh Android lint + 6 JVM tests green. `.kotlin/`
  compiler caches ignored.
- Slow approval audit: expired preflight errors now map by Kit code, even
  when production strips developer text. Unknown preflight errors get a
  readable refusal. Regression first failed, then 22 send/confirmation
  tests, typecheck and lint passed.
- Shared send interruption fixed: `send.ts` looks up a known signature when
  the broadcast reply is lost; `transactions.ts` tolerates failed status
  replies until the bounded deadline. The unknown toast advises checking the
  receipt before retry. Regression checks: 21 passed across `send.test.ts`
  and `transactions.test.ts`; typecheck passed.
- Reconciled Claude's final session: `program:test` completed successfully
  after checkpoint A2 (57 tests; original scratchpad log ends `exit=0`).
  Market/owner-paid/prepared keepsake receipts recovered and re-read from
  devnet (`meta.err = null`): see the verification table. Coin still needs
  an Android trade.
- Immediate caution for the next agent: the work lives in the sibling
  worktree `/Users/user64bit/Code/pawket-android` (branch `android`), not
  in `/Users/user64bit/Code/pawket` (branch `main`). Its `.env` is a symlink
  to `../pawket/.env` (gitignored; holds the devnet sponsor key — never print
  or copy its contents). Pushing `main` deploys production; the owner allows
  it only with `pnpm verify` and the program tests green.

## Source and working environment

- Repository `pawket` (private, GitHub `origin`). Baseline `main` at
  `43881c6`; `origin/main` had not moved at the last check. Branch `android`
  (worktree above) holds every task commit; `git log --oneline 43881c6..android`
  lists the task commits.
- Task-owned files: `android/`, `src/lib/native/`, `e2e/android.spec.ts`,
  `public/.well-known/assetlinks.json`, `scripts/android-release.sh`,
  `docs/ANDROID*.md`, and the Android lines in `browser-client.ts`,
  `transactions.ts`, `use-send.ts`, `wallet-sheet.tsx`, `sheet.tsx`,
  `photo.tsx`, `remind-me.tsx`, `share-button.tsx`, `playground-screen.tsx`,
  `home-screen.tsx`, `settings.tsx`, `providers.tsx`, the "this app" copy
  (16 components), `ics.ts`, `package.json`/`pnpm-lock.yaml`, and short
  additions to `AGENTS.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `TESTING.md`,
  `DEVELOPMENT.md`, `PRODUCT.md`.
- Unrelated work to preserve: the owner's untracked `docs/ANDROID-BUILD-BRIEF.md`
  in the main checkout (identical to the committed copy — before the
  fast-forward, compare and remove the untracked copy only if identical,
  or git refuses to overwrite it). Branch `room-3d`: untouched. A
  `next-server` on port 3100 started from the main checkout belongs to
  another session — leave it.
- Release key (never in the repo or the APK):
  `/Users/user64bit/Code/pawket/.keys/android/pawket-release.jks` (PKCS12,
  alias `pawket`, RSA 4096, 10,000 days, certificate SHA-256
  `A2:EF:F8:EE:78:3B:3E:F2:00:96:D5:EC:C6:1D:EF:F8:5A:13:37:56:8F:59:68:4A:03:67:DE:F0:72:B2:61:21`).
  Password only in this Mac's login Keychain, service
  `pawket-android-release-keystore`. Owner must back up both.
- Toolchain on this Mac (Apple M4): JDK 21 (`brew install openjdk@21`,
  `JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home`);
  Android SDK at `/Users/user64bit/Library/Android/sdk` (cmdline-tools,
  platform-tools, emulator 37.2, `platforms;android-37.0`,
  `build-tools;37.0.0`, `system-images;android-36.1;google_apis;arm64-v8a`);
  Anchor 1.2.0, Rust 1.89, Solana CLI 3.1.15; pnpm 10 (pinned by the repo).
- Emulator: AVD `pawket36` (Pixel 7 profile, Android 16, System WebView
  134.0.6998.135, Chrome and Google Calendar installed, no Google account).
  Start: `emulator -avd pawket36 -no-window -no-audio -no-boot-anim -gpu host`.
  Official MWA test wallet installed (`fakewallet-v1-release.apk`, SHA-256
  `550055426683c88aac246bef442bc8a37fe4986dca0b1ef475337dd7be6746e9`,
  matching the CLI's catalog). Its devnet account is
  `Gde54Dm6X8uhXPEKpNXwzFkv95XVe91PxBfseHTjVqmB` (funded with devnet SOL for owner-paid tests).
- Local device testing: in the worktree `pnpm build && pnpm start -p 3000`,
  `adb reverse tcp:3000 tcp:3000`, debug APK built with
  `-PSOLANA_MOBILE_URL=http://localhost:3000/home`. DevTools:
  `adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>`, then
  CDP `Runtime.evaluate` (a 30-line Node script; not committed).
- Release origin: `https://pawket-pets.vercel.app/home` (`android/gradle.properties`).
  Production does not serve the Android web changes until `main` is pushed.

## Requirements and progress

| Requirement | State | Source/artifact | Verification evidence | Remaining work |
| --- | --- | --- | --- | --- |
| Audit of product + official requirements | verified | this file, `docs/ANDROID.md` | terms PDF read (6.1–6.5, 8.1, 9.3); code audited | — |
| Architecture + source in the repo | verified on emulator | `android/`, `docs/DECISIONS.md` | debug and release builds; app runs | — |
| MWA genuinely signs for the existing send path | verified on emulator (test wallet) | `browser-client.ts`, `send.ts` unchanged | see record: connect, decline, adopt, care | a real wallet on hardware |
| Sponsored path | verified on emulator | — | adopt + care on devnet, sponsor fee payer first | — |
| Owner-paid, server-prepared, delegated paths | partly verified | `send.ts`, `use-send.ts` | Market buy, prepared keepsake, owner-paid Brush through MWA; receipts re-read | coin trade; device signing needs a WebView with Ed25519 |
| Cancellation, unknown outcomes, no duplicate sends | verified on emulator | `transactions.ts` | decline → "Nothing changed"; network cut → "could not reach Solana… Nothing was sent", wallet never opened | slow confirmation / unknown on hardware |
| Photo save and share | verified on emulator | `PawketBridge.kt`, `photo.tsx` | MediaStore `Pictures/Pawket/pawket-pixel-2026-10-05.png` (210 KB PNG); share sheet with the print; cancel → no false "Shared" | — |
| Link share, reminder | implemented; partly verified | `share-button.tsx`, `remind-me.tsx` | reminder intent reached Google Calendar (needs an account to save on the emulator) | link share on device |
| Haptics | implemented; verified as requests | `use-send.ts`, `home-screen.tsx`, Profile switch | bridge logs `haptic` after a save/confirm; e2e asserts it | feel on hardware |
| Back, lifecycle, return-to-play | verified on emulator | `MainActivity.kt`, `useBackCloses` | sheet and photo dialog close on back; history; root → background, instant resume; process kill → same page + history; update keeps wallet and pet; dark mode live, no reload | — |
| Phone layout, insets, keyboard, bars | verified on emulator | `MainActivity.kt`, `useBarsFollowRoom` | keyboard avoidance; bars follow Lamplight and night mode | small-phone pass on hardware |
| Shortcuts and verified links | implemented; shortcuts verified | `MainActivity.kt`, manifest, `assetlinks.json` | 3 dynamic shortcuts registered; trusted VIEW intent opens /park; foreign URL ignored | App Links verification needs production serving assetlinks + release APK |
| Storage / device-key story | documented; old-WebView path verified | `docs/ANDROID.md` | Ed25519 unsupported on WebView 134 → "update Android System WebView… Nothing was linked" | device-key linking on a WebView with Ed25519 |
| 3D, games, a11y | partly verified | — | 3D room draws (WebGL2), photo from the 3D room | games' gestures and TalkBack pass on hardware |
| Network failure | verified on emulator | `MainActivity.kt` | offline cold start → Pawket's screen, retry works | — |
| Web regression | verified | e2e | `pnpm verify`: 328 passed / 14 skipped; build/typecheck/lint green. `pnpm e2e`: 38 passed / 4 skipped (devnet) | rerun verify after the expiry-copy correction |
| Release APK, checksum, reproducible build | implemented; built | `scripts/android-release.sh` | release built and verified (v2 signature, cert above, not debuggable, 1.6 MB) | final build after deploy; record SHA-256 |
| Submission package | not started | — | — | demo script, pitch, screenshots, store copy, source-access note |

## Decisions and constraints

Recorded in `docs/DECISIONS.md` (2026-10 "official webshell") and
`docs/ANDROID.md`. Beyond those:

- App id `app.pawket.android` (`companion` is a Kotlin keyword; the CLI
  would have mangled the package). Changeable until the first store publish.
- minSdk 29 (template: 28) so saving to the gallery needs no permission.
- `@solana-mobile/wallet-standard-mobile` 0.6.0 pulls `react-native` as an
  auto-installed peer (fixed upstream, unreleased): `pnpm-workspace.yaml` marks the
  peer optional (`packageExtensions`) and skips the optional async-storage.
  It is imported only on Android (`perf(wallet)` commit), ~47 KB gzip.
- Back at the root calls `moveTaskToBack`: the platform's own rule, made
  independent of how the app was opened.
- Pull-to-refresh removed (a drag in the room or a game must not reload a send).

## Verification record

| Check | Command or procedure | Environment/device/wallet | Result | Evidence |
| --- | --- | --- | --- | --- |
| WebView capability probe | CDP in the debug app | emulator, WebView 134 | UA `wv` + `Solana Mobile Web Shell`; secure context; bridge injected; MWA registered; WebGL2; no `navigator.share`; Ed25519 NotSupportedError | — |
| MWA connect: decline | DECLINE in fakewallet | emulator | "You declined in your wallet. Nothing changed." (wallet stays on "Session active" until backed out — MWA 0.6.0) | screenshots |
| MWA connect: authorize | AUTHORIZE | emulator | back in Pawket by itself; chip `Gde5…VqmB`; persisted | — |
| Sponsored adopt via MWA | adopt Pixel, Keep on Solana, approve | emulator, local server, devnet | `5fhwzMUHngriJALGHCGdsBN5xmHCkCaGCqVfRvgbiGtE9pkTX9gmzNxtws3KbDV4q8ZS8ckGjjpTZ6pYj1ZwsDYZ` finalized: signers sponsor `HoayYx…LPuS` (fee payer) + owner; `AdoptPet` | devnet `getTransaction` |
| Confirmed care via MWA | Feed, approve | same | approve → sent → "Recorded on Solana, Pawket paid the fee" + Explorer; moment after confirmation | `4YwcFakTK3uva5FzzwxfSQmdyZx4mtis1662p1TQXkdZvsRwnDS2NUjcpNyVMMDodcK2gm5vahAgEwu17Wq4AjQF` |
| Keyboard | type a name on /adopt | emulator | resizes; back closes keyboard first | screenshot |
| Update keeps state | `adb install -r` new build, cold start | emulator | wallet silently reconnected; Pixel, On Solana | — |
| Photo save / share / cancel | Photo → Save; Share; back | emulator | MediaStore row; Sharesheet with preview; cancel leaves no false status | `content query` |
| Back order | sheet, photo dialog, history, root | emulator | closes newest overlay; history back; root → launcher; resume without reload | — |
| Process death | home, `am kill`, relaunch | emulator | `/playground` and history restored; wallet reconnected | — |
| Night mode / rooms | `cmd uimode night yes`; room cycle | emulator | prefers-color-scheme follows live, no reload; bars take the ground | screenshots |
| Offline open + retry | remove `adb reverse`, cold start | emulator | Pawket's offline screen; Try again loads | screenshot |
| Network cut mid-send | remove reverse, Play | emulator | "could not reach Solana… Nothing was sent"; no wallet prompt | — |
| Device key on old WebView | Link this app | emulator, WebView 134 | "…too old to make the key. Update it from the Play Store… Nothing was linked." | — |
| Shortcuts / links | `dumpsys shortcut`; VIEW intents | emulator | 3 shortcuts; /park opens; `https://evil.example/…` ignored | — |
| Market via MWA | buy sun hat | emulator test wallet, devnet | sponsor fee payer + owner; Buy; `meta.err = null` | `2DWcZwHeLAq6jCm4m7VBqNL3JsKmueNBzkCLoPoawjy5eutVQ8XDfHChWm3bpzyUZQPTGq1L49v7unVmRm1r3D5F` |
| Prepared keepsake via MWA | keep Pixel’s card | emulator test wallet, devnet | sponsor + asset signer + owner; CreateV2; `meta.err = null` | `4v9wSHRDgXSwwGBFjFtF9DfJtmkQ2byFFHJWKDbupzCLiVuTkahtpVfRG2G3mt4pqCgtT8VK1KTjmZjLy8vNwEC` |
| Owner-paid via MWA | Brush, sponsor disabled | emulator test wallet, devnet | sole owner fee payer; PerformCareAction; `meta.err = null` | `57jATYLPmALmazWUuWGxsVUpisioNuuPh8QRLvuNqBUV3u37aXUGg65aWYozuhy5oLEQLdfz38orzqW7XzeBnX4W` |
| Updated care | Play + wallet approval | emulator test wallet, devnet | finalized; pet XP and sticker reload after confirmation | `5K3cZUBwkSTHwsinsYbTA3cXMquzA1E9J2Sp2bRLNYtoWW4dBDDvhB2W7Ph1cZeVZCF65cDTxRdUKa7ab5Guh4Wm` |
| Android lint | `./gradlew lintDebug lintRelease` with default release URL | Mac | green; localhost override gives AppLinkUrlError, so only use it for assembleDebug | `android/.local/evidence/android-checks.log` |
| JVM tests | `./gradlew testDebugUnitTest` | Mac | 6 passed | BoundaryTest |
| Unit tests | `pnpm test` | Mac | 323 passed, 14 skipped | — |
| Web e2e | `PLAYWRIGHT_PORT=3000 pnpm e2e` (prod build) | Mac, Chromium | 36 passed, 4 skipped; android.spec 2 passed | — |
| Release build | `scripts/android-release.sh` | Mac | `app.pawket.android` 0.1.0 (1), min 29 / target 37, v2-signed by the release cert, not debuggable | — |

## Unfinished implementation and blockers

- None blocking. Remaining verification needs: production carrying these
  changes (push, authorised with the gates), and hardware with a real
  wallet for the rows marked so above.

## Artifacts and release preparation

- APK: `android/app/build/outputs/apk/release/app-release.apk` (rebuilt for
  the final record after the deploy; not committed).
- Prepared vs published: nothing published or submitted.

## Continuation procedure

1. `cd /Users/user64bit/Code/pawket-android && git status && git log --oneline -5`
   — branch `android`, clean.
2. Read "Next concrete action" at the top and continue there.
3. If the worktree is missing: `git -C /Users/user64bit/Code/pawket worktree add ../pawket-android android`,
   then `ln -s ../pawket/.env .env` and `pnpm install --frozen-lockfile`.
