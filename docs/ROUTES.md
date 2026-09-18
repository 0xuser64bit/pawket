# Pawket — Routes & Information Architecture

**Status:** SPEC. Only `/` + `/api/health` exist today. Build routes in milestone order; never ship a nav link to an unwired route (honest-UI rule). Route groups `(marketing)` / `(game)` keep Server shells clean.

## 1. Site map (target)

```text
/                              marketing landing (wallet-free, pet-first hero, no token content)
/home                          → redirect to (game)/home when game ships (avoid two homes)
/api/health                    EXISTS — extend with indexer lag later, keep shape backward-compatible

(game) — requires no wallet to VIEW; sends require connected signer
├── home/                     personal space: active pet, emotes, background/music (E02)
├── adopt/                    base-pet pick + name/species/personality → sign (E01; priced in E05)
├── pet/[address]/            detail: stats/XP/mood/cooldown/Passport (E01)
│   └── customize/            try-on + equip preview (E03)
├── inventory/                owned pets + cosmetics + equipped state (E03)
├── marketplace/              browse (E05)
│   ├── [listingId]/          detail + fixed-price quote + checkout
│   └── receipts/[orderId]/   receipt + signature + Explorer link
├── playground/               games + daily goals + streaks + share (E06)
├── guilds/                   discovery (approved/live only; suspended hidden) (E07)
│   └── [slug]/               profile | events | votes | treasury | launch (launch tab M6 only)
│       ├── events/
│       ├── votes/
│       ├── treasury/
│       └── launch/           DBC progress / migration-pending / DAMM v2 swap (E08/E09)
└── share/[petId]/            OG-image share card (E06)
```

## 2. Per-route contract

| Route | Server (data) | Client leaves | States |
| --- | --- | --- | --- |
| `/` | metadata, public env | wallet CTA, hero avatar (static) | no-wallet hero; never shows guild-token prices |
| `(game)/home` | guest pet or wallet pets (RPC/DB) | `home-space.tsx`, `emote-row.tsx`, `scene-picker.tsx` | empty (adopt CTA) / guest banner / live / loading |
| `(game)/adopt` | presets (species/personality), price (M3+) | `adopt-form.tsx` → `TransactionStatus` | validating / signing / sending / confirming / confirmed+Explorer / failed+retry-safe / unknown+lookup |
| `(game)/pet/[address]` | pet + passport read (RPC → indexer) + freshness | `care-panel.tsx`, `passport-timeline.tsx` | not-found / wrong-owner (read-only) / cooling countdown / decay estimate |
| `(game)/inventory` | owned pets + defs + equipped | `inventory-grid.tsx`, `equip-sheet.tsx` | empty / preview-not-saved (pre-chain-equip) / synced |
| `(game)/marketplace` | listings + prices + fees | `listing-card.tsx`, `checkout-sheet.tsx` | no-wallet browse / quote / signing / receipt / unknown |
| `(game)/playground` | goals/streaks/scores | `game-card.tsx`, `goal-tracker.tsx` | playable wallet-free; rewards never token-gated |
| `(game)/guilds` | approved guilds only | `guild-card.tsx` | empty / list; suspended excluded |
| `(game)/guilds/[slug]` | guild + policy + treasury + launch state | `launch-progress.tsx`, `quote-ticket.tsx`, `risk-disclosure.tsx`, `treasury-table.tsx` | dbc-active / migration-pending (sends blocked) / dammv2-active / ended / suspended (benefits off, factual record kept) |

## 3. Server/Client split (normative)

- Pages/layouts stay **Server Components**. `"use client"` only at: forms, care panel, checkout/quote tickets, emote/scene pickers, wallet leaves.
- Server fetches via read-only RPC or `/api/*` (never wallet client); passes plain props to leaves. Thread server secrets via props, never imports.
- Quote/launch polling via `useRequest` (framework hook), not `useEffect` fetch. Cooldown countdowns are the only `setInterval` exception (display-only, derived from `lastCareAt` + injected `now`).
- Every send leaf: explicit button → disable while sending → `TransactionStatus` (the one component) → Explorer link from `cluster.ts`.

## 4. Navigation rules

- Global nav order (once shipped): **Home · Pets · Marketplace · Playground · Inventory · Guilds**. Pets before Guilds always.
- Guild tokens never appear in Home/Inventory/Pet headers; guild flair renders only inside guild routes + optionally as a small badge on social cards (opt-in display, never price).
- Suspended guild: route stays (factual record) with suspension banner; removed from discovery + nav highlights; benefits disabled.
- Wallet-free: all browse/detail pages render fully; only signing actions gate on connection (with install guidance for empty discovery + `pending` placeholder per `SOLANA.md`).

## 5. API surface (overview — shapes in API-CONTRACTS.md)

```text
GET  /api/health                       exists; add {indexer:{lagSlots,lastVerifiedSlot}} later
GET  /api/pets?owner=                  owned pets (chain→cache) + freshness
GET  /api/pets/:address                pet detail + passport + freshness
GET  /api/marketplace/listings         browse + pagination
POST /api/marketplace/orders           create order intent (server validates price/fees)
GET  /api/marketplace/orders/:id       receipt + signature/slot
GET  /api/guilds                       approved/live only
GET  /api/guilds/:slug                 profile + policy + treasury summary + launch state
POST /api/guilds/apply                 application intake (rate-limited)
GET  /api/guilds/:slug/eligibility?wallet=  cosmetic/social benefits only
GET  /api/guilds/:slug/quotes?side=&amount=  [M6] DBC/DAMM quote (server-assisted, frozen at sign)
GET  /api/tx/:signature                tx reconciliation (confirmed/failed/unknown)
GET  /api/indexer/status               lag + last verified slot
```

## 6. SEO / sharing

- Guild profiles + marketplace listings are Server-rendered with metadata (name, utility statement excerpt — never price promises).
- `share/[petId]` renders OG image (avatar SVG → PNG at request time, cached); no wallet required.
- Token launch pages include `noindex` until `publishedAt` set (avoid indexing draft configs).
