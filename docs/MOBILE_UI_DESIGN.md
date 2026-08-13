# Pawket mobile UI direction

Pawket's mobile UI is a **nightlight companion**: a warm room after dark, one lamp,
one living thing. The pet is the product. Chrome is furniture. Solana is infrastructure
and stays in Settings.

## Design principles

- **Warm dark, not crypto void.** Umber night (`#16110E`), cream paper text, one honey lamp.
- **The pet is the hero.** Everything else frames it. No dashboard of equally loud cards.
- **Cute, but quiet.** Companion warmth for the creature. Restraint for the chrome.
- **Honest language.** No "on-chain" / production claims unless that path is wired.
- **Motion conveys life.** Breathing pet, care reaction, pressed feedback. All honor reduced motion.
- **Token-driven.** Screens consume tokens and primitives. No per-screen hex or font sizes.

## Foundations (`src/theme/tokens.ts`)

- `colors` — warm night surfaces, paper text, a single honey accent, dusty semantics.
- `gradients` — barely-there night depth and a chamber lamp. No rainbow CTAs.
- `speciesGradient` / `speciesAccent` — creature paint only. Never UI chrome.
- `spacing` (4/8 rhythm), `radius` (ceramic, not blob), `shadows` (warm-tinted; `lamp` only on the chamber).
- `typography` — **Bricolage Grotesque** (display) + **Nunito Sans** (body/UI). The family carries the weight.
- `motion` — shared durations/spring. `layout` — screen padding, max content 520, nav height.

Fonts load in `app/_layout.tsx` via `expo-font` with a branded boot gate.

## Core primitives

Typography — **always use the `Text` primitive** (`src/components/Text.tsx`):

```tsx
<Text variant="title" tone="text">Who’s coming home?</Text>
<Text variant="body" tone="muted">Pick a body and a temperament.</Text>
```

Tones: `text` | `soft` | `muted` | `faint` | `accent` | `success` | `warning` | `danger` | `inverse`.

Layout / surfaces / controls (`src/components/DesignSystem.tsx`):

- `Screen` — warm night gradient + a single lamp glow, safe areas, centered max-width, optional `nav`.
- `Surface` — matte ceramic panel. Use when grouping is needed. Do not card everything.
- `Button` — solid honey / ghost / danger. No rainbow gradients. `loading`, icons, spring press.
- `Pill`, `IconTile`, `Divider`, `SectionHeader`, `ProgressBar` (solid fill), `StateBlock`, `BottomNav`.
- `StatCard` — a quiet vital *row* (label, number, meter). Not a card.
- `MessageBanner` — inline notice / recoverable error.

Motion (`src/components/Motion.tsx`, all reduced-motion aware):
`Breathing`, `Floating`, `Halo`, `FadeInUp`, `PressableScale`, `Skeleton`.

## Pet visual system

- `PetCreature` — SVG creature. Species via ears + paint; mood drives face; idle blink.
- `PetChamber` — a lamp habitat: warm interior, one glow, a floor pool, the creature, a quiet mood caption. Not a sci-fi portal.

## Care feedback

A resolved care result still drives a coordinated burst:

- Reactive pet (bounce, mood override, particles, floating XP)
- Named haptics
- `Celebration` for level-up / sealed streak
- Animated meters

All degrade under `prefers-reduced-motion`.

## Screen composition

- **Landing** — wordmark, chamber, one headline, one line of copy, one CTA.
- **Wallet** — on-device key, three trust lines, one CTA. Network details live in Settings.
- **Adopt** — live preview, labeled name field, species, temperament, adopt.
- **Home** — name + mood + level, chamber, suggested care, four rituals, vitals as a list, compact daily streak. Settings via header gear.
- **Passport** — booklet identity + a dated memory list. Not a cyber ID card.
- **Seasons** — honest preview of what is not live yet.
- **Settings** — session, network, disconnect / start over.

## Navigation

Three tabs in a grounded bar (Home, Passport, Seasons). Settings is a pushed sub-screen from Home.

## Accessibility & motion

- All animation checks `useReducedMotion()`.
- Touch targets ≥44pt; icon-only controls carry `accessibilityLabel`; banners use `role="alert"`.
- Contrast: primary text ≥4.5:1, secondary ≥3:1, honey buttons use dark ink.

## What still needs real art

SVG creatures are a production-usable placeholder. Final art can swap in while keeping `PetChamber`, mood, and tokens. Solana Mobile Wallet Adapter and live Season data are the next functional layers.
