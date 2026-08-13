---
name: adding-mobile-feature
description: Use when adding or changing a Pawket Expo screen, route, tab, session method, or mobile UI flow.
---

# Adding a mobile feature

Read `docs/engineering/MOBILE.md` and `docs/MOBILE_UI_DESIGN.md` first.

## Inspect

- `apps/mobile/app/` — route + guards
- `apps/mobile/src/screens/PetHomeScreen.tsx` or `AdoptPetScreen.tsx` — composition
- `apps/mobile/src/state/PawketSessionContext.tsx` — mutations, status, errors
- `apps/mobile/src/components/Screen.tsx` + `DesignSystem.tsx` (`Surface`, `Button`) + `Text.tsx`
- `apps/mobile/src/theme/tokens.ts`

## Pattern

1. Add a session method if the feature reads/writes pet, goals, passport, or wallet. New `status` value, not a new boolean.
2. Thin `app/<route>.tsx`: guards + session + screen.
3. Body in `src/screens/` if it is more than a page of JSX. Settings/Passport/Seasons already live in `app/` — match nearby files.
4. Wrap with `<Screen nav>` only for the three tabs. Settings is stack, no nav.
5. New tab → `navItems` in `DesignSystem.tsx`. Do not add a tab for a stub.
6. Tokens + `<Text>`. Haptics via `src/feedback/haptics.ts`. Honor `useReducedMotion`.
7. Errors through `session.error` + `MessageBanner`.

## Do not

- Fetch in the screen if the session already owns that resource.
- Add React Query / Redux / a second axios client.
- Write "on-chain" / "purchased" unless that path exists.
- Put hex colors or raw font sizes in the screen.

## Verify

```sh
pnpm --filter @pawket/mobile typecheck
```

Walk the route: hydrate → guard → action → error banner → success feedback.
