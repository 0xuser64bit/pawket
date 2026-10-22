# Design system

Pawket uses a shared design system for the web app and Android's hosted pages.
This document defines visual and interaction contracts. Source owns exact
values; update this guide when the product changes.

## Sources

| Concern | Source |
| --- | --- |
| Colors, spacing, type, borders, motion and responsive layouts | `app/globals.css` |
| Shared components | `src/components/pk/` |
| Local font loading | `src/config/fonts.ts`; licenses in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) |
| Species, personality, mood and flat appearance | `src/lib/game/appearance.ts`, `src/components/pk/pet-art.tsx` |
| Rooms | `src/config/themes.ts` and matching CSS token blocks |
| Player look | `src/lib/player/`, `src/components/profile/look-editor.tsx` |
| 3D rendering and assets | [ROOM-3D.md](ROOM-3D.md) |

Reuse a shared component and its tokens before introducing another visual
pattern. Do not add raw colors to a screen when a semantic token owns them.

## Visual registers

Playroom presents care, expression and community: rounded surfaces, ink
outlines, sticker shadows and the text family. Paper presents money and
verifiable records: restrained color, small corners, hairline rules and mono
figures. On Paper, use `Button tone="paper"`; prices, balances, quotes and
signatures use amount or receipt styles. Financial figures never count up or
animate toward a promised outcome.

| Hue | Meaning |
| --- | --- |
| `sun` | Main action; at most one filled main action per screen region |
| `sprout` | Care progression, levels and streaks |
| `pool` | People and confirmed success |
| `bloom` | Guilds and their community participation |
| `alarm` | Risk, refusal and failure |

Status always has words or an icon as well as color. A filled control's
outline carries its boundary. Token surfaces do not use growth colors to
suggest profit or safety.

Fraunces is display type, Hanken Grotesk is reading type, and DM Mono is for
amounts and records. Fonts load locally. Units stay visually separate from
figures; long names wrap in headings and shelves without displacing controls.

## Brand and rooms

The mark is one paw drawing: four beans above a heart-shaped pad. `PAW` in
`src/components/pk/art.tsx` supplies the mark, loader and app icons; the favicon
is held to it by a test. Do not replace it with a different illustration.
Keep it readable at small sizes and in light and dark rooms.

Light and Dark are free, including following the device. Twelve additional
rooms are Market entitlements. Each room has a complete token block, shared
with `data-theme-preview`, so a preview uses the same colors as the room.
Every hue keeps its meaning. `themes.test.ts` checks contrast in each room.

## Layout and navigation

The shell uses the same six places at every width: Home, Park, Play, Market,
Guilds and Profile. The floating dock names every icon, clears the safe area
and has separate touch targets. Repressing the active place scrolls to its top.
Detail pages light the place they belong to; the wallet and local pet records
belong to Profile, public Passports and Pulse to Park.

| Width | Composition |
| --- | --- |
| Below 720px | One column, full-width room and controls |
| 720–1023px | Centered content with a 680px maximum |
| 1024px and above | Up to 1120px; `Columns` places related content side by side |
| A focused decision | `Screen width="narrow"`, at most 640px |

A page presents its main thing, its controls, then supporting detail. Keep
rules, terms and account details in folds when they are secondary; the main
thing and required pre-spend disclosures remain visible. The page reserves
space below content and focused controls for the dock and keyboard.

Home's room and care deck are separate surfaces at every width. The deck
sits beneath the room; no care control covers the animal or floor. The header
names the selected pet, offers pet switching and shows Keep on Solana for a
local pet. The deck contains mood, estimates, level, care and tools (Say,
Today, Decor, Photo, Look); selected tools open their panels below it. Decor
picks a place in the room, then what stands there; a tap shows it in the room
above at once, and a Market room's own thing wears a lock and names its room. Care feedback does not move controls under
a finger. Today's checklist reflects recorded care and a round, granting no
extra reward. Back after four hours or more since the pet's last care (and
its last greeting), the room plays a hello once it is drawn — you wave, the
pet bounces — and a note says how long it has been and what the pet needs;
nothing in the record changes. Letting a local pet go lives on its record, behind confirmation.

Profile presents the player, look editor and shelf tabs. Below 480px the
pets shelf is a list of rows, the portrait beside the name and its controls,
so no label is cut short; wider, it is a grid of cards. Wardrobe previews a
piece on the selected pet before wearing it, and holds the pet's coat: five
two-tone swatches per species, the classic first, chosen at adoption too.
A coat is kept on the device; the Passport, the Park and a visit show the
classic coat, and the picker says so. Free starters and confirmed
purchases are available; stickers do not unlock clothing. Market sheets show
the buyer's preview, fixed price, treasury and current fee payer. A room
thing's sheet has no price and no Paper: it places the thing, or opens the
room it comes with.

The front door leads with the pets, then real figures read from the program,
then a room that is theirs: three prints taken with Home's Photo tool in the
3D room (`public/landing/`, retaken when the room or its things change) and a
few of the room's things. A day with them, the Market's looks at their fixed
prices, the ink band for Solana and three plain columns of what is owned
follow; the whole asset table stays one fold away. On a phone the prints,
the day and the shelf are rows to swipe, so the page stays short.

Adoption uses a species row that follows the visible choice on a phone.
Playground cards open daily rounds or practice; Pause remains reachable beside
the game. The Park draws chain-read pets and provides a readable list. Guilds
put membership and gatherings before optional coin information. Financial
controls stay on the coin's own page.

## The room in 3D

The player and pet share a toon-shaded room with ink outlines and flat contact
shadows. Animal coats match flat art. Material colors come from the Daylight
palette; room lighting and walls respond to the chosen theme. Player look,
pet wearing and confirmed care are inputs to rendering, never record writes.

The view switch stays in the room's corner. A loading 3D room shows a named
wait; failed or unsupported rendering falls back to the flat room with
recovery controls. Flat art draws the same player, pet and selected look,
and plays the same moments in its own way: the pet hops, the player hops
with it, and what they did rises over them in a bubble with the moment's
glyph (still under reduced motion), for as long as the room says it.
The room's status sentence is announced to assistive technology, never shown:
the room already plays the moment, on Home and on a visit. Rendering pauses
when off screen or hidden; reduced motion renders on demand and holds a moment
still. [ROOM-3D.md](ROOM-3D.md) owns staging, contact, loading and asset budgets.

## Controls, sheets and recovery

Use verb-first, single-line button labels; a label that cannot fit its
button (a small phone, a large font) wraps to a second line rather than
hiding words behind an ellipsis. Standard controls are 48px and
large controls 56px; small controls are 36px, enlarged to 44px on touch devices.
Fields keep a 44px interaction area and at least 16px text on phones. Copy,
close and address controls have distinct targets whose hit areas do not overlap.

Sheets move focus inside, trap it, make the background inert and return focus
on close. Escape, Cancel and backdrop dismissal agree. On phones the header
supports downward dismissal and the footer keeps the main action under the
thumb; the body scrolls independently. Paper sheets use Paper actions.
Tabs support arrow keys and one keyboard stop. Photos use the shared sheet.
Profile tabs update local history immediately, preserve deep links and browser
Back/Forward, and keep the room mounted. Going somewhere commits at once
to the place's still placeholder: every segment whose pages change under it
has a `loading.tsx`, so Back from a guild or a record never waits on the
server with the old screen up. A link is never painted over; if a place was
not fetched ahead, one sun line at the top of the screen says it is on its
way (only past 150ms). A pressed tab lights at once. Toasts are
small sticker cards, top-centred at every width and above sheets. The newest
is in front and up to two older ones tuck in under it, a sliver each, so a
few at once never cover the screen; hover, focus or a tap fans them out.
A finger flicks one away up or to either side, and its close keeps a 44px
target behind a small mark. A wait's mark becomes a tick that pops in.
The founding page shares the directory's page rails. Its head sets the title
on the left and the guild as it will look on the right; below 720px the
title steps down to a guild page's phone size and the guild comes down under
it, whole, its crest on the right edge in line with the form. The form fills
the width below.
Record portraits align with their text at the leading edge.
Short selections use the shared labelled Choice group, including event
durations, poll lengths, photo poses and frames; no native select remains.
A consent box is a Paper box with an ink tick, and a disclosure inside a
card (`.pk-more`) shows the fold's chevron, never the browser's triangle. Days and times are picked in Pawket's
own sheet, never the browser's: a month whose chosen day is lifted like any
choice, today dotted and past days out of reach, with arrow and Page keys;
then the hour, quarter hour and (where the device uses it) AM/PM as chips,
in local time, with explicit Use this time and Cancel. Skipped and past
times cannot be confirmed. A daily reminder's time uses the same chips. Guilds
the connected wallet founded, or one of its pets is in, come first under
"Your guilds": a bloom card edge and shadow, and a badge with those pets'
faces and the role in a word (Founder, Member). The guild's own page leads
its facts with the same role. Both wait for the wallet's pets to be read, so
the page drawn on the server and in the browser agree.
Home's sound is a speaker in the room's corner beside the view switch, in
its trough: raised while it plays, sunk and faint while muted, in the 3D and
the flat room. It plays a music box (bell-like tines, a soft echo, a lullaby
in three) and a short tune per moment. Sound is on until muted and never
starts before a tap; it fades in, muting silences what is already ringing,
and a hidden or left Home goes quiet. Blocked storage keeps the choice for
the page.

A failed read provides a disabled-while-reading retry without resetting local
records. Offline, a place that needs the server waits in its placeholder
under a note that the pets here still work, and opens by itself once the
connection is back (Next's `useOffline`); it never falls to the browser's
error page. Copy/share failure leaves a selectable link or address. Transactions
show one shared toast: preparation, signing, sending, confirmation or unknown
outcome, then a signature and Explorer link. A care on Solana says what it
did in that same toast, never in a second one. A timeout retains the existing
signature; a failed send claims no record change. Storage failure also shows
an error before a success, navigation or care moment can be shown.

## Motion and accessibility

Presses, choices, panel changes and navigation use the shared motion tokens.
The shell, dock and toasts remain stable during screen transitions. The cold
boot splash appears only on a full load; in-page loaders name the wait. Route
skeletons hold still. Pet breathing, room life and the paw loader stay confined
to their own surfaces. Honor reduced motion; a financial wait uses neutral
feedback without a decorative progress promise.

Text meets 4.5:1 contrast on its intended grounds. Focus, meaningful marks and
control boundaries meet 3:1. Meaning never depends on color or motion alone.
Keep keyboard focus visible and clear of the dock. Verify the affected flow at
320px, with long names, large text (the Android app follows the phone's
font size, 85–200%) and reduced motion; [TESTING.md](TESTING.md)
identifies browser and physical Android checks.

## Product voice

Use second person, sentence case and short sentences. Name where a pet is
saved: in this browser, in this app, or on Solana after a chain read. A day
is the UTC day the program counts; a screen says when it turns in the
player's own time ("at 5:30 AM here", `dayTurnsAt`), and only Pulse's
records name UTC. State
sponsorship only while it is available. Describe what a refusal left unchanged.
Never fabricate activity, a price, a member count or an asset's value. Guilds
and coins are optional; no financial surface promises income or a return.
