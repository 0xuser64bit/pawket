# Mobile product pass — 6 October 2026

The pass keeps Pawket's cream, ink, sticker outlines, living pets and quiet
Paper receipts. It changes the shared web experience, including the pages
the Android shell hosts. APK/app/program versions, signing, game math,
program accounts, prices and device permissions are unchanged.

## Findings and fixes

| Finding | Player impact | Implemented change |
| --- | --- | --- |
| Phone dock hid destinations and resized its active slot | Navigation depended on remembering icons; targets moved | Six equal slots, visible labels, 44px minimum targets, short Play label |
| Room and care overlapped on phones | The scene and controls competed for space | Separate full-width room and deck; Profile's name plate follows the same rule |
| Care status used unnamed glyphs and replaced action labels with countdowns | The pet's needs and resting actions were hard to scan | Named vitals, labelled level, permanent action names and a separate timer |
| Care feedback expanded the deck | Controls shifted after a successful action | The shared toast reports saved or confirmed care without moving the deck |
| Keeping a pet on Solana used a tiny badge beside another target | It was easy to miss or tap the wrong pet | A full labelled Keep on Solana control beneath the deck |
| Long sheet headings could displace Close; footer actions wrapped | Controls became awkward on short phones | Reserved close column, wrapped headings, equal-height phone footer actions and safe-area bounds |
| Input labels disappeared after typing | Filled forms lost their context | Persistent labels, real 44px input areas, associated descriptions and announced validation errors |
| A carousel observer could select a different pet than the one visible after resizing | The CTA could name the wrong pet | Selection uses the current carousel geometry; reduced-motion selection skips smooth scrolling |
| Naming was too tall and phone Back left the flow | Extra scrolling; drafts felt fragile | Smaller portrait, two-column temperament cards, draft-preserving Back through the existing Android hook |
| Look tabs lacked keyboard movement; Extras wrapped alone | Keyboard users and small phones had uneven navigation | One keyboard stop, arrow/Home/End keys, five equal phone slots with labels that fit |
| Home's Look shortcut could render before its hash arrived | The editor sometimes remained closed | Open the native details after navigation commits; test a return visit |
| Room settings showed ten oversized previews | Reaching device settings required excessive scrolling | Two compact previews per row, with Follow my device across the top |
| Failed reads offered only a reload instruction | Recovery was absent from the screen | A shared Try again control refreshes server reads and shows a disabled reading state |
| Some copy/share failures were silent | A tap appeared to do nothing | Visible failure feedback with a selectable full link/address; successful retry clears it; canceled shares stay quiet |
| Several fee statements were unconditional | Sponsorship could be promised while unavailable | Settings reads sponsor availability; public descriptions and Blink cards describe sponsorship conditionally |
| The global error screen claimed no transaction had been sent | A screen failure could misrepresent an earlier send | Error recovery asks the player to check a transaction's receipt before repeating it |

## Journey reviewed

- Landing, all three adoption steps, validation and welcome; empty and
  returning Home, care, family switching, Keep on Solana and wallet sheets.
- Home in 3D and flat mode; Say, Today, Photo, Look, saved appearance and
  reduced motion. All four games, results, pause/resume, touch input and
  landscape layouts use the existing regression coverage.
- Profile's pets, wardrobe, stickers, settings and look facets; guest
  records and live public Passports; a live visit and the guestbook.
- Park, Market previews and purchase sheet, disconnected Pawket Wallet,
  Pulse, guild discovery/founding/detail, gatherings and a coin's public
  page; empty, missing and failed-read branches.
- Source review includes transaction progress, signed receipts, owner-only
  controls, device linking, guild event/poll forms and coin quote/recovery
  states. Event/poll signing was not exercised through the browser.

## Verification

- `pnpm verify`: typecheck, lint, **351 unit tests** and production build.
  The command skips 14 opt-in devnet tests.
- `PLAYWRIGHT_PORT=3100 pnpm e2e --workers=2`: **55 browser checks**, with
  four real devnet signing/trading flows skipped by default. Layout checks
  cover 19 route states at 320, 375 and 768px, plus desktop dock placement.
- `PAWKET_DEVNET=1 PLAYWRIGHT_PORT=3100 pnpm e2e e2e/chain.spec.ts --workers=1`:
  **three live devnet journeys passed** with test wallets: browser adoption
  carried onto Solana, confirmed care and public Passport, frozen keepsake
  card, guild founding, and Pawket Wallet linking, device care, history,
  unlinking and closing.
- `PAWKET_DEVNET=1 PLAYWRIGHT_PORT=3100 pnpm e2e e2e/coins.spec.ts --workers=1`:
  **one live devnet trading journey passed** with a test wallet: quote,
  signed buy and sell on a Meteora bonding curve, signed buy in a graduated
  DAMM v2 pool, confirmed receipts and refreshed wallet balances.
- Added regressions cover fixed dock geometry, real touch targets,
  separated Home surfaces, care layout stability, a large pet family,
  long-name sheets, carousel selection, native Back, UTF-8 name limits,
  keyboard choices, reliable Look navigation and compact room settings.
- Recovery tests exercise clipboard refusal, successful retry, canceled
  sharing, Android share failure and the server refresh control. A local
  production server with an unreachable RPC exercised failed guild, coin,
  Passport and visit reads, including pending/disabled retry and 44px
  controls. Cached public scans were not forced into failure in that probe.
- Batched screenshots cover phone journeys and desktop Home/Profile/Market;
  additional captures check live Passport/visit and the final compact
  settings. No page errors were observed in these read-only probes.
- The design detector reports one existing spring-easing warning. The
  chosen control's one-pixel lift and overshoot are specified in
  `DESIGN.md`; that token is unchanged. No additional detector findings.
- No new dependencies, fake chain data, transaction path or program changes.

## Remaining evidence

Physical Android keyboard, notch/system-bar placement, consumer-wallet
return/cancel behaviour and native share/gallery still require the phone
procedure in `ANDROID-PHONE-CHECK.md`. The Android bridge is tested with
the browser stand-in; this pass did not rebuild or publish an APK.

No deployment or push is included; the installed shell receives the UI
after the shared web deployment.

# Mobile product pass — 7 October 2026

The second pass treats the phone as the product rather than a narrow
desktop. It audited every screen at 320, 375 and 768px and on a desktop, in
Daylight and Lamplight, with a production build measured in headless
Chromium. APK/app/program versions, game math, program accounts, prices and
the send path are unchanged.

## Findings and fixes

| Finding | Player impact | Implemented change |
| --- | --- | --- |
| Button labels wrapped to two lines; names led labels ("Keep Sir Marmalade Pickles on Solana") | Rows of buttons at different heights; long names pushed the verb off the end | One-line labels that end in an ellipsis; labels lead with the verb; layout primitives may shrink below their content, so a button never widens the page |
| Ghost buttons were underlined caps | Read as web links in a game | No underline; a pressed tint in their own ink; back controls aligned to the gutter |
| Sheets rose 24px and faded | Felt like web pop-ups | Phone sheets rise from the bottom edge, carry a grabber and drag down to dismiss with a velocity check; the main action spans the foot, Cancel beneath |
| Tab changes faded the page in twice (skeleton, then page), and nothing moved in the dock | Content seemed to teleport; no sense of where you went | React view transitions per screen: dock places fade and rise, deeper pages slide forward, back slides back, placeholders crossfade; the dock and toasts ride above; one measured pill slides to the chosen place; pressing the current place scrolls to its top |
| The incoming screen painted over the dock mid-transition | A flash of page through the dock | The dock and toasts are their own transition layers, above the screen |
| Vitals were 5px squares with the count floating away from them | Hard to read at a glance | Name and count on one line over five segments across the column |
| A resting care showed its countdown on an extra line, half transparent | Low contrast; an empty line reserved under every care | A resting face drops its shelf, dashes its edge and counts down inside itself in full ink |
| Today's round was a row of pills that did nothing when pressed | Looked tappable | A five-mark tracker; only the round (played elsewhere) is a link |
| "Let {pet} go" sat on the daily room | A destructive action beside care | Moved to the pet's record, behind a second press |
| A saved care said so only at the top of the screen | Eyes are on the button, not the toast | A small "+10 XP" rises off the pressed button once (not under reduced motion) |
| Say/Today panels opened below the fold; a finished round's score did too | Taps seemed to do nothing | Opened panels and results scroll into view, clear of the dock |
| Adoption's action scrolled away; long names spilled off the blanket; step 1 opened blank until hydration | Extra scrolling; broken-looking name tags; "is this broken?" | Each step's action is pinned under the thumb (above the keyboard while naming); the name is sized in the blanket's own units and hops with the pet; steps slide; step 1 draws before storage is read |
| Game cards were silent buttons with Practice floating outside them | No visible way to start | Play reaches over the whole card, Practice beside it inside; Play buttons align across a row; All games comes first in a round |
| Pairs could deal the paper crown and the gold crown together | Two pairs a glance cannot tell apart, in a game scored on misses | One wardrobe piece per kind (tested over 300 seeds); the deal and score are unchanged |
| The park's second row hid its name tags behind front-row heads | Names unreadable; pets cut by the frame | A phone's park has its own eight spots |
| The landing opened a phone on six lines of text and two identical Adopt buttons | The pets were below the fold | Title, the three pets, then two full-width ways in; the copy counts four games |
| Passport, empty Home, guild and error actions stacked at different widths | Ragged columns | `pk-acts`: a row where there is room, one width on a phone |
| No press feedback on tiles, tools, choices, rows and the park's figures; the browser's grey tap box and long-press selection on controls | "Did that work?"; web tells | Every pressable gives while held; tap highlight and control text selection are off |
| A phone's browser has no wallet, and the sheet only described what to do | Dead end for iPhone and most phone browsers | "Open in Phantom/Solflare" via each app's published browse link |
| Desktop at 1280×800: the dock covered the care buttons | Care hidden on a laptop | The room gives up height on short screens |
| three.js read every shader's logs on arrival | A long main-thread freeze on reaching Home | Production skips the check (three.js's advice); measured gain needs a real GPU (headless software GL has no parallel compile) |

Smaller fixes: the park's list of everyone three faces to a row on a
phone, a poll's answers at a finger's height with a press, the round's whole
mark as its link, going home and to a new guild arriving with the matching
motion, look-editor parts in the tabs' trough and six skin tones per row, the sticker book two to a row, the profile's empty pocket beside the
pets, meter readouts that keep a figure with its unit, a guild's facts apart
from its actions, the not-found screen's mark and notch clearance, a guild
placeholder that is not a taken name, wardrobe copy for touch, and title
descenders clear of the line beneath.

## Verification

- `pnpm verify`: typecheck, lint, **352 unit tests** and production build.
- `pnpm e2e --workers=3`: **55 browser checks** pass (four devnet flows
  skipped by default); updated selectors for the new Play buttons and
  labels.
- Production navigation (headless Chromium, Pixel 7 profile): every dock tap
  is a soft navigation; transitions start in ~20ms and finish in ~430ms;
  dynamic places run a second crossfade when their content replaces the
  placeholder.
- Screenshots at 320/375/768/1280 in both rooms for Home (empty, fed,
  resting), all adoption steps, Playground (cards, a round, a result), Park,
  Profile (all tabs, look editor), Guilds (list, page, founding), a coin, a
  live Passport and visit, Market and its sheet, Pulse, Wallet, the connect
  sheet and the not-found screen.

## Remaining evidence

A physical phone still has to confirm: the 3D room's arrival cost with
parallel shader compile, the pinned adoption action above a real keyboard,
drag-to-dismiss feel, and the Phantom/Solflare browse links on iOS and
Android (`ANDROID-PHONE-CHECK.md`).
