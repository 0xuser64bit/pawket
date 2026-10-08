# Pawket — submission video (Clock In)

**Runtime:** 2:50 (170 s, hard cap 3:00) · **Format:** 1920×1080, 30 fps, H.264 + AAC
**Story:** your companion → your daily life together → a story you can keep (on Solana) → the world
around you. Keeping the story on Solana comes before the Market and guilds, because those spend from or
sign with the Pawket Wallet that step sets up.
**Footage:** 60 % real Android app footage, 40 % motion graphics built from Pawket's own design system
(tokens, Fraunces / Hanken Grotesk / DM Mono, the paw mark, `PetArt`, the icon set — imported from
`src/components/pk/`, not redrawn).
**Edit:** one phone for the whole film; every cut between two moments is a 0.32 s eased dissolve.
Elements shown beside the phone are lifted out exactly along their own edges (measured with
`tools/measure.py`), with their own border, radius and shadow redrawn and nothing from around them.
**3D quality:** the Android takes draw the room at 1.75× (the app's own non-phone resolution, instead of
1× on phones), and the two large hero shots of the room (the opening and the close) are the same web
build's `Room3D` drawn by a desktop GPU at 1953×850 on Mango's public visit page (`capture/hq-room.mjs`).

Narration: 337 words, ElevenLabs voice **Jessica** (`eleven_multilingual_v2`, stability 0.5, similarity
0.78, style 0.15, speed 0.95). Every line was transcribed back with ElevenLabs Scribe and matched the
script word for word (only "Pawket" heard as its homophone "pocket", and "sign-up" written "sign up").

---

## The script, with what is on screen

Times are where each line starts in the edit (`src/placements.json`); word-level timing comes from the
ElevenLabs alignment and drives the cuts and captions.

### 0:00 — The hook (0–12 s)

| Time | Narration | On screen |
| --- | --- | --- |
| 0:00 | — | The Pawket paw draws itself (the app's own loader, played by frame): toe beans pop, the heart lands, two heartbeats. |
| 0:01.7 | *Meet Mango. Mango notices when you're gone, and lights up when you come back.* | The 3D room at full quality, as a wide window: Mango faces us; on "lights up" the player waves and Mango hops (on Solana, wearing the Halo, the player in a beanie and round glasses — a flash-forward). |
| 0:07.9 | *Every day you show up becomes part of a story you get to keep.* | The window settles into the phone, exactly where the room sits on Home. **Pawket — A living companion.** Chips: Android app · Solana devnet. |

### 0:12 — Your companion (12–52 s)

| Time | Narration | On screen (Android app) | Graphics |
| --- | --- | --- | --- |
| 0:12.8 | *It starts in three taps. Choose a friend, give them a name, pick their temperament. No wallet, no sign-up.* | Adoption: the three species row, Luna cat chosen, "Mango" stitched on the blanket as it is typed, Curious, "Mango is yours." | "Adopt in three taps" with a 1·2·3 counter that fills on each real tap; chips No wallet · No sign-up; *Their first page* (Kept: In this app) lifted out exactly. |
| 0:25.9 | *Then it's the two of you, in a room you share.* | Home: the player and Mango together in the 3D room. | "The two of you, at home". |
| 0:29.3 | *Feed, play, brush, rest.* | Cut on each word: the bowl, the ball, the Brush button pressed with its "care saved" toast (the brushing animation is left out), the cushion. | The deck's four round care buttons pop in, each with a +10 XP tag. |
| 0:34.1 | *Needs fall while you're away, and Mango's face tells you what's missing.* | The deck's vitals. | Four Mango faces from the app's `PetArt` — hungry, tired, scruffy, lonely — with vitals running down. |
| 0:40.3 | *Every care earns XP and ticks off today's round.* | Today's round: 4 / 5. | Chips +10 XP a care · Today's round; the real tracker floating beside the phone. |
| 0:44.3 | *Say hello, share a dance,* | Say: Wave, Dance (emotes play in the room). | "Emotes are for the two of you. They change nothing on the record." |
| 0:46.1 | *then snap a photo of your room and send it from your phone.* | Photo print → **Android share sheet** → "Saved to your gallery, in Pictures › Pawket." | Chips: A photo of your room · Android share sheet · Saved to your gallery. |

### 0:52 — Your daily life together (52–76 s)

A replica of the app's dock sits top right; its lit pill slides from Play to Profile on the design
system's spring, as the real dock does. Everything here works in the app, before anything is on Solana.

| Time | Narration | On screen | Graphics |
| --- | --- | --- | --- |
| 0:52.8 | *When you both need a break, there are four quick games, and each day brings one round that everyone shares.* | Playground list; Hop played as today's round to "74 points · +25 XP for playing today"; Pairs finished. | Catch, Hop, Copy and Pairs playing at once (windows inside each game's own field); chips: Today's round: the same for everyone · +25 XP, once a day; the finished round's card lifted out. |
| 1:03.0 | *Your profile is your household. Keep as many pets as you like, choose who's at home, dress up and save outfits, and watch stickers fill in as you care.* | Profile ("Ari"); three pets on Home and switching who is at home; a beanie and round glasses on the 3D player, seen on the stage; the sticker book. | Mango, Pretzel and Pebble drawn by `PetArt` (Mango "At home"); chips Your look, in 3D · Three outfits; the sticker cards floating beside the phone ("Stickers are earned by care. Never bought."). |

### 1:16 — A story you can keep (76–108 s)

The ground turns to Paper (hairline grid, mono, square corners) — the register the app itself uses
for anything that states a fact or costs money.

| Time | Narration | On screen | Graphics |
| --- | --- | --- | --- |
| 1:16.8 | *When you're ready, keep Mango's story on Solana.* | The Keep on Solana sheet. | The sheet's words: "A record nobody can edit or erase… Pawket pays the fee." |
| 1:19.8 | *Your wallet app approves once. That opens a Pawket Wallet with a little devnet SOL, and links this phone.* | Setup (30 days, 0.25 SOL; "What this approval does"), the **Fake Wallet app** (official MWA test wallet) signing, then "This app — Linked". | One-approval diagram: Your wallet app (Mobile Wallet Adapter) → Pawket Wallet, 0.25 devnet SOL → This phone's key, made here, never exported. Paper: "Shown: the official MWA test wallet, on devnet." |
| 1:29.0 | *From then on, care is signed right here, with no pop-ups, and each moment plays only after Solana confirms it.* | Keep on Solana → "Waiting for Solana to confirm it" → "Recorded on Solana, no pop-up"; Play → "Waiting" → recorded → only then the ball is thrown. | The toast lifted out; below it, Mango's Play on Solana Explorer (Success, finalized; fee paid by Pawket's sponsor). |
| 1:36.5 | *Mango's Passport is public. Visitors can wave once a day, and Mango's keepsake card sits in your wallet.* | The public Passport; a wave at Marmalade (this phone signs); Keep the card → the wallet app approves → recorded. | pawket.world/pet/Byaf…X5kY; Visitors wave, once a day; the card itself (from its metadata) flipping in: Metaplex Core · Frozen, cannot be sold or sent · Rent and fee paid by Pawket. |
| 1:44.5 | — | The Pawket Wallet's history, read from Solana. | The history card lifted out: the halo put on, a Market item bought, a wave, the keepsake card — each "fee paid by Pawket". |

### 1:48 — The world around you (108–155 s)

The dock's pill moves Market → Guilds → Park.

| Time | Narration | On screen | Graphics |
| --- | --- | --- | --- |
| 1:48.4 | *Want a new look? The Market has hats and halos, whole rooms, and photo frames. It's all cosmetic. Nothing you buy changes care, XP or a score.* | Market shelves (pieces, foil, rooms, frames); the Halo's Paper sheet. | "Looks, never power" (the Market's own words); 25 pieces · 12 rooms · 8 photo frames; the sheet's Paper: price, paid from Pawket Wallet, to Pawket's treasury, "it changes no vital, XP, cooldown or score." |
| 2:01.0 | *This phone can care for your pets, but it can never move money. Spending always asks your wallet first.* | Buy for 0.05 SOL → the wallet app asks (Fake Wallet: Authorize) → "Buy the halo — Recorded on Solana" → "In your closet". | Two lanes — This phone signs, no pop-up: Care · Rounds · Looks · Guilds · Gatherings · Waves / Your wallet approves: Market · Guild coins · Put in · Take out; "This phone's key can never move the balance." |
| 2:08.9 | *Want company? Guilds are optional, and free to join. Plan a meetup, RSVP, check in, and vote in a poll. A guild's optional coin never touches a pet.* | Guilds list; Window Seat; planning "Sunset nap" → recorded; Going with Mango; the event card ("1 going · 1 came · Mango came"); a vote → recorded; Cloud Nine's coin line. | Optional · Free to join, free to leave; the event and poll cards lifted out; "Polls take one vote per wallet, with no weight."; Paper: On Meteora, devnet — test tokens, no value · What it changes — never a pet. |
| 2:23.6 | *Step outside, and the Park shows every pet kept on Solana, read live. Pulse counts it all, straight from the program.* | The Park (Mango in front, out today; "Mango was brushed / played / fed"); Pulse. | The Park's counts and Pulse's card lifted out; Paper: Solana devnet — counts include Pawket's own test runs. |

### 2:35 — The close (155–170 s)

| Time | Narration | On screen |
| --- | --- | --- |
| 2:35.8 | *Show up for Mango, and Mango shows up for you. One care at a time, it becomes a story that's yours to keep.* | Back in the room at full quality: the player waves on "Show up for Mango", cheers on "One care at a time". |
| 2:43.3 | *Pawket. A living companion.* | The player and Mango dance side by side through the end card; the paw draws itself again; **Pawket — A living companion** · Android app · Solana devnet · pawket.world. |

---

## Sound

- **Music:** an original cue made from scratch for this cut (`tools/score.py`): a music-box hook,
  plucked strings and a light shaker while you meet Mango, a fuller groove for the games and the world,
  a quiet pad and arpeggio under the Solana part, and the hook returning to land on C at the end. No samples, nothing
  licensed. It ducks about 8 dB under the voice.
- **Sound effects (ElevenLabs):** pops as the paw's beans appear, a soft heartbeat, whooshes on
  transitions, a chime on every "Recorded on Solana" (placed on the frame each toast appears), a
  sparkle for XP and the title, a paper slide when the register turns to Paper, a card flip for the
  keepsake.

## Accuracy notes (every claim, checked against the app)

- *Three taps, no wallet, no sign-up* — adoption is species → name and temperament → take them home;
  "Their first page" says Kept: In this app.
- *Needs fall… face tells you* — decay per hour and need faces (`GAME-DESIGN.md`, `petLook`).
- *+10 XP a care; +25 XP for the day's round, once a day; same round for everyone* — `constants.ts`,
  `dailySeed`; the finish card says "+25 XP for playing today."
- *Emotes change nothing* — the Say panel's own words.
- *25 pieces, 12 rooms, 8 frames; looks only* — `MARKETPLACE.md`; the Halo sheet's own text.
- *Guilds optional, free to join; RSVP, check in, one vote per wallet; a coin never touches a pet* —
  the guild pages' own text and `GUILDS.md`; the coin page says devnet test tokens have no value.
- *One approval opens the wallet, puts SOL in and links this phone* — the setup screen's own text, and
  on chain one transaction: `OpenWallet, Deposit, LinkDevice`.
- *Signed right here, no pop-ups* — those actions were `…ByDevice` instructions signed by this
  phone's key (see receipts); the toast says "Recorded on Solana, no pop-up".
- *Each moment plays only after Solana confirms it* — `docs/SOLANA.md`; visible in the footage
  (waiting → recorded → moment).
- *Spending always asks your wallet first* — `BuyWithWallet` and the keepsake's `CreateV2` were
  approved in the wallet app on camera.
- *Pawket pays the fee* — fee payer on every app transaction is the sponsor `HoayY…bLPuS`.
- Counts on Park and Pulse are shown as read; the video does not restate them, and it labels them
  devnet, including Pawket's own test runs.

## Disclosure (for the submission text — removed from the end card at the owner's request)

Recorded in the Pawket Android app — a debug build of `android/` (`app.pawket.android.debug`) pointed at
this checkout's production build served on `localhost:3000` through `adb reverse` — on an Android 17
emulator (Pixel 7 profile, WebView 145), with the room drawn at 1.75× for filming. The two large shots
of the room in the opening and the close are the same build's 3D room on a desktop GPU (Mango's public
visit page). The emulator's earlier image had WebView 134, which cannot
create the Pawket Wallet's Ed25519 device key, so a current image was used. Wallet approvals are the
official Mobile Wallet Adapter test wallet ("Fake Wallet app"). Every transaction shown is real, on
Solana devnet. One shot is not the app: Solana Explorer (a public page, read in a desktop browser at
phone size), labelled as Explorer.

## Receipts (Solana devnet, all succeeded)

### The Solana segment, the opening and the close (second test wallet, filmed 9 Oct 2026 21:31–21:42 UTC)

| UTC | Instruction | Signature |
| --- | --- | --- |
| 21:31:25 | Transfer — devnet SOL for the test wallet, from Pawket's devnet sponsor (as the e2e specs do) | `55pKrwK4RV7hLDn8gUP3Znp439vwu4Znd7dpdvAdVsi9uc4YiE13tcVyRe6ecZAsyE4Cap3p42wTq4wfLX2visfE` |
| 21:32:28 | OpenWallet, Deposit, LinkDevice — **the one approval on screen** | `3aSpcsKxJnqgfq7gBT3X4iiFvDKwowhfFLC8q4jENEk5xh93UfKoAeJSFh8Y3oAG1s57yUUkCadVCPapVnerDexL` |
| 21:35:10 | AdoptPetByDevice — Mango kept on Solana | `62xEx3VbSv2SQHAkbZeSKVyHttRQCWDzVY6zLzXrHFxMdpcVmS5xFwSB2fz1Hz1xhiBc6UBD2i9jMFwBtAa5hEQa` |
| 21:35:20 | CareByDevice — Feed | `2pt5H8X9qFSipgeMKcr2D1SXzGhR7quB8s3fh9241z2owaFYwqFEtuNjVokXzTAVu79b5hZ2Q7FnTZagNHdPbBJG` |
| 21:36:01 | CareByDevice — Play (the Explorer shot) | `5wUk44gi1uBqKYsMJLMaZWJUa3mAo16tiG1idTYpk6hYDyyX6eBqayJ3BYjtSTCTwayTubc2rKUbKFRFXDYd9fNC` |
| 21:36:15 | CareByDevice — Rest | `576HMU1AT6R2vD7Lz9TUb5BagxJUGCJXoia1YU7QJEh8kTsCAdDhNMqsYzpy6HFTXKCSvuqRMxDzX9GGMXWPWfr9` |
| 21:37:40 | CreateV2 — Mango's keepsake card (Metaplex Core), approved in the wallet app | `3hZ1891JQQr724iTxLyoFtwuut4qKbefhecVc5zWBkmvXoYNshSKPpsgUyBeEEZ4zvizALiZFy3zT3f11UDEr9KT` |
| 21:38:38 | WaveByDevice — a wave at Marmalade | `rULmn7hGq31zB377qm64E6q4G393B7ZuTW522QFozQxeRREDmxog99sLYGbgL7jtAn6jpJTQxFPuZxMoEVzjvWZ` |
| 21:39:25 | BuyWithWallet — the Halo, 0.05 devnet SOL to Pawket's treasury, approved in the wallet app | `3s5vn3vzDAYAGrqMXmvVQWMxfV7eTL2j3PK23Ce1a3c82S5R2r2kCsoRwE29v8AGK3mc6MmHCrDa3XeHMeM2oDiM` |
| 21:42:15 | DressOwnedByDevice — Mango puts the Halo on | `4RPnmq4kta7YhYVbqr1McLRFbJ5chZnwJtqovf6diKsfmjdAHrXxEWJgJNie4dPvxqFUEgrfMukUTCWZza2WEhdC` |

Accounts: test wallet `5kRdAHE9n2hcR8X11t88x8e2zGPFzPVfA2pmxLMyL3qd`, its Pawket Wallet
`3ZjStycVpP11dQHP8GTMBhnVBDj8n73SbpABncyRuqmT`, Mango `Byafa9FMvFCxATP98EDeiVsw77ktK9y2qZSb3uGKX5kY`
(this Mango's visit page is also where the opening and closing room shots were drawn).

### The guild beat (first test wallet, filmed 9 Oct 2026 16:44–16:57 UTC)

The guild footage (Window Seat, its event and polls) was filmed with the first test wallet's Mango
(`EFr1cav8mmyWoxUS5Ynafjfmg3n9PvmS13YB4cwFyCCY`, owner `3S6R1A7Gwjyq8UDo1k6KkJraAKtAhGXBHJ5RGAwshjEs`):
same name, species and temperament, a different pet account. The first wallet's device key was cleared
with the app's storage when adoption was re-filmed, which is why the Solana segment uses a second wallet.

| UTC | Instruction | Signature |
| --- | --- | --- |
| 16:44:23 | FoundGuildByDevice — Window Seat | `58QqiWydAR9VFcKuA4RrVDTxhjgE4tHkDK4YAApQiRGdJuFcFtErocFckNtW3A4QxAfYM4RTFk4WFPbArqiMe9SK` |
| 16:45:22 | CreateEventByDevice — Sunset nap | `2xqbAVkHmFu9w1ucRBnfqKdgCtAXzY1SHuC6piS9D2eyV7EpVCAacUem9MAZXAZJrhgdKLCR4ZR6JGSYFT5DVDFG` |
| 16:45:31 | RsvpByDevice | `4WPuVytp5qvrBrGPwVot2jWzHnTSWY799FMVUZTycVgNaqNLJimMtcjnCwwhN2ekboVH5Bo9QmMSNzLZDx1SBPY9` |
| 16:47:39 | CheckInByDevice | `3eJTsciLriUj2Q7V5EL5GoFXpAScTzuNEtFY6PWiAMqKQjeK3fGu6AeCsbe4kFTF1NVRxPV65osEJvNR5XTb8pBj` |
| 16:48:04 | CreatePollByDevice — "Which window next?" | `z4WBAvRPcYMteDMz7Tu5U3wakggLdsH5z6XXGmvwreLdN8a75W7mnjZZ9R3yf5nANXcAXtE9zL6seWBun3rpVKR` |
| 16:48:15 | VoteByDevice — Kitchen | `6nW8sdD7zfR8R24rGRjwC2Ev8XYga1hm8DjY3e7gtDwZJFLLaeSZvA2xd4AFuKUPy5tsodUno2wg1SyL2B7sjDq` |
| 16:56:59 | CreatePollByDevice — "Snack after the nap?" | `5VhY1jo5YiF2rnSbREatMNxrFLSVhzfQGfnKpPnDrajaGmUH3HBpA8994A7uM4UKh8CJhADJwCKp5v9oQobebnJ1` |
| 16:57:11 | VoteByDevice — Fish | `4TKN6VcWt1MTa1ZNti6mZYWTdnwZzTeHkdYrgFgERAUMWtYjVbjV4XmHMMDGadjxEhKLFniW2HgCzgU774RVA912` |

Earlier takes with the first wallet that are not in this cut (all succeeded): the first wallet setup,
keep, cares, keepsake, wave, purchase and Halo, between 16:15 and 16:42 UTC, plus a Play and a Rest
re-filmed at 1.75× before the storage was cleared (`5DLT8kw4…bQUyh2`, `4iZExZEJ…V1ZDNV`). They are on
the first Mango's and the first wallet's histories on Explorer.
