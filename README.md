# Pawket

Pawket is a web-first companion game with an Android app. Adopt a pet without
an account or wallet, care for it, dress it, and play a daily round. A player
can keep that pet on Solana, where its Passport records confirmed care and
progression.

The configured production origin is [pawket.world](https://pawket.world).
The current chain environment is **Solana devnet**. Mainnet release requirements
are tracked in [MAINNET.md](docs/MAINNET.md).

## Product

- Home brings the player and their chosen pet together in a 3D room, with a
  flat room fallback, care controls, photos and reminders.
- Profile keeps the player's look, pets, wardrobe, stickers and settings.
- Playground offers Catch, Hop, Copy and Pairs with shared daily rounds.
- Public Passports, the Park and Pulse read pet history and counts from chain.
- Guilds provide membership, events and polls. Their optional coins trade on
  a separate page and cannot affect care or progression.
- The Market sells cosmetics at program-enforced prices. Purchases and coin
  spending use Pawket Wallet; the owner approves every spend.

Browser pets stay on the device. Solana pets use program accounts; a keepsake
is a frozen Metaplex Core card. Neither pets nor purchased looks have a resale
market. [PRODUCT.md](docs/PRODUCT.md) defines the supported behavior and limits.

## Local development

Use Node 20 or later and the pnpm version pinned in `package.json`.

```sh
cp .env.example .env.local
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`. Guest play needs no secrets. Solana app actions
require a supported wallet and a linked, funded Pawket Wallet. Without a
sponsor, the device pays eligible fees and rent-bearing actions wait for
sponsorship. See [ENVIRONMENT.md](docs/ENVIRONMENT.md) for configuration.

```sh
pnpm verify         # typecheck, lint, unit tests and production build
pnpm e2e            # browser behavior; devnet signing tests are opt-in
pnpm program:test   # program build and LiteSVM tests; needs the Solana toolchain
```

[DEVELOPMENT.md](docs/DEVELOPMENT.md) covers commands and deployment;
[TESTING.md](docs/TESTING.md) covers verification scope.

## Documentation

Start with the [documentation index](docs/README.md). Contributors and agents
must also read [AGENTS.md](AGENTS.md) and [WORKFLOW.md](docs/WORKFLOW.md).
The [architecture](docs/ARCHITECTURE.md) identifies the code boundaries;
[SECURITY.md](docs/SECURITY.md) identifies enforced rules and known limits.

The Android app lives in `android/` and uses the same hosted product and send
path. Its build, release and device checks are in [ANDROID.md](docs/ANDROID.md).

## Assets

Flat art is drawn in code. 3D pets use Kenney's Cube Pets and 3D people use
Quaternius's Universal Base Characters, both CC0. The source files and the
reproducible build pipeline are documented in [ROOM-3D.md](docs/ROOM-3D.md).
