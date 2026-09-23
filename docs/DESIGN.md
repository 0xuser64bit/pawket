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
| Wearables | `src/lib/closet/catalog.ts` |

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

## Type

`display` (Fraunces) is the game's voice, `text` (Hanken Grotesk) is everything
you read, `mono` (DM Mono) is anything verifiable. `display-hero` is used once,
on the landing page. A figure in a sentence still takes `amount-sm`, and units
are a separate `ink-faint` suffix.

## The mark

A pocket with four pads arched above it, because a paw print and a pocket are
the same shape. The opening is worn as a collar, and the tag hanging from it is
a heart — the thing a pocket keeps and the thing a paw keeps at its centre,
drawn once.

The pocket is deeper than a pocket needs to be. That depth is what buys the two
units of clear space between the collar and the tag; below that the two merge
into a single mass at 16px, which is where the first attempt at this died. The
ring joining them is deliberately thinner than either, so it fades out before
it can blot. Check the mark at 16, 20 and 24px before changing any of it.

Two inks. It never rotates, never takes a gradient, never sits inside another
shape, and never appears without the pocket — the pads alone are not the mark.

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
   `50% 100%` origin, so it settles on its feet.
2. **The paw loader** (`PawLoader`). A paw inside a pocket — the mark
   assembling itself — with the four species taking the frame in turn. Each is
   held 900ms and hands over in 220ms, the duration of a rising sheet, on the
   press curve. A paw leaves before the next arrives, so it is a replacement,
   not a dissolve. Under `prefers-reduced-motion` one paw sits still.

The loader is an amendment to the system's original "nothing else loops" rule,
made deliberately and fenced just as deliberately:

- **Playroom only, for a wait with no known end.** Cold boot, matchmaking.
- **Never on Paper.** Nothing animates there, and a playful cycle while money
  moves is exactly the wrong feeling. A pending transaction keeps its Paper
  treatment — a neutral `wait` banner and a countable `Meter`.
- **Never as a route-change skeleton.** `app/loading.tsx` is the root fallback
  and carries the loader; `app/(game)/loading.tsx` holds still, because a loop
  flashing on every navigation is the shimmering-skeleton problem in a nicer
  costume.
- **A paw, not a pet.** A pet in a pocket is the product's hero image, and a
  loader is not the place to spend it. A paw is a fragment, so it reads as
  waiting.

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

## What is real

Adoption, the room, care, the wardrobe, the playground round and the guild
boundary are the product. The pet is saved in this browser. A wearable is a
name beside the pet, not a change to the drawing and not a change to a vital.
Guilds are the two lists of what a token may and may not do. There is no
market, no treasury, no swap and no lobby.

Do not describe the pet as on-chain. Do not put a simulated price back on a
screen to fill a dock slot. The dock is Home, Playground, Inventory, Guilds.

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
