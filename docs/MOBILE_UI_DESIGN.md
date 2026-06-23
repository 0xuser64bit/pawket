# Pawket mobile UI direction

Pawket's mobile UI is a dark, cinematic companion product for Solana users: near-black
surfaces, restrained Solana green/purple/cyan energy, real glass panels, a glowing pet
chamber, premium typography and subtle, reduced-motion-aware animation.

## Design principles

- **Dark-native**, not a light app with dark colors. Deep `#06070F` base with cool undertone.
- **The pet is the hero.** It is a live, code-drawn SVG creature with mood and species variants,
  not a placeholder. Everything else frames it.
- **Cute, but sharp.** Companion warmth for the pet, crypto precision for the chrome.
- **Honest devnet language.** No "on-chain" / production claims unless the path is actually wired.
- **Motion conveys life, not decoration.** Breathing pet, pulsing aura, animated meters, pressed
  feedback — all respect `prefers-reduced-motion`.
- **Token-driven.** Screens consume tokens and primitives; no per-screen hardcoded colors/sizes.

## Foundations (`src/theme/tokens.ts`)

- `colors` — structural surfaces, glass fills, hairlines, text scale, Solana accents, semantics.
- `gradients` — app backdrop, chamber, CTA/accent gradients, glass fills. `speciesGradient` /
  `speciesAccent` keep the pet on-brand per species.
- `spacing` (4/8 rhythm), `radius`, `shadows` (`e1/e2/e3` elevation + colored `glow*`).
- `typography` — type scale baked onto **Space Grotesk** (display) + **Inter** (body/UI). The
  family carries the weight, so components pick a variant rather than setting `fontWeight`.
- `motion` — shared durations/spring so all animation shares one rhythm. `layout` — screen
  padding, max content width (web/tablet), nav height.

Fonts load in `app/_layout.tsx` via `expo-font` with a branded boot gate.

## Core primitives

Typography — **always use the `Text` primitive** (`src/components/Text.tsx`):

```tsx
<Text variant="title" tone="text">Claim your companion.</Text>
<Text variant="body" tone="muted">Care today. Evolve forever.</Text>
```

Layout / surfaces / controls (`src/components/DesignSystem.tsx`):

- `Screen` — cinematic gradient + ambient orbs, safe areas, centered max-width, optional `nav`.
- `GlassPanel` — real glass surface (gradient fill + top highlight edge + border + elevation);
  `glow` accepts `true | 'green' | 'cyan' | 'amber' | 'purple'`.
- `Button` — gradient/ghost CTA with `tone`, `size`, `loading`, leading/trailing icons, spring press.
- `Pill`, `IconTile`, `Divider`, `SectionHeader`, `ProgressBar` (animated gradient fill),
  `StateBlock` (loading / empty / error), `BottomNav` (3 top-level tabs, animated active state).
- `StatCard` — a pet vital meter with icon, live value and low-state warning.
- `MessageBanner` — inline notice / recoverable error with `aria`/role and entrance.

Motion (`src/components/Motion.tsx`, all reduced-motion aware):
`Breathing`, `Floating`, `Halo` (aura pulse), `FadeInUp` (entrance / stagger),
`PressableScale`, `Skeleton`.

## Pet visual system

- `PetCreature` (`src/components/PetCreature.tsx`) — pure SVG creature. Species silhouettes
  (Luna Cat / Moss Pup / Cloud Bun) via ears + gradient; mood drives eye openness, mouth, blush
  and sparkle; idle blink. Crisp at any size.
- `PetChamber` (`src/components/PetChamber.tsx`) — the habitat: tinted depth, static + animated
  aura rings, floor glow, breathing/floating creature and a mood readout. This is the anchor on
  Landing, Adopt, Home and Passport.

## Care feedback & life system

The companion must visibly _respond_ to care, not just update a dashboard. A resolved
care result drives a coordinated burst of feedback:

- **Reactive pet** — `PetChamber` accepts a one-shot `reaction` (`{ type, nonce, xp }`).
  On a new `nonce` the creature does a squash-and-stretch bounce, briefly overrides its
  mood (`PetReaction.CARE_REACTIONS`), emits a `ParticleBurst` (food/hearts/sparkles/Zzz/
  stars per ritual) and floats a `FloatingXP` chip.
- **Haptics** — `src/feedback/haptics.ts` wraps `expo-haptics` with named intents
  (`tapLight`/`tapMedium`/`celebrate`/`notifyWarning`/`selection`). Native-only and
  failure-silent. Wired into care actions, nav, adoption choices, wallet connect and CTAs.
- **Celebration** — `Celebration` is a full-bleed confetti + badge moment surfaced through
  the new `Screen` `overlay` slot, reserved for big beats (level up, sealed streak, reward).
- **Animated meters** — `AnimatedCount` tweens stat/level numbers so change is felt; the
  `StatCard` and the "Care rituals" section highlight the single vital that needs attention,
  and ritual cards reflect today's daily-goal completion.

All of the above degrade to a static, legible layout under `prefers-reduced-motion`.

## Screen composition

- **Landing** — wordmark, hero headline, companion chamber, Adopt/Care/Evolve features, CTA.
- **Wallet** — trustworthy on-device key path: shield hero, trust list, devnet network info
  (program / cluster / RPC), one-tap "create your companion key" with confident copy.
- **Adopt** — "claim your companion": a live preview chamber that reacts to species + personality,
  name signal, species cards (each shows its creature), personality tuning, summary + adopt.
- **Home** — companion chamber, bond/XP card, vitals dashboard (now driven by real-time decay),
  tactile care rituals, daily streak, care-feedback "memory" moments, Passport preview. Settings
  via header gear.
- **Passport** — futuristic identity card (avatar, owner, level, adopted, memories, vitality) plus
  a memory timeline rail.
- **Seasons** — one designed forward surface that previews Season One quests, cosmetics/eggs, and
  visits/gifting as honest "what's coming" cards (replaces the old Store/Friends/Events stubs).
- **Settings** — session / network / app plus real companion-key actions (disconnect, start over),
  as a back-navigable sub-screen.

## Navigation

Three top-level tabs in the floating glass `BottomNav` (Home, Passport, Seasons) — every tab is a
real, intentional destination rather than a coming-soon placeholder. Settings is a pushed sub-screen
reached from the Home header.

## Accessibility & motion

- All animation checks `useReducedMotion()` and degrades to a static, fully-legible layout.
- Touch targets ≥44pt; icon-only controls carry `accessibilityLabel`; banners use `role="alert"`.
- Dark-mode contrast tuned in tokens (primary text ≥4.5:1, secondary ≥3:1).

## What still needs real art

The SVG creatures are a strong, production-usable placeholder language. Final production can swap in
species-specific 2D/3D art, richer idle/care animations and collectible cosmetics while preserving
the same `PetChamber` composition, mood system and tokens. On-device transaction signing through the
Solana Mobile Wallet Adapter, and turning the Seasons surface into live quests/store/friends data,
are the next functional layers.
