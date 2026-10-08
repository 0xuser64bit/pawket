# Pawket — submission video

A 2:50 film of Pawket for the Solana Mobile **Clock In** submission, as an editable
[Remotion](https://www.remotion.dev) project: the footage is the real Android app on Solana devnet,
and the motion graphics are drawn with Pawket's own design system, imported from `../src/components/pk`
(the paw mark, `PetArt`, the icon set) with the Daylight tokens and the app's three font files.

| Deliverable | Where |
| --- | --- |
| The film, captions burned in | `out/Pawket-Demo-1080p.mp4` |
| The film, no captions (for platforms that take a caption file) | `out/Pawket-Demo-1080p-no-captions.mp4` |
| Poster frame / thumbnail (1920×1080) | `out/thumbnail.png` |
| Captions | `script/captions.srt`, `script/captions.vtt` |
| Final script, shot list, accuracy notes, devnet receipts | `script/script.md` |
| Narration text and voice settings | `script/narration.json` |
| Storyboard (one frame per beat, from the final cut) | `script/storyboard.png` |

## Edit it

```bash
cd video
npm install
npm run studio          # preview and scrub in the browser
npm run render          # out/Pawket-Demo-1080p.mp4
npm run render:clean    # the same without captions
```

Loudness: the renders are normalised afterwards to −14 LUFS, −1 dBTP (`tools/master.sh`).

Where things live:

- `src/timeline.ts` — every time in seconds; `cue(line, word)` returns when a word is spoken, and
  the scenes cut on those words.
- `src/placements.json` — where each narration line starts.
- `src/scenes/` — Hook (0–12 s), Companion (12–52.4), Together (52.4–75.9: games, the household),
  Solana (75.9–108: keep the story), World (108–155: Market, guilds, Park, Pulse), Close (155–170).
  Each scene lists its shots: which recording, which second, how fast, where the camera looks. All
  shots play in one film-wide phone (`src/Pawket.tsx`); `dissolve()` in `src/components/Phone.tsx`
  turns every cut between two moments into a short eased dissolve.
- `src/elements.ts` — the app elements lifted out beside the phone, measured with
  `tools/measure.py` (`python3 tools/measure.py <clip> <second> <x0> <y0> <x1> <y1>`, a box in the empty
  page around the element): each is cropped just inside its own border, and the edit redraws that
  border, radius and shadow (`Lift`), so nothing from around it comes along.
- `src/components/` — the phone, lift-outs (`Lift` exact elements, `Float` borderless content,
  `Framed` sheet interiors), the dock replica, labels in the two registers (Playroom chips, Paper tags),
  the paw loader played by frame, captions, the soundtrack.
- `src/sfx.ts` — sound-effect cues.

## Narration

The voice is ElevenLabs **Jessica** (`script/narration.json`). To change a line, edit the JSON and
regenerate that line only — the key is read from the environment and never written anywhere:

```bash
ELEVENLABS_API_KEY=… node tools/narrate.mjs s3c-market
node tools/captions.mjs   # refresh the .srt and .vtt
```

Auditions of four voices on the same line are in `public/audio/auditions/` (Jessica, Sarah, Chris,
Will). To try another voice, change `voice.id` and regenerate all lines (about 1,800 characters).

## Music and sound

- `public/audio/score.wav` — an original cue made from scratch by `tools/score.py` (numpy), timed
  to the five parts. `python3 tools/score.py public/audio/score.wav` rebuilds it.
- `public/audio/sfx/` — short effects generated with ElevenLabs Sound Effects, peak-normalised.

## Footage

`footage/raw/` holds the original 1080×2400 screen recordings; `tools/proxies.sh` makes the 30 fps
proxies in `public/footage/` that the edit reads. `capture/` holds the scripts that drove the app for
each take (real touch input through `adb`, positions read from the WebView over DevTools):

1. Android 17 emulator (`pawket37`, Pixel 7 profile, 1440×3200, WebView 145 — WebView 134 cannot make
   the Pawket Wallet's Ed25519 device key), with the official Mobile Wallet Adapter test wallet.
2. This checkout built and served: `pnpm build && pnpm start -p 3000`, then `adb reverse tcp:3000 tcp:3000`.
3. The debug APK pointed at it: `./gradlew assembleDebug -PSOLANA_MOBILE_URL=http://localhost:3000/home`.
4. `node capture/a-adopt.mjs` and the rest, in order (a → z); `capture/fund.mjs` gives the test
   wallet devnet SOL from the devnet sponsor, as `e2e/devnet.ts` does. While filming, the driver
   (`capture/lib.mjs`) has the room draw at the app's own non-phone resolution (1.75×) instead of the
   1× a phone gets, by answering the room's one phone media query; nothing else in the page changes.
5. The two large room shots: `node capture/hq-look.mjs` dresses the player in a desktop browser
   profile, then `node capture/hq-room.mjs hq-hook "Wave@4,Cheer@9" 13` and
   `node capture/hq-room.mjs hq-close "Wave@1.5,Cheer@5.5,Dance@9.5" 19` film the same build's 3D room
   on Mango's public visit page with this Mac's GPU at 1953×850. Screenshots of the canvas come at about
   20 a second, so the page's clock runs three times slower while it is filmed and the frames are laid
   back onto page time at 30 fps.

Note: `capture/a-adopt.mjs` clears the app's storage, which also deletes the Pawket Wallet's device key
in the app. Re-filming adoption therefore means linking a device again (a new test-wallet account).

Every transaction in the film is real, on Solana devnet; `script/script.md` lists them with their
signatures. The one shot that is not the app is Solana Explorer, labelled as such.

## Licences and credits

- Narration by ElevenLabs (free plan; the end card credits ElevenLabs). Check the plan's terms for
  commercial use before using this cut in paid promotion.
- Remotion is free for individuals and companies of up to three people; larger teams need a company
  licence (remotion.dev/license).
- Fonts: Fraunces, Hanken Grotesk and DM Mono (SIL Open Font License), as in the app.
- Music: original.
