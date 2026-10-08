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

A player can live in one of fourteen rooms: Light and Dark are free (the
device decides between them unless the player picks); Strawberry, Honey,
Matcha, Seaside, Lavender, Starlight, Blossom, Aurora, Terracotta,
Newsprint, Cocoa and Arcade are the Market's. Each is a complete token block in
`app/globals.css` (`:root[data-theme="…"]`) that also applies to any
element marked `data-theme-preview`, so the shell's room switch and the
picker in Profile draw each room in its own tokens — a preview can never
disagree with the room it opens. Every hue keeps its job in every room;
only the grounds, surfaces, ink and tints move. `themes.test.ts` holds each
room to the accessibility floor below. The 3D wall takes the pet's sky in
the picked room; an evening room (Dark, Starlight, Aurora, Cocoa, Arcade)
lights the lantern.

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
(`--dur-sheet`) and leaves on the same curve; reduced motion closes at once.
It is a modal in behaviour too — focus moves in and stays inside, the page
behind goes inert, and Escape or the dimmed room leave the way Cancel does. Nothing animates on
a Paper surface: a quote does not count up and a launch meter does not fill on
load. All of it stops under `prefers-reduced-motion`.

Photos use that same sheet, including its close motion, focus return and
safe-area footer. Buttons use the shared control heights: 36px small (44px on
a phone or touch device), 48px standard, 56px large. A label stays on one line and
leads with its verb, so a long name ends in an ellipsis without hiding what
the button does; a pet's name belongs in the sentence beside it, not in front
of the verb. A ghost button carries no underline: it has no shelf to press, so
a finger tints it in its own ink, and one that opens a row lines its words up
with the column's edge (`pk-btn--flush`). Address controls have
separate 44px touch targets; their invisible hit areas never overlap. Editable fields stay at
16px or larger on a phone, with a real 44px input area, avoiding focus zoom. Game controls stay beside
the playing area, and all four games reflow for a phone held sideways.
Sheet headings reserve a column for Close; long names wrap without pushing
it out. On a phone a sheet is a thing in the hand: it rises from the bottom
edge over `--dur-sheet-in` on `--ease-sheet`, wears a grabber, and its head
drags it down — let go past a third of the way, or with a flick, and it
leaves the way Cancel does, the dim lifting as it goes; short of that it
settles back. Only the dim fades, never the sheet. Its foot puts the main
action across the whole width first, under the thumb, and Cancel beneath
it, every action the same height; wider screens set them in a row, Cancel
apart on the left. A Paper sheet's Cancel is a Paper button like its
Confirm. The body scrolls independently. The shell, adoption and landing headers
include the top safe area. Supporting browsers resize content when the
keyboard opens; native fields and scroll padding keep focused controls clear
of the dock.

Room settings use two compact previews per row on a phone, with Follow my
device across the top. All five look tabs share one row, with one keyboard
stop and arrow-key navigation. A failed server read has Try again, with a disabled
reading state; it refreshes the records without resetting the player's
local state. Copy and share failures leave a selectable link or address.

**One thing becoming another is seen happening, never cut.** A choice taking
effect, a tab's panel arriving, a sentence that changed, a page coming in:
each eases out on `--ease-swap` over `--dur-swap` (240ms) and moves a few
pixels at most. A state that changes *transitions* (so nothing moves on
arrival): the chosen choice rises onto its shelf on `--ease-spring`, just
past and back; a vital fills segment by segment; a care going to rest greys
over a moment. Content that is *replaced* is remounted with a new key and
eases in (`pk-swap-in`, `pk-swap`, `pk-pop-in`): the look editor's panel and
its summary, the profile's tabs, the deck's panels, a care's notice, a kept
outfit, the wardrobe's mirror.

Going somewhere is a view transition, and only the screen moves (`Screen`
carries React's `<ViewTransition>`; the classes live under "Going somewhere"
in `app/globals.css`). The old screen lets go in 140ms so it never competes;
the new one arrives 70ms later and more gently. A place in the dock
(`nav-place`) fades and rises 8px; something deeper (`nav-forward` — a card,
a row, a record) comes in from the right as the old screen steps left; a
back control (`nav-back`) runs the other way; anything else — the browser's
own back, a screen's content replacing its placeholder — only crossfades, so
nothing rises twice. The shell, the dock and the toasts are the walls: they
change in place and ride above the arriving screen. The dock's lit slot is
one pill that slides to the place chosen on `--ease-spring`, taking bloom as
it reaches Guilds, and a finger on a place presses its glyph in. The place
you are on, pressed again, scrolls back to its top, as a phone's own tab bar
does. A browser
without view transitions shows the new screen at once. Changing rooms
crossfades the whole page with a view transition where the browser has one. Someone changing clothes is seen
changing: the player (in 3D and on the flat room's peg doll) and the pet give
one squash and stretch from the feet, never on arrival. The room itself
crosses between flat and 3D over `--dur-room` (420ms): see `docs/ROOM-3D.md`.

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
- **The splash on every full load** (`BootSplash`, in the root layout): a
  refresh or an opened link paints the paw first, at full size, centred on
  the ground colour, drawing itself 190ms sooner than the in-page loader
  (this wait is shown on purpose). It holds until its name has landed —
  1.35s from the start of the load, so a slow load never waits twice — then
  lifts away over 380ms. In-app navigation never shows it again; without a
  script it is never drawn.
- **A screen waiting on this browser or a wallet** (`Waiting`) shows the
  same loader at full size, centred in the space the screen is about to
  fill, its words beneath. Inside a card it is the small one, beside its
  words (`inline`).
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
| phone, < 720px | Six equal dock targets, every icon named underneath; Playground reads “Play” | one column, full width |
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

Every screen has one main thing and says so with its skeleton, not with
more boxes. The head introduces it — a title, a line of facts, and the one
action that matters there (Found a guild; Join; Connect) — and the page
below it is the main thing at full weight: the room, the shelves, what is
on, the coin and its ticket, the record. What is beside it is quieter (a
list, not cards; a strip of counts, not a box each). What explains it —
the rules, the terms, what can go wrong, the addresses on chain — folds
away in a `.pk-fold`, its summary a title and a line of what is inside,
open on a tap; a page never opens with a fold, and the main thing is never
in one. Unrelated things are never set in a grid of equal-height cards:
a card is as tall as what it holds.

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
- **Nothing floats over the animal.** On desktop the deck floats over the frame's foot —
  the floor — and emotes, the look and every failure note live below it. The
  one control inside the frame is the view switch (2D · 3D), a trough with the
  view in use raised, in the top corner where the wall is. The frame keeps its
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
  and the one you land on is chosen. Each step's one action is pinned to
  the foot of a phone on the ground's colour (`pk-adopt__act`), so choosing,
  naming and going home never wait on a scroll and stay above the keyboard;
  going on slides the next step in from the right, Back slides it the other
  way. Naming stitches the name on the pet's blanket as it is typed, sized
  in the blanket's own units so a long name still fits across it and hops
  with the pet; suggestions are set as names, not labels. Each temperament
  is shown as the face it makes, its words from the top of the card. The
  name field keeps its label visible; temperaments are a compact
  two-column grid on phones. Back returns to choosing without losing the
  draft, including the Android gesture. The welcome is the pet radiant
  beside its first page, on Paper.
- **The park** (`src/components/park/park-scene.tsx`). Hills, trees, a
  bench, a path, the sun or the moon; the pets out today (then the most
  cared for) stand on the lawn as figurines, front row by care, depth by
  scale, each wandering a few steps at a pace from its address. Name tags
  are `pool` when out today. Server-rendered, CSS motion only. A phone's
  park stands its eight on spots of its own, so every name tag clears the
  heads in front of it, and its list of everyone is three faces to a row —
  name, level and crest; the counts are on each Passport.
- **The playground** (`src/components/play/`). Catch is a garden, Hop is
  the park path with drifting hills, Copy is one giant paw whose toe beans
  are the buttons and whose centre pad holds the pet. The pet is drawn
  whole (`pose="full"`) and its face answers the game. Sky clouds have no
  outline, so they never read as the storm clouds to dodge. A game's card
  says how to start it: Play (today's round) reaches over the whole card,
  so the drawing is a target too, and Practice sits beside it inside the
  card. In a round, the way back to every game comes first and Pause sits
  apart; a finished round's score comes up to meet the player, with one
  next action across the width and the rest beneath it.
- **Home** (`src/components/home/`). On a phone the room and care deck are
  separate, full-width surfaces; whose room it is and who else is home share
  one line above them. On desktop the deck tucks onto the room's foot, and
  the room gives up height on a short screen rather than letting the dock
  cover the deck. The level is a labelled ring of ten segments; each vital
  is its glyph, name and count on one line over five segments that span its
  column. The four cares are round buttons on a shelf (the one the pet wants
  in sun); a resting one loses its shelf, breaks its edge into dashes and
  counts down inside its face in full ink, its name kept beneath. Success
  and refusal use the shared toast, so feedback never shifts the care
  controls; what a saved care earned also rises once off its own button as
  a small sprout tag (`+10 XP`), where the thumb is, and is gone in a second
  (never under reduced motion). Today's round is a row of five marks that fill in as they
  happen — a tracker, never a row of buttons; only the round, which happens
  in the playground, is a link. The pet's record is a row you press; letting
  a pet go lives at the foot of that record, behind a second press, never
  on the daily room. A labelled “Keep on Solana” button sits beside the room
  switch. Photo prints the room on the room's own paper.
- **The profile** (`src/components/profile/`). The same stage with a separate
  plate beneath it on mobile (the player's name and what they have done together,
  counted), the look editor always open, then the shelf: pets, the
  wardrobe, the sticker book (a sticker is a tilted disc in its hue's soft
  tint; one not yet earned is a dashed outline), and settings.
- **The wardrobe**. A mirror: any of the player's pets large, trying on
  whatever the pointer or focus rests on before a tap wears it. A piece not
  yet earned is a dashed tile that says which sticker earns it.
- **Pairs**. Twelve cards on the table, the paw on their backs and the
  wardrobe on their faces, turning over in 3D on the press curve.
- **Guilds** (`src/components/guilds/`). A crest is square-shouldered and in
  its guild's colour (bloom unless it chose another hue), never a pocket.
  A guild's page is its introduction, then what it is for: the head holds
  the crest beside the name and motto, the facts and the way in for your
  pets (join, leave) in one place; below it, what is on — each event a card
  with its date as a calendar leaf, each poll its answers as bars that are
  the count — and beside that the pets as a list, what they did together,
  the coin in a line and the record folded away.
- **The front door** (`app/page.tsx`). The three pets on a hill, eyes on
  the visitor; what is on Solana right now, counted from the program; a day
  with them, drawn; the one ink band beside a real Passport read from chain.

## What is real

Adoption, the room, care, the profile, the wardrobe, the playground, photos,
keeping a pet on Solana, the Passport with its guestbook, the Park, the
Pulse, guilds on Solana with their events, polls and optional coin, and the
Market are the product. A
pet starts in this browser; kept on Solana, every care is a signed record.
A wearable is drawn on the pet, flat or in 3D — never a change to a vital. A care plays its moment in
the room only after the care is saved (or, on Solana, confirmed); an emote
changes nothing on the record and says so. A guild is a crest, a name, a motto and the
pets in it, its gatherings, and the two lists of what it can and can never
do; its coin, if it launches one, lives on its own page and on Paper. The
Market sells looks at fixed prices, on Paper too: a price is never a
Playroom figure. There is no lobby.

The wallet layer follows the system's own rules: the shell holds it, quietly,
just before the room switch and drawn the same way — "Connect" until a
wallet is connected, then the wallet's own mark and address, with a bolt
while this browser signs with no pop-up; it is offered in place where it
does something (finding the pets a wallet keeps) and never asked for up
front (the front door has none). Choosing a wallet and the wallet you are
open as Playroom sheets; Paper is for money. A phone's browser holds no
wallet, so there the picker offers to open the page inside Phantom or
Solflare (their published browse links, which offer the app where it is
missing) instead of sending the player to install pages. An address always sits beside
a copy control. The room switch shows the room's colour mark, with its name
and the next room in its accessible label; a tap moves into the
next one; every room, and "Follow my device", is in Settings. A send is a toast
(`src/components/pk/toast.tsx`), one per send, in the corner and over the
page — never a block in it: waiting is a spinner and says what it waits
for, a record is a check, "Recorded on Solana" and who paid, with the
Explorer a tap away, and goes by itself; a timeout is "Still waiting" and
never "failed"; a failure names what did not change and stays until it is
read. Declining in the wallet sends nothing and shows nothing.

Call a pet "on Solana" only when it was read from chain. Do not put a
simulated price on a screen: every price shown is the program's. The dock
is Home, Park, Playground, Market, Guilds, Profile — the player, last.

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
