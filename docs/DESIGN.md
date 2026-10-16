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
local pet. The deck contains mood, estimates, level, care and tools; selected
tools open their panels below it. Care feedback does not move controls under
a finger. Today's checklist reflects recorded care and a round, granting no
extra reward. Letting a local pet go lives on its record, behind confirmation.

Profile presents the player, look editor and shelf tabs. Wardrobe previews a
piece on the selected pet before wearing it. Free starters and confirmed
purchases are available; stickers do not unlock clothing. Market sheets show
the buyer's preview, fixed price, treasury and current fee payer.

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
recovery controls. Flat art draws the same player, pet and selected look.
The room's status sentence is announced to assistive technology, never shown:
the room already plays the moment, on Home and on a visit. Rendering pauses
when off screen or hidden; reduced motion renders on demand and holds a moment
still. [ROOM-3D.md](ROOM-3D.md) owns staging, contact, loading and asset budgets.

## Controls, sheets and recovery

Use verb-first, single-line button labels. Standard controls are 48px and
large controls 56px; small controls are 36px, enlarged to 44px on touch devices.
Fields keep a 44px interaction area and at least 16px text on phones. Copy,
close and address controls have distinct targets whose hit areas do not overlap.

Sheets move focus inside, trap it, make the background inert and return focus
on close. Escape, Cancel and backdrop dismissal agree. On phones the header
supports downward dismissal and the footer keeps the main action under the
thumb; the body scrolls independently. Paper sheets use Paper actions.
Tabs support arrow keys and one keyboard stop. Photos use the shared sheet.
Profile tabs update local history immediately, preserve deep links and browser
Back/Forward, and keep the room mounted. Navigation links show a small wait
inside their own hit target when a route takes time to arrive. Toasts are
compact, top-centred at every width, with a full touch target to dismiss.
The founding page shares the directory's page rails; record portraits align
with their text at the leading edge.
Short selections use the shared labelled Choice group, including event
durations, poll lengths and photo frames. Event times use a themed calendar
with keyboard day/month navigation, a local-time clock and explicit Apply
and Cancel. Invalid, skipped and past times cannot be confirmed. Guilds
founded by the connected wallet and confirmed memberships appear first,
with written status as well as a bloom surface.
Home's sound switch stays beside the room-view switch, including in the flat
room. A remembered sound preference waits for a gesture after reload; mute
stops both future chimes and notes already playing. Hidden or unmounted rooms
release their audio. Blocked storage keeps the choice for the current page.

A failed read provides a disabled-while-reading retry without resetting local
records. Copy/share failure leaves a selectable link or address. Transactions
show one shared toast: preparation, signing, sending, confirmation or unknown
outcome, then a signature and Explorer link. A timeout retains the existing
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
320px, with long names, large text and reduced motion; [TESTING.md](TESTING.md)
identifies browser and physical Android checks.

## Product voice

Use second person, sentence case and short sentences. Name where a pet is
saved: in this browser, in this app, or on Solana after a chain read. State
sponsorship only while it is available. Describe what a refusal left unchanged.
Never fabricate activity, a price, a member count or an asset's value. Guilds
and coins are optional; no financial surface promises income or a return.
