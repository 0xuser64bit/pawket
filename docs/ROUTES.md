# Routes and navigation

This is the map of the implemented app, not a list of proposed screens.
Paths below are **public URLs**: the `(game)` directory in `app/` is a Next.js
route group and never appears in a URL.

[Documentation](README.md) · [Architecture](ARCHITECTURE.md) · [Design](DESIGN.md)

## Player pages

| URL | What is there |
| --- | --- |
| `/` | Landing page, adoption entry and chain-derived pet count |
| `/adopt` | Three-step local adoption, beside existing browser pets |
| `/home` | Chosen pet's room, care deck and tools; adoption prompt if empty |
| `/profile` | Player name and look, pets shelf; `?tab=pets\|wardrobe\|stickers\|settings` selects a shelf |
| `/wallet` | Pawket Wallet setup, device link, deposits, withdrawals and chain-read history |
| `/playground` | Catch, Hop, Copy and Pairs; daily rounds and practice; explicit recording for chain pets |
| `/park` | Chain discovery: sixteen most cared-for pets, `?all=1` for the full list |
| `/pet/[id]` | Public chain Passport if `id` is an address; otherwise a device-local pet record |
| `/pet/[id]/visit` | A chain pet's visit room, emotes and guestbook wave |
| `/market` | Fixed-price cosmetic shelves, search and the room's things; chain-read closet |
| `/pulse` | Public counts derived from program accounts |
| `/guilds` | Guild discovery, excluding test and delisted entries |
| `/guilds/new` | Founding form: name, motto, crest and founding pet |
| `/guilds/[slug]` | Membership, pets, gatherings, polls and the optional coin entry |
| `/guilds/[slug]/coin` | The coin's terms, stage, launch, quotes, trades, graduation and claims |
| `/new` | Updates from `src/config/news.ts`, newest first |
| `/privacy` | Web and Android privacy policy |

The six-place dock is **Home, Park, Playground, Market, Guilds, Profile**.
Public Passports and Pulse belong to Park. Local pet records and Pawket
Wallet belong to Profile. The wallet chip and contextual setup prompts reach
Wallet; financial controls do not become extra dock destinations.

Public pages can be read without connecting a wallet. A personal balance,
owned-pet view or transaction still needs the appropriate wallet context.
Guild membership leads its page; a coin is traded only on its own page.

## APIs and generated resources

These routes are application boundaries, not a versioned public SDK. Read
each handler's schema before constructing requests; a prepared transaction
is not permission to skip the shared send path.

| Method | URL | Responsibility |
| --- | --- | --- |
| GET | `/api/health` | RPC status/latency, sponsor availability, cluster and deployment commit; no credentials or balance |
| POST | `/api/report` | Scrubbed browser-error reports, rate limited |
| GET / POST | `/api/sponsor` | Availability / validate and sign an eligible transaction as fee payer |
| POST | `/api/rpc` | Allow-listed JSON-RPC methods through the configured server endpoint |
| GET / POST | `/api/actions/adopt` | Adoption Action description / prepared transaction |
| GET / POST | `/api/actions/care/[pet]` | Owner care choices, or wave/adopt choices for a visitor / prepared transaction |
| POST | `/api/actions/wave/[pet]` | Prepare a non-owner guestbook wave |
| GET / POST | `/api/actions/guild/[slug]` | Guild Action description / prepared membership transaction |
| GET | `/api/actions/icon` | Action image, optionally for `?pet=` |
| GET / POST | `/api/keepsake/[pet]` | Live metadata / owner-only creation preparation |
| GET | `/api/keepsake/[pet]/card` | Portrait and record-derived card image |
| GET | `/api/keepsake/collection` | Collection metadata |
| GET | `/api/coins/[slug]/quote` | Curve or verified DAMM v2 quote |
| GET | `/api/coins/[slug]/position` | `?account=` locked positions and unclaimed fees |
| POST | `/api/coins/[slug]/launch`, `/trade`, `/graduate`, `/claim` | Prepare the corresponding coin transaction; suffixes are relative to the same slug |
| GET | `/api/coins/[slug]/metadata` | Token metadata |
| GET | `/actions.json` | Maps adoption, pet and guild links to Solana Actions |
| GET | `/robots.txt`, `/sitemap.xml` | Crawlable public production pages; previews and APIs excluded |

The sponsor validates instructions; RPC's `sendTransaction` is a transport,
not the sponsor's instruction allow-list. It can carry another program's
instructions, including Meteora trades. Solana Actions use their own
owner-approved flow. See [Solana](SOLANA.md), [Meteora](METEORA-INTEGRATION.md)
and [Security](SECURITY.md) for the relevant trust boundaries.

Root, pet and guild Open Graph/Twitter image files generate share cards.
They are owned by their adjacent routes; do not maintain separate static
copies of a live Passport's numbers.

## Compatibility redirects

Keep existing links working. `next.config.ts` owns these redirects:

| Old path | Destination |
| --- | --- |
| `/market/:path+` | `/market` |
| `/guilds/boundary` | `/guilds` |
| `/pet/:id/ownership` | `/pet/:id` |
| `/playground/:game` | `/playground` |

The `/inventory` page redirects to `/profile#shelf`, or to
`/profile?tab=wardrobe#shelf` for `?tab=wardrobe`.

## Server and client contracts

- Pages and layouts default to **Server Components**. Use `"use client"`
  at interactive leaves, not as a substitute for server data ownership.
- Server chain reads use `src/server/solana.ts`, never the wallet client.
  Pass plain props to leaves and keep secrets behind `server-only`.
- Client reads use `useRequest`, not a new fetch-in-effect store. App sends
  use `usePawketSend` and `send.ts`, including the shared signature toast.
- A chain label, count or Passport needs a successful chain read. Short-lived
  discovery caches are snapshots, not immediate transaction receipts.
- Park's independent pet and guild scans run together; a failed guild scan
  does not hide the pets. Delisted guild records remain addressable with the
  product boundary explained, even after discovery stops promoting them.

For a new page, wire loading, empty, failed-read and narrow-screen behavior
before adding navigation. See [Design](DESIGN.md) and [Testing](TESTING.md).
