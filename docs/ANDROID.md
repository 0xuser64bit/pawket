# Android

The Android app is a Solana Mobile WebView shell around the hosted Pawket app.
Web pages, game rules, storage formats, APIs and the Solana send path remain
authoritative. Kotlin adds navigation and phone capabilities; it holds no
player key or transaction engine.

## Source boundaries

| Source | Responsibility |
| --- | --- |
| `android/gradle.properties` | Start URL, application ID and release version |
| `android/app/src/main/java/app/pawket/android/MainActivity.kt` | WebView lifecycle, back, splash/offline screens, renderer recovery, shortcuts and App Links |
| `WebShellViewClient.kt` / `WebShellChromeClient.kt` | Trusted-origin navigation, wallet intents, new windows and permission refusal |
| `PawketBridge.kt` | Validated native operations for the trusted main frame |
| `CareReminder.kt` | The one care reminder: checked fields, an inexact alarm and its notification |
| `ShellRules.kt` | What a frame or a page reached without a link may load; when a dying renderer waits for the player |
| `android/app/src/test/…/BoundaryTest.kt` / `ShellRulesTest.kt` / `CareReminderTest.kt` | Origin, image, filename, frame, posted-page, renderer-retry and reminder tests |
| `src/lib/native/android.ts` | Page bridge and "this app"/"this browser" wording |
| `src/lib/solana/browser-client.ts` | Android-only Mobile Wallet Adapter registration |
| `public/.well-known/assetlinks.json` | Package and release signer permitted to open site links |
| `scripts/android-release.sh` | Signed build and release metadata |

The current release opens `https://pawket.world/home`. Only its exact scheme,
host and port load inside. External sites open in a browser; wallet intents
start the wallet app. File, content and data URLs cannot navigate the WebView.
Frames load only that origin or an empty document. A page reached without a
link — a form posted to another site — opens in the browser, and the app goes
back to where it was.
Release start URLs require HTTPS. Cleartext is allowed only for localhost and
127.0.0.1, including Mobile Wallet Adapter's local connection.

## Wallet and lifecycle

Android registers Mobile Wallet Adapter as a Wallet Standard wallet. Wallet
apps authorize and return signed transactions through the shared `send.ts`;
the bridge never signs. Every Solana app action requires a linked Pawket
Wallet, holding SOL where it is spent. Setup and money require owner approval; non-money actions use
the non-extractable device key within its expiry and daily limit.

A declined, closed or missing wallet sends nothing. Uncertain broadcast or
confirmation replies preserve the existing signature for lookup, without
resending. Care moments and haptics wait for confirmation. Local MWA patches
close sessions after failure, retry expired authorization within the same
session, reject account changes and bound waiting; `src/lib/solana/mobile-session.test.ts`
holds those behaviors. Consumer-wallet compatibility requires device testing.

Back closes the latest page overlay, then page history, then backgrounds the
root app. Configuration changes do not reload a waiting send. The WebView
pauses when hidden without stopping wallet-response timers. Saved navigation
is restored only within the current trusted origin; renderer loss creates a
new WebView, and a second loss within a minute waits on the retry screen, which
starts again from the first page. There is no pull-to-refresh. Insets account for system bars and
the keyboard; text follows the phone's font setting.

## Native bridge

`WebViewCompat.addWebMessageListener` injects `window.PawketAndroid` only for
the trusted origin and accepts only its main frame. Requests have checked
fields and correlated responses. A new operation needs field validation,
a JVM boundary test and a documented permission reason.

| Operation | Behavior | Runtime permission |
| --- | --- | --- |
| `share-image` | Validated PNG in a unique cache file, shared through a read-only FileProvider URI; old files cleared | None |
| `save-image` | MediaStore image in `Pictures/Pawket`; failed writes remove partial images | None on minSdk 29+ |
| `share-link` | Pawket-origin link through the share sheet | None |
| `remind` | Calendar editor with a daily reminder for 30 days; the player saves it | None |
| `allow-reminders` | Asked when the player turns care reminders on (Home or Settings); answers whether the phone lets Pawket post | `POST_NOTIFICATIONS` on Android 13+, asked only here |
| `care-reminder` | Sets or clears the one care reminder: a time within three days and plain words (control characters removed, lengths capped), as an inexact alarm; tapping it opens the app where it was left | None more |
| `haptic` | Done, cheer or refusal feedback respecting phone and app settings | None |
| `room` | Validated ground color and day/night system bars | None |

The bridge accepts no key, transaction, filesystem path or URL to load.
External intent URLs become fresh restricted navigation intents, without
supplied components, selectors, extras or permission flags. The app's
permissions are INTERNET and POST_NOTIFICATIONS. The second is the care
reminder's, the one thing the app says while it is closed; Android 13 and later
ask for it only when the player turns care reminders on, and refusing leaves
them off. The page works out when a pet will first need care
(`src/lib/reminders/care.ts`, from the program's decay, moved to 09:00–21:00 on
the phone's clock) and sets one reminder, replaced whenever a record changes;
nothing about it leaves the phone, and a restart clears it until Pawket is
opened again. AndroidX's app-private signature permission adds no runtime
prompt or data access.

## Storage and recovery

| Data | Location and recovery |
| --- | --- |
| Local pets, player look/name/outfits, room and settings | This WebView's origin storage; separate from Chrome; lost on uninstall or clearing app data |
| Solana pets, Passports, guilds, Closet and Pawket Wallet | Chain state; reconnect the same wallet on another device |
| MWA authorization | Adapter cache in app storage; disconnect or clear storage to remove |
| Device key | Non-extractable WebCrypto Ed25519 key in IndexedDB; unlink on chain and approve a new link after storage loss |

Backups are off and phone transfers exclude WebView data. Local key deletion
does not revoke its chain link. A current WebView with WebCrypto Ed25519 is
required for linking; unsupported versions show update guidance. No exportable
key or owner-wallet fallback is provided. Local play remains available.

Release 0.1.0 used `pawket-pets.vercel.app`; 0.1.1 uses `pawket.world`. Storage
and keys do not move across origins. Keep the previous host serving older APKs
and metadata. Players can keep a local pet on Solana before changing origin,
then reconnect the same wallet and approve a new device link on the new origin.
Install updates with the same package and signer without clearing app data.

## Build

Use JDK 17 or later and the SDK/build-tools versions required by the Gradle
project. `android/gradle/wrapper/gradle-wrapper.properties`,
`android/gradle/libs.versions.toml` and the build files own tooling versions.
`android/local.properties` points to the local SDK and is ignored.
The URL, package and version properties are required; a missing or invalid
value fails the build instead of selecting template defaults. The Gradle
properties are the only shell identity configuration; no TWA manifest is used.

```sh
# Local web app and debug shell on an attached device:
pnpm build && pnpm start -p 3000
adb reverse tcp:3000 tcp:3000
(cd android && ./gradlew assembleDebug -PSOLANA_MOBILE_URL=http://localhost:3000/home)
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Native checks against the configured release origin:
(cd android && ./gradlew testDebugUnitTest lintDebug lintRelease)

# Signed release:
PAWKET_ANDROID_KEYSTORE=/path/to/pawket-release.jks scripts/android-release.sh
```

The debug package has a `.debug` suffix, separate storage and WebView debugging.
Release disables WebView debugging and page console logging. Development OS
images can expose a debugging socket despite that flag; confirm release
behavior on a consumer phone. An official MWA test wallet can verify devnet
signing on an emulator, but does not prove consumer-wallet support.

## Release procedure

Web changes ship through the hosted deployment and must be checked in the APK
when they affect Android flows. Native changes need a new APK, an incremented
version code and the same signer. `scripts/android-release.sh` uses the
publisher's keystore, with passwords supplied through its supported environment
or local Keychain. Never commit or include the keystore/password in a source
archive, APK or release evidence. Back up both securely under owner control.

The script refuses uncommitted changes under `android/` or `public/.well-known/`,
an APK whose package or version differs from `android/gradle.properties`, and
a signer `assetlinks.json` does not list; it prints the shell commit and the
hosted web commit (`/api/health`). Store the signed
APK with its SHA-256, signer fingerprint, shell source commit, hosted web commit,
cluster, device matrix, results and public receipts. Keep that evidence with
the release artifacts outside tracked product documentation. Publication
requires the responsible publisher's identity, policy declarations and approval;
building an APK does not publish it.

## Physical-device release checks

Use a signed release APK and devnet. Record phone, Android, WebView and wallet
versions, release/web commits, result and transaction signatures. Never record
recovery screens or private key material. Repository release evidence has not
completed the consumer-wallet, modern-WebView device-link/revocation and
TalkBack pass; emulator results do not close that gate.

| Check | Expected result |
| --- | --- |
| Local adoption, care and reopen | Pet and care persist; copy says "in this app" |
| Photo save/share, cancel, public link share | Gallery image and native share work; cancellation claims no success |
| Wallet connect | Correct devnet identity; connecting sends no transaction |
| Keep before linking | Link-first recovery; no owner-wallet fallback |
| Link with chosen expiry, limit and deposit | Owner approval; linked device persists after reopening; unsupported WebView shows update guidance |
| Keep and care on Solana | No owner prompt for device action; confirmed record and Explorer receipt; moment/haptic only afterward |
| Market decline and approval | Decline buys nothing; approved purchase spends Pawket Wallet and appears only after confirmation |
| Rotation/background while wallet answers | No reload, competing session or duplicate send |
| Unlink and next care | Revocation blocks device action and offers relinking |
| Passport and App Links | Same wallet's chain pet returns; trusted public links open in release |
| Back, keyboard, large text, TalkBack, games and 3D/flat | Controls remain accessible; no gesture reloads a send |
| Haptic setting and calendar editor | Preference persists; player controls calendar save; no new runtime permissions |
| Care reminders | Turning on asks once on Android 13+, and a refusal leaves them off; a pet left alone is named at the predicted waking hour; tapping opens the app without reloading it; off clears it |
| Offline cold open and uncertain send | Retry screen; recover known signature before a new action |

Reproduce failures with the recorded versions, fix the owning layer and rerun
relevant checks before declaring device support. No mainnet transaction is
required. The app needs a connection to open; it has no offline site cache
or push notification service. An already-open local pet can still be played.
