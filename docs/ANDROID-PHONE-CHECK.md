# Pawket final Android phone check

Use the signed `pawket-0.1.1.apk` from the prepared submission folder.
This is the final physical-device pass requested by the owner, after the
implementation and emulator verification. Use Solana devnet. Record the
phone model, Android version, System WebView version, wallet/version and
result. Never share a recovery phrase or private key.

## Install and begin

This update opens `https://pawket.world/home`. If you already have a guest
pet in 0.1.0, keep it on Solana using the old app before updating if you want
it on the new domain. Local storage and device keys belong to the old web
origin; updating does not copy them to the new one. Connect the same wallet
to recover pets on Solana, then link this app again. Install the update
without uninstalling or clearing the old app's data.

1. Install or update the release APK. Its package is `app.pawket.android`.
   The debug “Pawket dev” app is separate; use **Pawket** for this check.
2. Open the app. Adopt a fresh pet without a wallet, feed it, and reopen
   the app. Its name and care should persist. The screen should say
   **in this app**. Uninstalling or clearing storage removes guest pets.
3. Open Photo. Save it and find it in **Pictures/Pawket**. Share the photo
   to an app you choose. Cancel another share; Pawket should not claim that
   it was shared. Open a public Passport and test native link sharing too.

## Wallet, Pawket Wallet and care

Every action on Solana goes through a linked, funded Pawket Wallet; there
is no owner-wallet fallback. The wallet app approves setting it up and
anything that spends SOL; this app signs care and the rest with no prompt.

4. Set your supported wallet app to devnet with a little devnet SOL from
   faucet.solana.com (0.01 is enough), then connect from Pawket. Approve in
   the wallet and return. Connecting alone must not send anything.
5. Before linking, press "Keep on Solana" for the fresh pet and confirm:
   Pawket must say to link this app first, offer Pawket Wallet and send
   nothing.
6. In Pawket Wallet, pick the link length, daily limit and 0.01 SOL, then
   **Link this app**. Approve in the wallet and return; it should say
   **This app is linked**. If it says to update Android System WebView
   (no WebCrypto Ed25519), update it and repeat; record the exact message
   and WebView version. Until linking passes, nothing on Solana works in
   this app, so record this result first.
7. Keep the fresh pet on Solana. Read the level-reset explanation and
   confirm: no wallet prompt, then **on Solana** and a toast with the
   devnet Explorer receipt. Note the signature.
8. Perform an available care: no wallet prompt; its moment and haptic
   occur **after** confirmation. Note that receipt. Reopen the app and
   repeat an available care to check the key persisted.
9. Start a Market purchase and decline in the wallet: nothing is bought,
   the balance is unchanged and no success is claimed. Approve one if you
   like (devnet SOL). Rotate while that wallet request is open; Pawket must
   not reload or duplicate it.
10. Open the public Passport and check the confirmed care. Background the
    app, reopen it, and follow a shared `/pet/…` link. The same wallet's
    on-chain pets should return.
11. Unlink this app in Pawket Wallet (the app signs it). The next care
    must say to link this app first and send nothing. A linked app never
    offers a money transfer.

## Phone behavior

12. Feel one confirmed-care haptic, turn haptics off in Profile, and confirm
    that the setting sticks. Open a calendar reminder and inspect the event
    before deciding whether to save it. Pawket should request no calendar,
    gallery, camera or contacts permission.
13. Back should close the newest sheet/photo, then page history, then send
    the root app to the background. Resume should retain the room. Try all
    four playground games with touch; switch between 3D and Flat Room.
14. Check the keyboard, larger Android text size and light/dark rooms.
    Use TalkBack for adoption, care controls and the wallet sheet. Note any
    clipped controls, missing labels or gesture that reloads the page.
15. Try an offline cold open: Pawket should show its retry screen. Restore
    the connection and retry. For an unknown transaction outcome, inspect
    the existing Explorer receipt before sending a new action.

No mainnet purchase or trade is required. Before the funded-wallet rule of
8 October, the emulator verified sponsored care, owner-paid care, a
cosmetic purchase, a prepared keepsake and an owner-paid coin trade against
devnet; the browser suite has walked the funded-wallet paths since. Hardware checks establish the
consumer wallet and physical-device behavior that the emulator cannot prove.

## Result record

| Check | Result / signature / issue |
| --- | --- |
| Phone, Android, WebView, wallet versions | |
| Guest persistence and photo save/share | |
| MWA connect, Pawket Wallet link (WebView version), keep and confirmed care | |
| Passport, public link, background/relaunch/rotation | |
| Market decline, rotation, unlink and the link-first note | |
| Haptics, calendar editor and all games | |
| Larger text, keyboard, TalkBack and 3D/flat room | |
| Offline/retry and any unknown receipt | |

Update `ANDROID-HANDOFF.md` from these results. Keep any failure open,
reproduce it with the reported versions, fix the owning layer and rerun the
relevant checks before calling the physical release verified.
