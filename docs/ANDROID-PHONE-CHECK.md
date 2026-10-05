# Pawket final Android phone check

Use the signed `pawket-0.1.0.apk` from the prepared submission folder.
This is the final physical-device pass requested by the owner, after the
implementation and emulator verification. Use Solana devnet. Record the
phone model, Android version, System WebView version, wallet/version and
result. Never share a recovery phrase or private key.

## Install and begin

1. Install or update the release APK. Its package is `app.pawket.android`.
   The debug “Pawket dev” app is separate; use **Pawket** for this check.
2. Open the app. Adopt a fresh pet without a wallet, feed it, and reopen
   the app. Its name and care should persist. The screen should say
   **in this app**. Uninstalling or clearing storage removes guest pets.
3. Open Photo. Save it and find it in **Pictures/Pawket**. Share the photo
   to an app you choose. Cancel another share; Pawket should not claim that
   it was shared. Open a public Passport and test native link sharing too.

## Wallet and care

4. Set your supported wallet app to devnet, then connect from Pawket.
   Approve in the wallet and return. Connecting alone must not send anything.
5. Keep the fresh pet on Solana. Read the level-reset explanation. Approve
   the transaction; wait for confirmation. The pet should then say
   **on Solana**, with an Explorer receipt on devnet. Note the signature.
6. Perform one available care and decline in the wallet. No XP, care log
   or moment should change. Return and approve an available care. Its
   moment and haptic should occur **after** confirmation. Note that receipt.
7. Open the public Passport and check the confirmed care. Background the
   app, reopen it, and follow a shared `/pet/…` link. The same wallet's
   on-chain pets should return. Rotate while a wallet request is open;
   Pawket must not reload or duplicate it.

## Device key and fallback

8. In Pawket Wallet, choose to link **this app**. Review the expiry and daily
   limit and approve with your wallet. On a current WebView that supports
   Ed25519, an eligible care should then use the linked device without a
   wallet prompt, with the same visible confirmed receipt. Record the result.
   Reopen the app and repeat an available care to check key persistence.
   Check the chosen expiry and daily limit: once either prevents device
   signing, the app must explain it and offer the owner-wallet fallback.
9. Unlink using the owner wallet. The next eligible care should ask the
   wallet again. Device signing must never offer a money transfer.
10. If linking says to update Android System WebView, update it and repeat.
    Report the exact message and WebView version if it still fails. Owner
    signing should continue working. Do not describe this path as verified
    until linking, delegated care and revocation have passed on the phone.

## Phone behavior

11. Feel one confirmed-care haptic, turn haptics off in Profile, and confirm
    that the setting sticks. Open a calendar reminder and inspect the event
    before deciding whether to save it. Pawket should request no calendar,
    gallery, camera or contacts permission.
12. Back should close the newest sheet/photo, then page history, then send
    the root app to the background. Resume should retain the room. Try all
    four playground games with touch; switch between 3D and Flat Room.
13. Check the keyboard, larger Android text size and light/dark rooms.
    Use TalkBack for adoption, care controls and the wallet sheet. Note any
    clipped controls, missing labels or gesture that reloads the page.
14. Try an offline cold open: Pawket should show its retry screen. Restore
    the connection and retry. For an unknown transaction outcome, inspect
    the existing Explorer receipt before sending a new action.

No mainnet purchase or trade is required. The emulator already verified
sponsored care, owner-paid care, a cosmetic purchase, a prepared keepsake
and an owner-paid coin trade against devnet. Hardware checks establish the
consumer wallet and physical-device behavior that the emulator cannot prove.

## Result record

| Check | Result / signature / issue |
| --- | --- |
| Phone, Android, WebView, wallet versions | |
| Guest persistence and photo save/share | |
| MWA connect, decline, adoption and confirmed care | |
| Passport, public link, background/relaunch/rotation | |
| Device link, delegated care, revoke and owner fallback | |
| Haptics, calendar editor and all games | |
| Larger text, keyboard, TalkBack and 3D/flat room | |
| Offline/retry and any unknown receipt | |

Update `ANDROID-HANDOFF.md` from these results. Keep any failure open,
reproduce it with the reported versions, fix the owning layer and rerun the
relevant checks before calling the physical release verified.
