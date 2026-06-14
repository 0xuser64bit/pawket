# Pawket mobile UI direction

Pawket's mobile UI is designed as a dark, futuristic companion product for Solana users: cinematic black surfaces, restrained Solana green/purple/cyan accents, glass panels, glowing pet chambers, and concise crypto-native copy.

## Design principles

- Dark-native, not a light app with dark colors.
- Cute companion energy without childish cartoon chrome.
- Trustworthy devnet language: no production or on-chain claim unless the path is actually wired.
- Mobile-first hierarchy: companion chamber first, then vitals, rituals, Passport, and seasonal loops.
- Consistent reusable primitives instead of one-off screen styling.

## Core primitives

The practical design system lives in `apps/mobile/src/theme/tokens.ts` and `apps/mobile/src/components/DesignSystem.tsx`.

Use these for new mobile screens:

- `Screen`: cinematic gradient background, safe-area spacing, optional bottom navigation.
- `GlassPanel`: translucent premium card surface.
- `Button`: gradient/ghost CTA with pressed and disabled states.
- `Pill`: small status/category badge.
- `SectionHeader`: consistent eyebrow + title hierarchy.
- `ProgressBar`: XP, vitals, ritual progress.
- `StateBlock`: polished loading, empty, and error states.
- `PetAvatar`: code-generated pet chamber placeholder until final art exists.
- `StatCard`: pet vitals with meter and icon.

## Screen composition

- Landing: premium first impression, hero copy, pet chamber, devnet honesty.
- Wallet: secure dev wallet path, cluster/program/RPC context, no seed phrase language.
- Adopt: companion selection chamber, species cards, personality tuning, name signal.
- Home: living companion chamber, bond progression, care dashboard, tactile rituals, daily streak, Passport preview, and care feedback moments.
- Passport: futuristic identity card plus dev/API memory timeline.
- Store/Friends/Events: productized coming-soon surfaces, not TODO screens.
- Settings: clean cluster/API/session information without raw debug dumps.

## Daily loop feedback

Care actions create a lightweight local feedback object in mobile session state. The home screen renders it as a premium “Memory unlocked” / “Bond level increased” panel with XP, level, and stat deltas. This keeps the API path honest while making the core care loop feel like a game moment instead of a form submission.

## What still needs real art

The current pet visual system is intentionally code-generated: glowing rings, aura colors, and tasteful ASCII-like silhouettes. Final production should replace this with species-specific 2D/3D art, animated idle states, and collectible cosmetics while preserving the same chamber composition and token system.
