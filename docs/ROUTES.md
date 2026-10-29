# Pawket — Routes & Information Architecture

**Status:** These are the product's routes. Never ship a nav link to an
unwired route, and call a pet "on Solana" only when it was read from chain.

```text
/                          landing (live count of pets on Solana)
/adopt                     a pet in three steps, added beside the others in this browser
(game)/home                the pet at home (the player's pick) in the room, the deck under it, or an empty room
(game)/park                every pet the program keeps, read live: the sixteen most cared for, ?all=1 for everyone
(game)/profile             you: name, look, outfits; ?tab=pets|wardrobe|stickers|settings
(game)/wallet              the Pawket Wallet: open it, link this device, put in, take out, the history read from chain
(game)/playground          four games, a shared daily round each; on Solana, "Record the round"
(game)/pet/[id]            an address: the public Passport, from chain (with its guild and guestbook);
                           otherwise the record of a pet in this browser
(game)/pet/[address]/visit you, in a pet's room on Solana: emotes, and a wave into its guestbook
(game)/market              looks for SOL at fixed prices — 25 pieces, 12 rooms, 8 frames — paid from the Pawket Wallet, and the room's things; the closet read from chain
(game)/pulse               everything the program holds, counted and read live
(game)/guilds              every guild on Solana, read live (test and delisted ones left out), and the rule
(game)/guilds/new          founding a guild: name, motto, crest, the founding pet
(game)/guilds/[slug]       a guild: its pets read from their accounts, together counts, join or leave, its events and polls, its coin
(game)/guilds/[slug]/coin  a guild's coin: its terms and stage from chain, launch, quote, trade, graduate, claim
/privacy                   the privacy policy, for the web and the Android app
/new                       what changed lately, newest first (`src/config/news.ts`); the front door names the newest
/api/health
/api/report                a page's error, its path and words scrubbed, logged; 30 an hour per caller
/api/sponsor               GET: is it up. POST { transaction }: signed first, as fee payer
/api/rpc                   the browser's RPC: allow-listed methods to SOLANA_RPC_URL; a send may carry any program's instructions, as a coin trade carries Meteora's
/api/actions/adopt         Solana Action: adopt straight onto Solana
/api/actions/care/[pet]    Solana Action: the four cares for the owner; a wave or an adoption for anyone else
/api/actions/wave/[pet]    Solana Action (POST): a wave, any wallet but the owner's, once a UTC day
/api/actions/guild/[slug]  Solana Action: a pet joins the guild
/api/actions/icon          a square card for an Action (?pet=)
/api/keepsake/[pet]        GET: the card's metadata, live. POST { account }: its creation, owner only
/api/keepsake/[pet]/card   the card's picture: the pet's portrait and its record's numbers, read now
/api/keepsake/collection   the collection's metadata
/api/coins/[slug]/quote    GET: a quote on the curve or in the verified DAMM v2 pool
/api/coins/[slug]/position GET ?account=: a wallet's locked positions in a graduated coin's pool, and their unclaimed fees
/api/coins/[slug]/{launch,trade,graduate,claim}   POST { account, ... }: a transaction for the player to sign
/api/coins/[slug]/metadata the coin's token metadata
/actions.json              /adopt, /pet/* and /guilds/* unfurl as those Actions
/robots.txt, /sitemap.xml   crawlers read the production deployment only (never a preview, never /api), from its public pages
(game)/pet/[id]/opengraph-image, (game)/guilds/[slug]/opengraph-image (its crest), /opengraph-image   share cards
```

Redirects: anything under `/market` goes to `/market`; `/inventory`
goes to the profile's shelf (`?tab=wardrobe` to its wardrobe).
`/guilds/boundary` and `/playground/*` go back to their index.
`/pet/:id/ownership` goes to `/pet/:id`.

The `(game)` group owns the shell: the label-sized bar (the wallet chip,
once a wallet is connected, and the room switch) and the floating Dock. The
dock is Home, Park, Playground, Market, Guilds, Profile. A pet on Solana and
the Pulse light Park; a browser pet lights Profile, and so does the Pawket
Wallet (reached from the wallet chip, Home's line under a pet on Solana whose
care this device cannot sign yet, and Settings).

## Server and client (normative)

- Pages and layouts stay **Server Components**. `"use client"` only at
  interactive leaves: forms, the deck, sheets, games, wallet leaves.
- The server reads Solana with its own RPC (`src/server/solana.ts`), never
  the wallet client, and passes plain props to leaves. Server secrets never
  reach a client import.
- Client reads go through `useRequest`, not a fetch in `useEffect`.
  Countdowns are the one timer exception (display only).
- Every send is an explicit button, disabled while it runs, through
  `usePawketSend` and `send.ts`; its toast carries the signature and the
  Explorer link (`src/components/wallet/tx-toast.tsx`).

## Navigation

- Pets before guilds, always. A guild's coin is traded only on its own
  page; Home, Profile and a pet's record never show a coin or its price.
- A delisted guild's page stays (the record is on chain) with what Pawket
  stopped doing; it leaves discovery.
- Wallet-free: every page reads without a wallet; only sends ask for one.
