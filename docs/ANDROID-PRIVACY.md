# Pawket Android privacy policy draft

Ready for owner review. Before publishing, the owner must add the public
support contact and approve this text. This draft is not a published policy
or a completed legal declaration. It describes the source audited for the
Android release in `ANDROID-HANDOFF.md`.

## What Pawket keeps on this phone

Pawket stores guest pets, care history, the player name and appearance,
outfits, room choice and settings in the app's WebView storage. That storage
belongs to Pawket on this phone and is separate from Chrome. Clearing app
data or uninstalling removes it. Android backup excludes the WebView and
device-key storage, so a replacement phone starts with empty app storage.

Pawket also keeps the wallet adapter's authorization cache so a previously
connected wallet can reconnect. Disconnecting or clearing app data removes
that association.

If you link this app to a Pawket Wallet, the app generates a non-extractable
WebCrypto key in this app's IndexedDB. Pawket's code cannot read or export
its private key. Your wallet approves the link, expiry and daily action
limit. The device can perform only the actions the Pawket program allows
and cannot withdraw your wallet balance. You can revoke its link using
your owner wallet. Clearing app storage removes the local key, so unlink
and link again when replacing it.

## Wallets and public Solana records

Pawket never asks for a recovery phrase or the private key of your wallet.
The wallet app authorizes the connection and signs your transactions through
Mobile Wallet Adapter. Public wallet addresses are used to read your pets,
closet, guilds and Pawket Wallet history and to build requested transactions.

If you keep a pet or perform another action on Solana, its account data,
name, care history, wallet addresses and transaction signatures are public
on the network. Other people and explorers can read them. Clearing app
storage does not remove public blockchain records. This release uses
devnet, a test network whose records and availability may change.

## Network requests and service providers

Pawket loads its pages from `pawket.world`. Earlier app releases use
`pawket-pets.vercel.app`, which remains available. Device-local records and
keys are scoped to each origin and are not copied between them. Pawket's
server receives
requests needed to load the app, read Solana, prepare requested transactions
and provide sponsorship. Those requests can include public wallet addresses,
pet identifiers, requested actions and transaction messages or signatures.
Solana RPC providers receive the network reads and transaction broadcasts.
Optional guild coin operations use Pawket's server and Meteora's protocols.

The hosting and network providers may process connection information such
as IP addresses, request metadata and operational logs under their own
policies. The app source reviewed for this release includes no advertising
or dedicated analytics SDK. This statement does not promise that hosting
providers keep no logs. The owner must confirm the host's configured log
retention and any additional services before publication.

## Photos, sharing and reminders

Room photos are generated in the app. Saving writes a PNG to
`Pictures/Pawket` through Android MediaStore. Sharing writes a temporary
PNG to app cache and gives the app you choose a read-only content URI.
Pawket does not upload those photos through its photo feature. The chosen
recipient or sharing app has its own privacy policy.

Link sharing opens Android's share sheet for the selected public Pawket
page. A reminder opens the calendar app with a suggested event. You decide
whether to save it there. Pawket does not read your calendar, contacts,
location, camera or microphone, and requests no permissions for them.
Its only Android capability permission is INTERNET. AndroidX adds an
app-private signature permission for an internal receiver, which gives no
access to phone data and requires no user permission prompt. Haptics follow
Android's touch-feedback setting and can also be turned off in Pawket.

## Your choices and deletion

Start with a guest pet without connecting a wallet. Choose whether to keep
it on Solana, sign each owner-wallet action, enable haptics, share a photo
or save a calendar reminder. Disconnect your wallet in Pawket when needed.
You can remove local app data through Android settings and remove saved
photos from your gallery. Revoke a linked device before disposing of a
phone. Public records already written to Solana remain on the network.

## Contact

Publication requires an owner-supplied public support/privacy contact here.
Do not publish this draft with an unresolved contact or make unsupported
claims about legal compliance or eligibility for particular ages or regions.
