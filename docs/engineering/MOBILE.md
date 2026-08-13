# Mobile engineering

Expo 54 + React Native 0.81 + Expo Router + TypeScript. Portrait, dark-only, `scheme: pawket`.

The app is a thin client over `@pawket/sdk` and `PawketSessionProvider`. Do not add Redux, Zustand, React Query, or a second API layer.

## Layout

```txt
apps/mobile/app/            Expo Router routes (thin)
apps/mobile/src/screens/    Substantial screen bodies
apps/mobile/src/components/ Primitives + pet visuals
apps/mobile/src/state/      PawketSessionContext (the store)
apps/mobile/src/theme/      tokens.ts
apps/mobile/src/wallet/     companion key, storage, adapter
apps/mobile/src/api/        PawketApiClient singleton
apps/mobile/src/solana/     cluster / program / RPC for display
apps/mobile/src/feedback/   named haptics
apps/mobile/src/hooks/      useReducedMotion
apps/mobile/src/integrations/  reserved for MWA
```

## Screens and navigation

Routes are files in `app/`. `_layout.tsx` is a headerless `Stack` with fade transitions, wrapped in `PawketSessionProvider`. Fonts gate first paint.

| Route       | Role                                                               |
| ----------- | ------------------------------------------------------------------ |
| `/`         | Landing. Waits for `hydrated`, then redirects if a session exists. |
| `/wallet`   | Create companion key                                               |
| `/adopt`    | First pet                                                          |
| `/home`     | Care loop                                                          |
| `/passport` | Timeline                                                           |
| `/seasons`  | Honest Season One preview                                          |
| `/settings` | Session + network + disconnect / start over                        |

Tabs are **not** Expo Router tabs. `Screen nav` renders `BottomNav` (`Home`, `Passport`, `Seasons`). Settings is a pushed stack screen from the Home gear.

**Pattern**

- Thin route file: guards + `usePawketSession()` + screen component.
- Guards use `router.replace` (wallet missing → `/wallet`, no pet → `/adopt`).
- New tabs: add the route, add an entry to `navItems` in `DesignSystem.tsx`, pass `nav` to `Screen`.
- Do not add a fourth tab for a stub.

Data loading lives in the session, not in the route. Passport is the exception that calls `loadPassport()` in a `useEffect`.

Screen-local state is only for UI (name draft, confirm-reset, selected species). Server state goes through the session.

## Components

| Kind        | Where                                                                 | Rule                                            |
| ----------- | --------------------------------------------------------------------- | ----------------------------------------------- |
| Primitives  | `components/Text.tsx`, `DesignSystem.tsx` (`Surface`), `Screen.tsx`, `Motion.tsx` | Reuse. Do not restyle per screen. |
| Pet visuals | `PetCreature`, `PetChamber`, `PetReaction`                            | SVG creature + habitat. Mood/species from data. |
| Feedback    | `MessageBanner`, `Celebration`, `AnimatedCount`, `StatCard`           | Errors, level-up, meters.                       |

Presentational screens receive callbacks (`onAdopted`, `onConnected`). Container logic stays in the route or the session.

If a widget is used on two screens, it belongs in `components/`. If it is one screen's layout, keep it in the screen file.

## Hooks

Add a hook only for reusable reactive behavior. Today that is `useReducedMotion`. Wallet, pet, and mutations are session methods — do not wrap each one in `useAdoptPet()`.

- Name: `useThing`.
- No fetch-in-hook parallel to the session.
- Side effects that navigate belong in the session (`connect` → `/home` or `/adopt`).

## State

| Kind                                      | Home                                            |
| ----------------------------------------- | ----------------------------------------------- |
| Server state (pet, daily goals, passport) | `PawketSessionContext`, fetched via `api`       |
| Wallet session                            | `DeviceWalletAdapter` held by the provider      |
| Persistent identity                       | `companionKey.ts` → `storage.ts` (AsyncStorage) |
| UI state                                  | `useState` in the screen                        |
| Status / error / notice / careFeedback    | session                                         |
| Transaction status                        | does not exist yet — see TRANSACTIONS.md        |

`status` is a single machine: `idle | connecting | loading_pet | loading_daily_goals | adopting | caring | claiming_daily_reward | loading_passport`. New mutations get a new status value, not a boolean pile.

`hydrated` is false until launch restore finishes. `/` must not flash Landing at returning players.

**Landmines**

- Launch restore currently `setWallet` before the pet fetch. If the API is down, a returning player can land on `/adopt` as if they had no pet. New restore logic must distinguish “no pet” from “fetch failed.”
- `status` is a single mutex. Overlapping `care` + `loadPassport` will clobber each other.
- `/wallet` uses `loading={status !== 'idle'}`. That is too coarse if `/wallet` is ever shown with a live session — gate on `status === 'connecting'`.
- `session.notice` is written and never rendered. Surface it or stop setting it; do not add a second toast system beside it.
- Vitals decay on the **API** at read time. Home does not tick decay locally between fetches. A client ticker must use `applyStatDecay` from `@pawket/shared` and `statsUpdatedAt`, not a second formula.
- Do not introduce Expo Router `(tabs)`. Tabs are `BottomNav` on a Stack. Adding both will double-navigate.

## Forms

The only form is adopt (`name` + species + personality).

- Validate with the same limits as `@pawket/shared` (`petNameSchema`: trim, 2–24).
- Disable the CTA while `status === 'adopting'`.
- Errors come back as `session.error` → `MessageBanner`.
- `returnKeyType="done"` on the name field.
- Keyboard avoidance is **not** wired. The name field sits high enough today. Any new field below the fold must use `KeyboardAvoidingView` (iOS `padding`, Android `height`) inside `Screen`.

## Styling

`tokens.ts` is mandatory.

- Spacing is a 4/8 scale (`xxs`–`xxxl`).
- Type via `<Text variant="title" tone="muted">`. Do not set `fontWeight` — the family name carries weight. Display is Bricolage Grotesque; body is Nunito Sans.
- Color via tokens / `tone`. No hardcoded hex in screens.
- Shadows use `boxShadow` tokens (`e1`/`e2`/`e3`, `lamp`), not `elevation`.
- `Screen` handles safe areas, the night lamp, max width 520, and nav inset.
- `headingScale` / `isCompactWidth` already shrink display type and the chamber on phones. Use them; don't invent a second breakpoint system.
- Dark-only. `userInterfaceStyle: "dark"`. No light theme.
- Portrait-only. `orientation: "portrait"`.

Motion: `Motion.tsx` primitives + `tokens.motion`. Every animation must honor `useReducedMotion()`.

## Performance

Optimize where it hurts, not by default.

- Session value is already `useMemo`'d. Don't wrap every callback in extra memo for style points.
- Lists are small (four care actions, a short passport). `map` is fine. Switch to `FlatList` when a list can grow unbounded.
- Images: the only raster is the splash/logo. The pet is SVG.
- Startup: font gate + silent session restore. Don't add blocking work to `_layout.tsx`.
- Network: one client (`src/api/client.ts`). Don't spawn extra `fetch` calls in screens.

## Mobile-specific rules (this app)

| Topic                      | What we actually do                                                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| iOS vs Android             | Android `applicationId` `com.pawket.app`, `edgeToEdgeEnabled`. iOS no tablet. API URL: emulator uses `10.0.2.2`.                         |
| Safe areas                 | Only via `Screen` + `useSafeAreaInsets`. Don't pad by hand.                                                                              |
| Status bar                 | `style="light"` in `_layout.tsx`.                                                                                                        |
| Transitions                | Stack `fade`. Don't add gesture-heavy navigators.                                                                                        |
| Permissions                | None requested. Don't add camera / push / tracking plugins without a product ask.                                                        |
| Deep links                 | Scheme `pawket` is reserved. No route handlers yet.                                                                                      |
| Background / lifecycle     | Session restore on launch only. No background fetch.                                                                                     |
| Offline                    | No cache. Failed calls become `session.error`. Keep that honest.                                                                         |
| Secure storage             | Wrapper in `storage.ts` is the swap point. Today AsyncStorage (including web `localStorage`). Fine for a devnet identity; not for funds. |
| Clipboard                  | Not used.                                                                                                                                |
| Haptics                    | `src/feedback/haptics.ts` named intents. Native-only, failure-silent.                                                                    |
| Accessibility              | Hit targets ≥ 44, `accessibilityLabel` on icon-only controls, banners `role="alert"`, reduce-motion respected.                           |
| Push / biometrics / camera | Not in the product.                                                                                                                      |

## Honesty

Seasons is a designed preview, not a store. Wallet copy says on-device key, not Phantom. Do not write "signed on-chain" until TRANSACTIONS.md is implemented.
