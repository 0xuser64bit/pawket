# Your first days with Pawket

A luna cat, a moss pup or a cloud bun. A name. A little room to return to.
You can do the whole care-and-play loop without an account, wallet or token.

[Open Pawket](https://pawket.world/adopt) · [Project home](../README.md) ·
[All guides](README.md)

## Bring someone home

1. Choose **Adopt a pet**. Pick a species and a temperament: Curious, Cozy,
   Brave or Mischief. These stay with the pet.
2. Give them a name and choose a coat. Coats can change later.
3. Choose **Take them home**. Your new pet lives in this browser, or in this
   app if you are using Android.

You can adopt more than one. Switch the pet at Home or choose one from
**Profile → Pets**. The room shows one chosen companion at a time.

## Make a little daily ritual

At **Home**, check the mood and the four needs. Feed, Play, Brush and Rest
earn XP when saved. Each action has its own cooldown; using one does not
lock the others. Needs drift while you are away, but there is no death state.
The changing numbers are estimates between recorded cares.

**Today** shows the four cares and a playground round. Any care or a recorded
round can maintain the streak; completing the checklist has no extra reward.
The game counts UTC days, and the screen tells you when the next day starts
in your local time. You can always come back after missing a day.

- **Say** plays an emote; tap your pet for a boop.
- **Decor** changes the room's things. Most are free; some come with a Market room.
- **Photo** captures the room with a pose and frame when it is ready.
- **Look** changes your appearance; **Profile → Wardrobe** changes your pet's.
- **2D / 3D** chooses the room renderer. Flat art is also the fallback if the
  device cannot draw 3D. It does not change care or progression.
- The speaker controls room sound. **Profile → Settings** has the shared
  sound preference, haptics and other settings.

Keep a calendar reminder if that helps. Android also offers a care reminder
scheduled on the phone; browser play does not send push notifications.

## Play a round

Open **Playground** and choose a game:

| Game | The idea |
| --- | --- |
| Catch | Move under falling treats; avoid storm clouds. |
| Hop | Time your jumps over obstacles and gaps. |
| Copy | Repeat the growing pattern. |
| Pairs | Find the six matching pairs. |

The daily round uses the same seed for everyone playing that game that UTC
day. Practice starts a new round. The first finished, recorded round of the
day earns a flat XP bonus for the chosen pet—your score does not multiply it.
Best scores stay on the device. For a Solana pet, choose **Record the round**
to save completion; playing alone is not a transaction.

## Keep your local pets safe

**Local means local.** Another browser, the Android app and another domain
have separate storage. Clearing site/app data, uninstalling the app or
losing the device can remove local pets. Connecting a wallet does not back
them up.

Before moving or clearing anything:

1. Open **Profile → Pets → Keep a copy**.
2. Choose **Save a copy** in a browser, or **Copy as text** in either platform.
   Keep that file or text somewhere outside Pawket.
3. In the destination browser/app, open **Bring pets back** in the same panel.
   Choose a copy file or paste its text, then choose **Bring them back**.

Restored pets appear on the shelf. If the restore panel closes, reopen
**Bring pets back** to read which records were added, updated or already here.

The copy contains local pet records and their chosen coats—not a wallet,
private key, purchased closet, player look, room layout or game best scores.
Restoring merges pets and keeps the newer record rather than blindly
overwriting it. Keep your copy if an entry or coat could not be restored.
There is no server account from which support can recover lost local data.

## Choose Solana if you want to

Solana adds a public Passport, visits and guestbook waves, guild membership
and an optional keepsake card. Pawket defaults to **devnet**, a test network.
You do not need any of this to keep playing locally.

**Read the reset before confirming.** Keeping a local pet on Solana creates
a new program record with the same name, species and temperament. Local XP,
streaks and care history are not imported. The confirmation screen explains
this; do not use Solana as a backup of local progress.

1. Connect a supported Solana wallet. On Android, a wallet app answers through
   Mobile Wallet Adapter. Connecting alone sends nothing.
2. Open **Pawket Wallet** from the wallet chip, or follow Home's setup prompt.
   Link this device with the expiry and daily limit you approve.
3. If the screen says sponsorship is available, eligible devnet fees and rent
   are covered and Pawket Wallet can start empty. Otherwise the setup needs
   SOL for the device's fees, and actions that create accounts wait for sponsorship.
4. Choose **Keep on Solana**, read what starts fresh, and confirm. Wait for
   confirmation and the Explorer receipt before treating the record as saved.

Your wallet approves setup and all spending. The device key handles permitted
non-money actions within your limits; it cannot spend your Pawket Wallet balance.
Never give anyone your recovery phrase or private key, including support.

To find Solana pets on another device, connect the same owner wallet. Link
that device before using it for care. **A new link replaces the owner's old
device link**; the old device no longer has permission. Pet coats, room
decoration and your own look remain device-local, even for Solana pets.

## Meet other pets, without buying in

**Park** discovers pets whose records were read from Solana. Open a Passport
to see confirmed history, visit the room or leave a wave. Local pets are not
public Passports. **Guilds** offer membership, events and polls; a pet can
belong to one guild at a time. A guild coin is not a membership ticket.

The **Market** sells optional cosmetic pieces, rooms and photo frames at
fixed program prices, paid from Pawket Wallet with owner approval. A free
starter wardrobe and free room things are already available. Purchases
change appearance only and cannot be resold through Pawket.

Guild coins have their own page, terms and risks. They do not improve care,
progression or game scores and can lose all value. A keepsake is a frozen
card pointing to the pet's record, not a pet you can transfer or sell.

## When something does not work

| What you see | What to do |
| --- | --- |
| An empty Home on another device | Restore a local pet copy, or connect the wallet that owns the Solana pet. Browser pets do not sync automatically. |
| A storage error | Keep the page and your pet copy. Allow site storage or free space, then use the offered retry. Do not clear data as a first fix. |
| A 3D room that will not load | Switch to **2D**. Care and records are independent of the renderer. |
| A care still resting | Wait for that action's cooldown; the other actions have independent timers. |
| A missing or expired device link | Open Pawket Wallet and link again with your owner wallet. A different device may have replaced the link. |
| A phone wallet that does not answer | Open/install a compatible wallet app and return to Pawket. Use **Stop waiting** if offered, then retry after the visit ends. |
| An uncertain transaction | Keep its signature and check the Explorer receipt before another attempt. Uncertainty is not proof of failure. |
| Public pages cannot read Solana | Retry when RPC/network service recovers. Already-open local pets still work; there is no offline cold-start cache. |

For help, email [hi@pawket.world](mailto:hi@pawket.world) with the page,
browser or Android/WebView version, what you did and the visible error. A
public transaction signature helps with chain problems; a recovery phrase
never does. Read the [privacy policy](https://pawket.world/privacy) for what
stays on your device, what becomes public and the optional analytics setting.
