# Pawket Android handoff

Assignment: `ANDROID-BUILD-BRIEF.md`. Architecture/build: `ANDROID.md`.
Reviewer and store materials: `ANDROID-SUBMISSION.md`.

## Current objective and checkpoint

- Checkpoint: `A4-hardware-ready`.
- Overall state: **in progress**. Implementation, signed APK, deployment and
  emulator verification are ready. Physical consumer-wallet/device-key
  verification and owner publication inputs remain open.
- Next concrete action: the owner installs the signed release and follows
  `ANDROID-PHONE-CHECK.md`, then supplies the recorded device/wallet versions,
  results and transaction signatures. Fix any reproduced failure before
  calling the physical release verified. The owner requested this phone
  pass at the end of the work and has a phone available.
- No program, game math, addresses, authorities, device permissions or
  mainnet configuration changed. No store/event submission, repository
  access invitation or mainnet spending performed.

## Source and working environment

- Worktree: `/Users/user64bit/Code/pawket-android`, branch `android`.
- Private repository: `git@github.com:0xuser64bit/pawket.git`.
- Baseline: `43881c60d4643b9bd19eaf875607bcc2d54a585c`.
- Reviewed deployed web: `52a4db2`; Vercel deployment
  `8yfwXgqfK897Zq3USdT9KuDB69Dp`, status success. Healthy devnet site at
  `https://pawket-pets.vercel.app/home`; assetlinks serves the release signer.
- All task source commits are on `android`; `git log 43881c6..android`
  shows the sequence. This checkpoint accompanies the final documentation
  commit. Inspect actual status and origin/main before subsequent work.
- Task source boundaries: `android/`, `src/lib/native/`, Android registration
  in `browser-client.ts`, shared sends/lifecycle in `send.ts` and
  `transactions.ts`, native call sites in photo/share/reminder/care/settings,
  bridge e2e coverage, `public/.well-known/assetlinks.json`,
  `scripts/android-release.sh`, pnpm settings and Android documentation.
- Other work preserved: primary checkout `/Users/user64bit/Code/pawket`
  remains at its local main baseline with the owner's untracked Android brief.
  Branch `room-3d` and the primary checkout's server on port 3100 are untouched.
  The authorized deployment used a normal `android:main` push without
  changing primary-checkout files. Do not reset or overwrite them to align
  local main with remote main.
- `.env` here is an ignored symlink to `../pawket/.env`. Never print/copy its
  contents. It holds server configuration and the devnet sponsor key.
- pnpm **10.34.6** pinned in package.json. `pnpm-workspace.yaml` owns the
  overrides/optional MWA peer workaround. Frozen install passed with no
  lockfile/dependency change. Plain `pnpm verify` works here; nesting
  `corepack pnpm verify` under a conflicting Homebrew pnpm can fail to select
  the child pnpm, so do not use that invocation on this Mac.
- JDK 21: `/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home`.
  SDK: `/Users/user64bit/Library/Android/sdk`; SDK/build-tools 37.0.0.
  Gradle 9.7.1, AGP 9.3.2, Kotlin 2.4.10. Other pins are in `ANDROID.md`.
- Emulator `pawket36`: Pixel 7 profile, Android 16/36.1 arm64,
  WebView 134.0.6998.135. It is a `userdebug` OS, not a consumer phone.
  Official MWA test wallet installed, APK SHA-256
  `550055426683c88aac246bef442bc8a37fe4986dca0b1ef475337dd7be6746e9`.
- The earlier localhost identity used public devnet account
  `Gde54Dm6X8uhXPEKpNXwzFkv95XVe91PxBfseHTjVqmB`. The production release's
  test-wallet identity used `5RrxY8Rm6dbFwui9Txmk2CLpqheT3KZVN7MdgDc8q4cH`.
  No private wallet material was read or exported.
- Local services for debug checks: `pnpm build && pnpm start -p 3000`,
  `adb reverse tcp:3000 tcp:3000`, then assembleDebug with localhost URL.
  Existing local production server is running on 3000; check before reusing.
  App component: `app.pawket.android.debug/app.pawket.android.MainActivity`
  (the activity namespace does not gain the debug suffix).

## Requirements and progress

| Requirement | State | Evidence / owning source | Remaining work |
| --- | --- | --- | --- |
| Product and official requirements audit | verified | brief, architecture, submission split and primary links | owner confirms project eligibility |
| Source, origin and signer boundaries | verified | official webshell; exact origin-bound WebMessageListener; single send path; no program changes | — |
| Real sponsored MWA signing | verified on emulator | adoption + care finalized in installed signed release against production | consumer wallet on phone |
| Owner-paid and prepared signing | verified on emulator | Brush with sponsor off; Market Buy; Core keepsake extra signer; Meteora Swap2 sole owner payer | hardware wallet behavior |
| Delegated signing | implemented; unverified on Android | program + browser tests; old-WebView refusal is actionable | modern WebView link, care, revoke |
| Cancel/network/unknown/expiry | verified at stated layers | emulator decline/offline checks; regression tests for lost/hanging broadcasts and confirmation; expired code mapping | unknown/slow consumer-wallet behavior on phone |
| Native photo save/share and link share | verified | release MediaStore PNG, image and public-Passport share sheets | choose a real recipient app on phone |
| Reminder | partly verified | native calendar editor opens; emulator needs an account to save | owner inspects/saves on phone |
| Haptics | implemented; requests verified | confirmed care/native bridge tests; failure cannot undo care | feel and disable on phone |
| Back/lifecycle/render recovery | verified on emulator | overlays/history/root; background/process restoration; forced release renderer crash recovers wallet/pet | rotation and consumer-wallet return on phone |
| Keyboard/insets/small screen/theme | verified on emulator | 360 CSS px no overflow; larger text 1.3; room bars; keyboard resize; 3D/flat | physical touch/TalkBack |
| Shortcuts/App Links | verified | 3 shortcuts; release domain verified by Android; external /park and Passport links open in release | hardware defaults |
| Guest storage/device-key disclosures | verified | this-app copy; backup exclusions; old-WebView update guidance | current-WebView device key |
| Web/program/native regression gates | verified | table below | rerun owning checks only if source changes |
| Release APK and deployment | verified | APK installed; v2 signer; manifest not debuggable; healthy production; release receipts | consumer device proof |
| Review/submission materials | prepared | local APK, PPTX, actual screenshots, recordings, copy/privacy/source guide | contact, policy publication, source access, identity and submission approval |

## Decisions and constraints

- Keep the hosted web product and program authoritative. Kotlin contains
  phone behavior, not another pet store or transaction engine.
- Only exact trusted origin + main frame may call the six native operations.
  External intent URLs become fresh restricted VIEW intents, without supplied
  components, selectors, extras or permission flags.
- Shares have unique cache files. Failed MediaStore insertion/publication
  cleans up instead of crashing. Bridge/haptic failure cannot turn confirmed
  care into a failed care.
- No pull-to-refresh, timer suspension or reload while a wallet answers.
  Main and temporary popup views handle renderer loss.
- An uncertain send looks up its existing signature. Broadcast and status
  requests have a 30-second budget; no fresh transaction is automatically
  built or sent. Definite preflight failures stop before confirmation.
- WebView 134 has no WebCrypto Ed25519. No exportable-key workaround was
  introduced. Owner-wallet signing continues; linking says to update WebView.
- Release manifest is not debuggable and compiled code passes `false` to
  WebView debugging. This userdebug emulator still exposes a socket because
  [Chromium enables it on development OS builds](https://chromium.googlesource.com/chromium/src/+/3546854f59..2e285ebae2).
  Its socket is not evidence of an APK debug flag. Confirm absence on hardware.
- INTERNET is the sole Android capability permission. AndroidX adds an
  app-private signature permission for its internal receiver, no data access
  or runtime prompt. No gallery/calendar/camera permission.
- Stable origin and signing key are required for app storage/update continuity.

## Verification record

| Check | Environment / procedure | Result | Evidence |
| --- | --- | --- | --- |
| Frozen install | pinned pnpm; `corepack pnpm install --frozen-lockfile` | passed, lockfile unchanged | build-settings commit |
| Full web gate | `pnpm verify` | typecheck/lint/build passed; 330 tests passed, 14 opt-in skipped (44 files + 2 skipped) | `android/.local/evidence/verify.log` |
| Program gate | fresh `pnpm program:test` | 57 passed; IDL unchanged | source unchanged afterward; results observed in this task |
| Browser e2e | `PLAYWRIGHT_PORT=3000 pnpm e2e --workers=4` | 38 passed, 4 opt-in devnet skipped | `android/.local/evidence/web-e2e.log` |
| Android | `./gradlew testDebugUnitTest lintDebug lintRelease` | 6 JVM tests and lint passed | `android/.local/evidence/android-checks.log` |
| Android debug/release | local assembleDebug; `scripts/android-release.sh` | passed; signed release installs | `android/.local/evidence/debug-build.log`, `release-build.log` |
| Expired / lost replies | meaningful failed-then-fixed tests | lost broadcast, never-replying send, status outages preserve known receipt; no duplicate broadcast | `send.test.ts`, `transactions.test.ts` |
| Updated native exports | debug + signed release | published gallery PNG, native image/link share sheets, cancellation stays honest | MediaStore `is_pending=0`; screenshots |
| Release guest loop | installed release, production | adopt Miso without wallet, feed +10 XP, this-app copy | `07-release-guest.png`; demo |
| Release adopt | MWA test wallet, production/devnet | finalized; sponsor first + owner; AdoptPet, `err=null` | receipt A below |
| Release care | Rest via MWA | finalized; sponsor first + owner; XP/sticker only afterward; `err=null` | receipt B below |
| Public Passport | server-read release page | Miso, 10 XP, one Rest, day streak | `09-release-passport.png` |
| Background/cold open/crash | release + forced CDP renderer crash | app survives, wallet and Miso restored, root resumes | screenshots/logs; emulator-only OS override |
| Release links | `pm verify-app-links --re-verify` + external VIEW | domain verified; /park and Passport route inside release | Android domain state |
| Release package | apksigner/aapt2/apkanalyzer | v2 signature; 0.1.0 (1); min29/target37; no debuggable flag | build log; `release-activity-dex.txt` |
| Pitch | artifact-tool finalizer + all six rendered slides inspected | structural/layout/import checks passed; no findings; not tested in PowerPoint | `android/.local/.codex-finalizer/validation-v3.json` |
| Videos/screenshots | actual release capture; compact H.264 copies | 720×1600 videos; original 1080×2400 screenshots | prepared submission folder |

Receipt A (release adoption):
`4TA2Vr1uk2Cm64mBxSC3oWFPa1gxdYNomeagJQ6TAKyqVchpW9CqaG34pC45xb6REAS7vUFoxaq2eRJULJeGzh3z`.
Receipt B (release Rest):
`2GTkmbJqNPVQYAenwKCi3H4bXW3Fvxc7EoYUAS3TMAa1TjtYQX3dcbEhpVbapgkh4xRQZcScu7RuqeL4CMUYbkwS`.
Both re-read finalized from devnet, `meta.err=null`, fee payer sponsor
`HoayYxQwkfKxRgR39RMVfkrth1KEJ1hXCPAvsA5bLPuS`, second signer release test
wallet above. Miso's account: `DNm13rHX28YG1mtqu2HZSYzrqLQGoRJxZT49fPSapnxr`.

Other emulator receipts, recovered from Claude's final session and re-read:

| Path | Signature / payer proof |
| --- | --- |
| Market sun hat | `2DWcZwHeLAq6jCm4m7VBqNL3JsKmueNBzkCLoPoawjy5eutVQ8XDfHChWm3bpzyUZQPTGq1L49v7unVmRm1r3D5F`; sponsor + owner, Buy |
| Prepared keepsake | `4v9wSHRDgXSwwGBFjFtF9DfJtmkQ2byFFHJWKDbupzCLiVuTkahtpVfRG2G3mt4pqCgtT8VK1KTjmZjLy8vNwEC`; sponsor + asset signer + owner, CreateV2 |
| Owner-paid Brush | `57jATYLPmALmazWUuWGxsVUpisioNuuPh8QRLvuNqBUV3u37aXUGg65aWYozuhy5oLEQLdfz38orzqW7XzeBnX4W`; sole owner, PerformCareAction |
| Updated Play | `5K3cZUBwkSTHwsinsYbTA3cXMquzA1E9J2Sp2bRLNYtoWW4dBDDvhB2W7Ph1cZeVZCF65cDTxRdUKa7ab5Guh4Wm`; finalized |
| New Android coin trade | `5CCLU2nGbVVJqV9Wj8UpQuddvHUnnzqUQv492zVAbJek9r8PARYGv41iYbPMhhATHGMD8HhrtDB5cc2dnKSYA8vF`; sole owner/fee payer, legacy Swap2, 0.001 devnet SOL |

All listed chain checks returned no transaction error. They prove test-wallet
signing, not physical consumer-wallet compatibility or user traction.

## Unfinished implementation and blockers

No partial source implementation remains. Hardware checks are pending,
especially modern WebView device linking/delegated care/revocation, consumer
MWA cancellation/account changes/rotation, haptic feel, all games with touch
and TalkBack. Exact procedure: `ANDROID-PHONE-CHECK.md`.

Owner support email/URL remains unanswered. Privacy draft and store copy are
ready, but policy publication, legal/publisher identity, project eligibility,
private source access and store/event submission require owner action or
specific authorization. These do not prevent installing/testing the APK.

## Artifacts and release preparation

- Local folder: `/Users/user64bit/Code/pawket-android/android/.local/submission/`.
  ZIP beside it: `Pawket-Android-Review.zip`. Files are ignored build artifacts,
  not source commits. Transfer the folder/ZIP if continuing on another Mac.
- Signed APK `pawket-0.1.0.apk`; source build also at
  `android/app/build/outputs/apk/release/app-release.apk`.
- Package `app.pawket.android`; 0.1.0 (1); min29/target37.
- APK SHA-256:
  `9be5b00bec4529a239bba42a5ff557a27d3da5f000a10016223fbfc6e5ce2016`.
- Native source last changed in `753d7b2`; APK build checkout `e776b80`.
  Later changes are web lifecycle/tests/docs; hosted behavior reviewed at
  deployed `52a4db2` (includes the later `7366a61` broadcast deadline).
- Signer SHA-256:
  `A2:EF:F8:EE:78:3B:3E:F2:00:96:D5:EC:C6:1D:EF:F8:5A:13:37:56:8F:59:68:4A:03:67:DE:F0:72:B2:61:21`.
- Release keystore, never in package/source:
  `/Users/user64bit/Code/pawket/.keys/android/pawket-release.jks`, PKCS12,
  alias `pawket`, RSA4096. Password in login Keychain service
  `pawket-android-release-keystore`. Owner securely backs up both separately.
- Local review folder includes APK/hash/release JSON, six-slide PPTX, original
  screenshots, 512px icon, actual silent emulator recordings and edited demo,
  narration/build/source-access guide, privacy draft and phone checklist.
  Raw captures and private pitch build/evidence remain under `android/.local/`.
- No synthetic product screen, user/retention/revenue claim or external
  approval is fabricated. Videos are silent; narration script is ready for
  the owner. Consumer-phone recording can replace the test-wallet footage.

## Continuation procedure

1. `cd /Users/user64bit/Code/pawket-android`; inspect Git status, task commits
   and remote before edits. Preserve the primary checkout and other server.
2. Verify the APK hash in the folder and install on the owner's phone:
   `adb install -r android/.local/submission/pawket-0.1.0.apk`, or open the APK
   on the phone. Run the checklist and record versions/results/receipts.
3. For a failure, reproduce on those versions, fix the owning layer in a
   focused commit, run relevant checks plus `pnpm verify`, and update this
   handoff. Native changes need a new signed APK and version code after any
   published release. Keep the same signer and origin.
4. After hardware is green, obtain the public support contact and approve/
   publish the policy, source access and store/event submission separately.
   Do not turn this checkpoint into permission to grant access or submit.
