# Pawket Android review package

Prepared for review, not submitted or published to a store. The release is
**Solana devnet**. Test SOL and guild coins have no value. The Android build
and its verification record live in `ANDROID-HANDOFF.md`; build instructions
are in `ANDROID.md`.

## Product and store copy

**Name:** Pawket

**Short description (24 characters):** A companion you care for

**Description:**

Adopt a companion, give it a name, and make a room together. Start without
a wallet. Feed, play, brush and rest with your pet; choose your look, collect
stickers and try the day's playground round. Nothing you buy changes a
pet's care, XP or game score.

When you choose, keep your pet on Solana. Your wallet signs, and a confirmed
care becomes part of its public Passport. Pawket pays eligible fees while
its sponsor is available. You can return with the same wallet on another
device and find your pets on Solana there.

On Android, save a room photo to your gallery or open the phone's share
sheet. Use a calendar reminder, a launcher shortcut, and the back gesture
to return comfortably. Haptics mark a care only after it is saved or
confirmed. Your wallet stays in its own app.

This release uses Solana devnet. Its coins are test tokens with no value.
An internet connection is needed to open Pawket. Pets kept only in this
app stay on this phone and disappear if its storage is cleared or the app
is uninstalled. A supported wallet app is needed for Solana actions.

The optional Market sells cosmetic expression. Guild coins trade only on
their own pages, carry their risk disclosures, and never affect care.

**Category candidate:** Games. **Language:** English.
Owner must select the portal's applicable category and complete its content
and regional declarations. No claims of traction, retention or commercial
success accompany this package.

## Why mobile improves it

Care is a brief return to the same companion. Android keeps the room and
wallet association together, returns from wallet approval without reloading
an action, and puts Home and Playground on launcher shortcuts. A room
photo can leave the app through the gallery or system share sheet, and a
reminder stays in the player's calendar. Those features support a daily
care loop; measured retention remains untested.

The supported official webshell preserves the live web product and its
server APIs. A native implementation contains navigation and phone
capabilities, while the existing Solana program remains the authority for
care and permissions. See the [official web app publishing guide](https://docs.solanamobile.com/recipes/general/publishing-a-web-app).

## Existing product and new work

Baseline: `43881c60d4643b9bd19eaf875607bcc2d54a585c`. Compare that commit with
the release source recorded in `ANDROID-HANDOFF.md`.

| Already in the baseline | New Android work |
| --- | --- |
| Guest adoption, care math, cooldowns, XP, streak, multiple pets | Android APK, native launch/splash/offline/retry, secure origin boundary |
| Player and pet in the 3D room, flat fallback, looks, room themes, photos | Gallery export, temporary FileProvider image sharing, native link sharing |
| Wallet Standard, sponsor, confirmation, public Passports | MWA owner signer registered on Android and routed through the same send path |
| Pawket Wallet and constrained device signing | App storage/key disclosures and actionable unsupported-WebView error |
| Playground, Market, guilds, keepsakes and optional coins | Back order, keyboard/insets, lifecycle recovery, native bars, shortcuts and App Links |
| Calendar file download | Android calendar editor with an optional recurring reminder |
| Confirmed care moments | Optional haptic only after confirmed/saved care, refusal or a new level |
| Transaction lifecycle and Explorer receipt | Known-signature recovery after lost replies, bounded confirmation lookups and readable expired-approval errors |

No game math, program address, instruction discriminator, permission scope,
mainnet configuration or price changed for this release.

## Reviewer installation and source

Use the signed `pawket-0.1.0.apk` and `SHA256SUMS.txt` in the prepared local
submission folder. Verify the hash, install it on Android 10 or newer,
open Pawket and start with guest adoption. A devnet-capable MWA wallet is
needed only for the Solana portion. A current Android System WebView is
recommended. The emulator proof used the official MWA test wallet, not a
simulated signer injected into the page.

The APK opens `https://pawket-pets.vercel.app/home`. Server routes and the
sponsor stay on that host. Do not place server keys or a wallet recovery
phrase in the APK, reviewer materials or a source archive.

Source: `https://github.com/0xuser64bit/pawket` (private).
The owner should grant the organizer's verified judging account read-only
access, using the current submission portal's instructions. No invitation
has been sent. The release commits and baseline diff make the mobile
contribution reviewable. The repository does not acquire an open-source
license through this submission.

To reproduce:

1. Check out the recorded release source; install the pinned pnpm version
   and run `pnpm install --frozen-lockfile`.
2. Configure only the documented public cluster/host values and server env
   from `.env.example` as needed. Reviewer guest play needs no signing key.
3. Run `pnpm verify`, `pnpm program:test` where the Solana toolchain is
   installed, and the Android JVM/lint checks in `ANDROID.md`.
4. Supply the publisher's release keystore securely and run
   `scripts/android-release.sh`. A reviewer can instead build a debug APK
   without the publisher key. It has separate storage and an app id suffix.
5. Verify the APK signer, checksum, trusted URL and devnet label. Record the
   deployed web revision as well as the shell revision: the webshell loads
   a live site, so a later web deploy can change its behavior.

## Demo script and recording

Show real interaction, with the devnet label visible. Narration below is
ready to read. Use a fresh guest pet and the wallet's own approval screens.
Do not edit a rejection or pending state into a successful result.

| On screen | Narration |
| --- | --- |
| Install/open Pawket, adopt a named pet | “This is Pawket on Android. I can begin with a companion and no wallet.” |
| Feed or play in its room; Today and a playground round | “Care gives us a daily rhythm. The pet and my character share a room. Everyone gets the same daily round.” |
| Photo, Save, native share sheet | “This is our room photo, saved to my gallery. I can send it through the phone's share sheet.” |
| Connect, MWA approval, return | “Pawket reaches the wallet app on this phone. My keys stay there.” |
| Keep the guest pet on Solana, wallet approves | “Now I choose to keep this pet on Solana. The sponsor pays eligible fees; my wallet signs for my pet.” |
| Confirmed care, updated record, Explorer receipt | “The moment plays after confirmation. This signature is the care record I can check.” |
| Public Passport | “The Passport reads the pet and its history from Solana.” |
| Back, background, relaunch | “I return to the same companion. Pets on Solana follow the same wallet; pets in this app stay on this phone.” |
| End on Home | “The Android work adds wallet app integration, photos, reminders and reliable return to play. This demonstration is on devnet.” |

`Pawket-Android-Demo.mp4` is an edited silent recording of the installed
signed release on the emulator: guest Miso, care, official test-wallet
approval, keeping Miso on Solana, confirmed Rest, the public Passport and
native photo sharing. Waiting time is trimmed; successful states come from
the recorded app and finalized devnet transactions. Separate longer clips
preserve the adoption and care/photo sequences. No consumer wallet or
physical-device result is implied.

Capture hardware at its original portrait resolution. The supplied compact
videos are 720×1600; screenshots are original 1080×2400. Record the narration
above or replace the clips with a complete hardware recording after the
final pass. Keep receipt URLs in notes so a reviewer can verify the events.
Avoid filming wallet recovery screens, balances unrelated to the demo or
private notifications.

For reproducible capture with an attached test device:

```sh
adb shell screenrecord --time-limit 180 /sdcard/pawket-demo.mp4
# Perform the demonstrated actions; stop recording with Ctrl-C.
adb pull /sdcard/pawket-demo.mp4 ./pawket-demo.mp4
adb shell rm /sdcard/pawket-demo.mp4
```

Pitch outline: companionship first; guest care loop; verifiable history;
why the phone helps; existing product versus Android contribution; verified
build and candid hardware limits. The prepared PPTX uses actual emulator
screens, not imagined product mockups.

## Store and submission readiness

The [competition terms](https://solanamobile.radiant.nexus/legal/clock-in-terms.pdf)
require a functional Android application, mobile-stack integration,
meaningful Solana behavior, source access, demo and pitch materials. The
owner must confirm project eligibility, including the age condition and
significant new mobile work. A new Android folder does not reset project
age. Do not assert eligibility on the owner's behalf.

The [store submission guide](https://docs.solanamobile.com/dapp-store/submit-new-app)
and [listing guidelines](https://docs.solanamobile.com/dapp-store/listing-page-guidelines)
are the checklist for the actual portal.

| Item | Prepared or required |
| --- | --- |
| Signed APK, version, signer, hash | Prepared locally; see handoff release record |
| 512×512 icon | Existing Pawket icon, exported as PNG |
| Portrait screenshots | Actual Android captures, 1080×2400, consistent aspect ratio |
| Pitch and demonstration | PPTX, narration script and emulator capture; final hardware pass pending |
| Short/full copy, permission notes | Above; only capability permission is INTERNET; AndroidX adds an internal signature permission |
| Privacy policy | `ANDROID-PRIVACY.md` is a reviewable draft; owner must supply support contact, approve and publish a stable public URL |
| Support contact / URL | Owner input required; no address invented |
| Publisher account, identity, legal declarations | Owner-only portal actions |
| dApp Store wallet, publication fees/funds | Owner-only; no mainnet funds spent |
| Private source access | Owner authorizes and grants verified reviewer access |
| Release key backup | Owner securely backs up keystore and password separately |
| Real wallet and device-key linking | Physical Android pass at the end, per owner |
| Upload, store publication, competition submission | Not performed; separate owner authorization required |

No push-notification service, native camera permission, seed custody or
secondary market is claimed. Haptics are implemented but must be felt on
hardware. WebView 134 cannot create the device's Ed25519 key; it displays
update guidance while owner signing remains available. A modern WebView
with Ed25519 must pass linking, delegated care and revocation before that
path is called verified on Android.
