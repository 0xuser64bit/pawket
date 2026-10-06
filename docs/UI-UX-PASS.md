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
