# Pawket — Design

The product is built from the **Pawket design system**. This file says where
each part of it lives in this repo and which rules are load-bearing. When the
system and this file disagree, the system wins; when this file and the code
disagree, fix one of them in the same change.

## Where it lives

| Thing | File |
| --- | --- |
| Tokens (Daylight + Lamplight), type scale, component CSS | `app/globals.css` |
| The three families, loaded locally | `src/config/fonts.ts` + `src/fonts/` |
| Components, as React | `src/components/pk/` |
| Species → artwork, sky and words | `src/lib/game/appearance.ts` |
| Companion record | `src/lib/guest/` |
| Wearables | `src/lib/closet/catalog.ts` (drawn in 3D by `src/components/room3d/wearables.ts`) |
| The room in 3D, the player's look | `src/components/room3d/`, `src/lib/player/`, `docs/ROOM-3D.md` |

Everything visual is a token. There are no raw colours, radii or spacing
values in components — if a value is missing, add a token, do not inline one.

## The two registers

Everything is drawn in one of two registers.

- **Playroom** is the game: `ground` and `surface`, radii from `radius-md` up,
  a 2px `edge` outline on everything, `shadow-sticker` for depth, the text
  family for words and hue for meaning.
- **Paper** is anything that costs money or states a fact: `paper` and
  `paper-sunk`, `radius-paper`, `stroke-hair` `rule` borders, the mono family,
  and almost no colour.

Two rules hold the system together:

- **A call to action never wears Paper.** On a Paper surface use `Button` with
  `tone="paper"` — square, hairline, mono, no shelf. Cancel and Confirm look
  alike on purpose.
- **A number that costs money never wears Playroom.** Prices, balances,
  quotes, allocations, treasury lines and signatures are set in `amount`,
  `amount-sm` or `receipt` on a `paper` ground, wherever they appear.

A player crossing from playing into paying sees the corner radius fall from
20px to 4px, the type go mono, the colour drain out and the buttons stop
leaning on them. That change is the warning; the copy only confirms it.

## Colour

Five hues, each with one job. Never use a hue for its mood.

- `sun` — act. At most one `sun` fill per screen region.
- `sprout` — grow. XP, levels, care streaks. Never a status, never a price,
  never a token surface.
- `pool` — people and settled things. This is the success colour, chosen off
  the red–green axis so it never depends on hue to be told from `alarm`.
- `bloom` — the guild layer and nothing else.
- `alarm` — risk, failure and stop. Never decorative, never a quantity.

A filled control outlines in its own `on-` colour, not in `edge`. The focus
ring is two bands. Status never rests on hue alone. **No green on a token
surface, ever.**

## Rooms (themes)

A player can live in one of eight rooms: Daylight and Lamplight (the
device decides between them unless the player picks), Strawberry, Honey,
Matcha, Seaside, Lavender and Starlight. Each is a complete token block in
`app/globals.css` (`:root[data-theme="…"]`) that also applies to any
element marked `data-theme-preview`, so the shell's room switch and the
picker in Profile draw each room in its own tokens — a preview can never
disagree with the room it opens. Every hue keeps its job in every room;
only the grounds, surfaces, ink and tints move. `themes.test.ts` holds each
room to the accessibility floor below. The 3D wall takes the pet's sky in
the picked room; an evening room (Lamplight, Starlight) lights the lantern.

## Type

`display` (Fraunces) is the game's voice, `text` (Hanken Grotesk) is everything
you read, `mono` (DM Mono) is anything verifiable. `display-hero` is used once,
on the landing page. A figure in a sentence still takes `amount-sm`, and units
are a separate `ink-faint` suffix.

## The mark

A paw print, because Pawket is named for paws. Four toe beans arch over a
centre pad, and the centre pad is a heart — the print a pet leaves, and the
care it was left for, drawn once. One drawing (`PAW` in
`src/components/pk/art.tsx`) is the mark, the favicon, the home-screen icon
and the loader.

- **Built, not traced.** Each bean is an egg, broader at its tip, leaning
  toward one point below the pad, and every gap — bean to bean, bean to
  heart — is the same. The heart is two circles meeting at a rounded tip,
  plump because a pad is soft.
- **The fill is the shape.** The `on-sun` keyline sits outside each shape,
  so Lamplight, which swallows it, shows the same paw Daylight does. The
  keyline is sized in pixels, so it stays near the system's stroke weights
  at every size instead of thickening with the drawing.
- **Drawn large, it is built like a button.** Below 40px it is two inks,
  which a 16px tab can hold. From 40px each shape stands on a `sun-edge`
  shelf — the face and shelf of a `sun` button — and from 56px each catches
  a `pet-shine` highlight, all lit from the upper right, as a pet's eyes are.

The wordmark beside it is Fraunces at 600 with `SOFT 64` and `WONK 1`. The
mark never takes a gradient, a glow or a blur, and never sits inside another
shape; the home-screen icon's `sun-soft` square is the one exception, since a
home screen asks for a square. Check it at 16, 24, 40 and 96px in both rooms
before changing any of it.

(It replaced a pocket with pads above it in 2026-10: the name was always the
paw, and a pocket read as a wallet. It was redrawn the same month so that it
is one shape in both rooms.)

## Motion

A pressable control moves on `cubic-bezier(.2,.9,.3,1)` at 90ms (`--ease-press`,
`--dur-press`); the shelf is what makes it read as an object, and pressing it
moves the face, never the page. A card or guild row that is a link lifts 1px
onto `shadow-sticker-lift` under a pointer and presses flat under a finger.
Hover exists only where a pointer can hover. A sheet rises over 220ms
(`--dur-sheet`); it is a modal in behaviour too — focus moves in, the page
behind goes inert, and Escape or the dimmed room leave the way Cancel does. Nothing animates on
a Paper surface: a quote does not count up and a launch meter does not fill on
load. All of it stops under `prefers-reduced-motion`.

**Two loops exist, and no more.**

1. **The breath.** A pet scales `1 → 1.035 × 0.975 → 1` over 3.6s from a
   `50% 100%` origin, so it settles on its feet. Its blink (every 4.6s) and
   the sway of its tail ride on the same life, offset per pet by its name so
   a park full of pets is not in step.
2. **The paw loader** (`PawLoader`): the mark, alive. Nothing shows for
   250ms, so a quick wait never flashes it. Then it draws itself — the toe
   beans pop out left to right, 70ms apart, and the heart lands last — and
   from 1s the toes tap the same way: each lifts, presses into its shelf on
   the press curve and springs back, 110ms after the one before, and 200ms
   after the fourth the heart answers with a full press and a half one —
   lub, dub. Then stillness, and again every 2s. It is the button's press,
   played on the paw. Under `prefers-reduced-motion` the paw is simply
   there, whole.

A third is fenced the same way: **the 3D room's life** on Home. The player
breathes and blinks, the pet breathes, wanders and naps, the camera drifts a
degree. It is the breath, grown into a place — Playroom only, only in the
room, and under `prefers-reduced-motion` all of it stops: the room renders
on demand and a moment is shown as one held still.

The loader is an amendment to the system's original "nothing else loops" rule,
made deliberately and fenced just as deliberately:

- **Playroom only, for a wait with no known end.** Cold boot, matchmaking.
- **Never on Paper.** Nothing animates there, and a playful cycle while money
  moves is exactly the wrong feeling. A pending transaction keeps its Paper
  treatment — a neutral `wait` banner and a countable `Meter`.
- **Never as a route-change skeleton.** `app/loading.tsx` is the root fallback
  and carries the loader, its name arriving once the heart has landed;
  `app/(game)/loading.tsx` holds still, because a loop flashing on every
  navigation is the shimmering-skeleton problem in a nicer costume.
- **A paw, not a pet.** The pet is the product's hero image, and a loader
  is not the place to spend it. A paw is a fragment, so it reads as waiting.

## Layout

Screens are designed at 390px with `space-5` gutters, and the same product is
composed on purpose at three widths — the same three everywhere, set in the
scaffolding block of `app/globals.css`:

| Width | Shell | Screen |
| --- | --- | --- |
| phone, < 720px | Dock spans the column; only the lit slot is named (none below 360px) | one column, full width |
| tablet, 720–1023px | Dock centred, every slot named | one column, at most 680px, so a room or a pocket keeps its proportions |
| desktop, >= 1024px | Dock centred, every slot named | a place spreads to 1120px and composes in `Columns`; a flow that asks for one decision uses `Screen width="narrow"` (640px) |

The Dock floats 14px above the foot of the view at every width — over the
page while it scrolls, simply at the bottom when there is nothing to scroll —
and the shell bar above the screen scrolls away. Every game screen leaves
96px of clearance at its foot plus the safe-area inset, and focus scrolls
clear of the Dock. `Columns` puts the thing and what you can do to it side
by side on a desktop and one above the other anywhere narrower, in that
order. The landing page is its own width (`.pk-band`, 1200px, 72px gutters
on a desktop, bands at `space-9`).

The vertical order on every game screen is the same: the thing itself, then
what you can do to it, then anything that explains it.

## The room in 3D

Home's room is drawn in 3D where a device can draw it (`docs/ROOM-3D.md`).
It is the flat room's language in three dimensions, not a model viewer:

- **Flat colour, ink outline.** Toon shading on three steps and a
  fixed-width inverted-hull outline in the theme's `edge`. No shadow maps:
  a hard-edged contact shadow under each character. No tone mapping, so a
  token lands as itself.
- **Materials are things.** A pool-blue shirt is the same shirt after dark,
  so materials take the Daylight token values (`room3d/palette.ts`, locked
  to `:root` by a test) and the light changes. Lamplight is the same room
  after dark: the sky token swaps, the lantern lights, the ink turns light,
  and nothing moves.
- **The pet's sky is the wall.** `sun-soft`, `pool-soft` or `surface-sunk`,
  the species' `SPECIES_SKY` — never bloom behind a pet.
- **The pet is its PetArt.** Each species wears the coat and patch the flat
  art draws, on Kenney's cube animals — the bun cloud white, the pup with
  cocoa ears.
- **The player is the one likeness in Pawket.** In the flat room the player
  stays a peg doll — a wooden-cream face, dot eyes, a blush and a beanie,
  no skin tone — wearing the top colour chosen for the 3D room, and the same
  hat and glasses. In the 3D room the player is a person the player dressed — build,
  skin tone, hair, clothes — in the palette's hues; bloom and alarm are not
  offered.
- **Nothing floats over the animal.** The deck floats over the frame's foot —
  the floor — and emotes, the look, the room switch and every failure note
  live below it. The frame keeps its
  `radius-room`, its 2px `edge` and its sticker shadow.
- **The room says what it is doing.** A moment's sentence is read out in a
  status line; the frame names who is in it and how to turn it.

## The flat room

Wherever 3D cannot draw (or the player prefers it), Home is a flat drawing
of the same room (`src/components/home/flat-room.tsx`): a curtained window
with the day in it — the sun in Daylight, the moon and stars in Lamplight
(`--pk-day` / `--pk-night`) — a lamp whose light falls on the floor after
dark, a high shelf clear of the pet's ears, a wood floor and a rug. The pet
sits in a woven basket, one unit with it, so the basket always tucks the
pet in and no drawing ever shows a cut-off body. The scene slices to any
width; the player and the pet are sized from the room's height.

## The places, drawn

Every place a pet appears is a drawn place, in the pets' own style — flat
shapes, one outline, the palette — never a grid of identical pockets:

- **Adoption** (`src/components/adopt/`). The three species sit large and
  alive; their eyes follow the pointer (`useEyesFollow`); the chosen one
  lifts into a `sun` ring and hops. On a phone they are a row you swipe,
  and the one you land on is chosen. Naming stitches the name on the pet's
  blanket as it is typed, and each temperament is shown as the face it
  makes. The welcome is the pet radiant beside its first page, on Paper.
- **The park** (`src/components/park/park-scene.tsx`). Hills, trees, a
  bench, a path, the sun or the moon; the pets out today (then the most
  cared for) stand on the lawn as figurines, front row by care, depth by
  scale, each wandering a few steps at a pace from its address. Name tags
  are `pool` when out today. Server-rendered, CSS motion only.
- **The playground** (`src/components/play/`). Catch is a garden, Hop is
  the park path with drifting hills, Copy is one giant paw whose toe beans
  are the buttons and whose centre pad holds the pet. The pet is drawn
  whole (`pose="full"`) and its face answers the game. Sky clouds have no
  outline, so they never read as the storm clouds to dodge.
- **Home** (`src/components/home/`). The room across the whole width and a
  deck floating on its foot: the level as a ring of ten segments, the four
  vitals minimized to a glyph, five segments and a count, the four cares as
  round buttons on a shelf (the one the pet wants in sun), and the tools.
  Faces in the bar say who is home. Photo prints the room on the room's own
  paper.
- **The profile** (`src/components/profile/`). The same stage with a plate
  on its foot (the player's name and what they have done together,
  counted), the look editor always open, then the shelf: pets, the
  wardrobe, the sticker book (a sticker is a tilted disc in its hue's soft
  tint; one not yet earned is a dashed outline), and settings.
- **The wardrobe**. A mirror: any of the player's pets large, trying on
  whatever the pointer or focus rests on before a tap wears it. A piece not
  yet earned is a dashed tile that says which sticker earns it.
- **Pairs**. Twelve cards on the table, the paw on their backs and the
  wardrobe on their faces, turning over in 3D on the press curve.
- **Guilds** (`src/components/guilds/`). A crest is square-shouldered and in
  its guild's colour (bloom unless it chose another hue), never a pocket;
  a guild's page leads with its crest beside its name and motto.
- **The front door** (`app/page.tsx`). The three pets on a hill, eyes on
  the visitor; what is on Solana right now, counted from the program; a day
  with them, drawn; the one ink band beside a real Passport read from chain.

## What is real

Adoption, the room, care, the profile, the wardrobe, the playground, photos,
keeping a pet on Solana, the Passport, the Park and guilds on Solana are the
product. A
pet starts in this browser; kept on Solana, every care is a signed record.
A wearable is drawn on the pet, flat or in 3D — never a change to a vital. A care plays its moment in
the room only after the care is saved (or, on Solana, confirmed); an emote
changes nothing on the record and says so. A guild is a crest, a name, a motto and the
pets in it — no token, no treasury, no swap — and the two lists of what it
can and can never do. There is no market and no lobby.

The wallet layer follows the system's own rules: connecting is offered only
where it does something (keeping a pet on Solana, finding the pets a wallet
keeps) and never in the shell; the connect sheet, the address chip and every
receipt are Paper; an address always sits beside a copy control; waiting is
the neutral `wait` banner, a confirmation is a `done` banner with its
signature, a timeout is "Still waiting" and never "failed", and a failure
names what did not change.

Call a pet "on Solana" only when it was read from chain. Do not put a
simulated price back on a screen to fill a dock slot. The dock is Home, Park,
Playground, Profile, Guilds.

## The pets

`PetArt` (`src/components/pk/pet-art.tsx`) draws three species as flat
shapes with one outline weight: a big head on a small body, eyes set low and
wide with a shine in each, a blush, two paws on the rim. They are drawn to be
held, and they are drawn from the record:

- **Temperament is the face at ease.** Curious looks up with bright eyes and
  a tilted head, cozy smiles with its eyes shut, brave sets its brows and
  grins, mischief winks with its tongue out.
- **A need shows on the pet until it is met.** Hungry, lonely, tired and
  scruffy each replace the temperament's face (a drool, a tear, closed eyes
  and a z, ruffled fur) — which is what makes the vitals visible without a
  meter. Radiant keeps the temperament's face and adds three sparks.
- **What it wears is drawn on it**, in the colours the 3D room uses for the
  same piece. The shelf shows each piece drawn on its own (`WearableArt`),
  and a chip names it with its own glyph — never a borrowed heart or clock.
- **Coats are the species'.** Luna cat is `sun` with `sun-edge` stripes and a
  cream muzzle; Moss pup is `trim-copper` with `pet-cocoa` ears and eye
  patch; Cloud bun is `pet-cloud` white with `pet-blush` inside its ears.
  The `pet-*` tokens are animal colours, so eyes stay dark and a muzzle
  stays cream after dark.

`petLook(record, mood)` (`src/lib/game/appearance.ts`) is the one mapping
from a record to a drawing. Nothing is randomised: a pet looks the same on
every screen, on its share card, and after it moves onto Solana.

## Voice

Second person, sentence case, short sentences, no exclamation marks, no emoji.
Every failure, pause or refusal names what is *unchanged*. Never call a token
an investment, a yield, a return or an opportunity. Guilds are described as
optional in the sentence itself, every time.

## Accessibility floor

Every text colour meets 4.5:1 on the grounds its usage note names, in both
themes; `focus`, `rule`, the rarity trims and every meaningful mark meet 3:1. A
filled control's boundary is carried by its outline, not its fill. Status is
never colour alone. Motion is decorative everywhere it appears.
