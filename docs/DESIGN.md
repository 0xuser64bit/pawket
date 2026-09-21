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
| Demo fixtures for the product surfaces | `src/lib/demo/` |
| The honesty marker | `src/components/preview-note.tsx` |

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

## Motion

A pressable control moves on `cubic-bezier(.2,.9,.3,1)` at 90ms; the shelf is
what makes it read as an object. A pet breathes on a 3.6s loop and is the only
looping animation in the product. A sheet rises over 220ms. Nothing animates on
a Paper surface: a quote does not count up and a launch meter does not fill on
load. All of it stops under `prefers-reduced-motion`.

## Layout

Screens are designed at 390px with `space-5` gutters; wider viewports centre
the same column (`.pk-screen`). The Dock floats 14px from the bottom, and every
screen leaves 96px of clearance at its foot. The landing page is its own width
(`.pk-band`, 1200px, 72px gutters, bands at `space-9`).

The vertical order on every game screen is the same: the thing itself, then
what you can do to it, then anything that explains it.

## What is real and what is a fixture

The one real flow is the wallet-free loop: `/adopt` writes a guest pet through
`src/lib/guest/` and `src/lib/game/`, and Home then shows that pet with live
vitals, real cooldowns and real XP. Everything else — market listings, guilds,
treasury lines, quotes, lobbies — renders `src/lib/demo/` fixtures.

Every screen that renders a fixture carries `PreviewNote`, in the neutral
`wait` tone, and no fixture is described as on-chain, owned or confirmed. On
the ownership and confirmation screens the note sits **above** the claim, not
below it. Controls that would need a chain (explorer links, transfer, confirm
in wallet) are disabled and say why rather than pretending.

When a real source lands it replaces the fixture, not the screen.

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
