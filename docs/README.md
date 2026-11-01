# Find your way around Pawket

Pawket is a companion game first. These guides explain how to play it, build
it and keep its boundaries intact. Start with a task—not a reading list.

[Project home](../README.md) · [Play Pawket](https://pawket.world) ·
[Contribute](../CONTRIBUTING.md) · [Report a vulnerability](../SECURITY.md)

## Start here

| You want to… | Open this |
| --- | --- |
| Adopt, care, play or recover a local pet | [Player guide](PLAYING.md) |
| Run the project for the first time | [Development: setup](DEVELOPMENT.md#setup) |
| Understand the product and its limits | [Product](PRODUCT.md), then [product direction](VISION.md) |
| Find the right code to change | [Architecture](ARCHITECTURE.md), then [routes](ROUTES.md) |
| Make a contribution | [Contributing](../CONTRIBUTING.md), then [change workflow](WORKFLOW.md) |
| Choose and run the right checks | [Testing](TESTING.md) |
| Configure or release a deployment | [Environment](ENVIRONMENT.md), then [development and releases](DEVELOPMENT.md#hosted-deployment) |

## Work on a system

| System | Guide | What it owns |
| --- | --- | --- |
| Care and games | [Game design](GAME-DESIGN.md) | Decay, cooldowns, progression, daily rounds and fairness |
| Interface and brand | [Design](DESIGN.md) | Tokens, components, interaction, accessibility and voice |
| Room and assets | [3D room](ROOM-3D.md) | Asset sources, reproducible builds, animation and fallback |
| Solana and wallets | [Solana](SOLANA.md) | Program accounts, instructions, device links, sends, sponsorship and keepsakes |
| Looks and purchases | [Marketplace](MARKETPLACE.md) | Fixed prices, cosmetic entitlements and closet reads |
| Community | [Guilds](GUILDS.md) | Membership, events, polls and permissions |
| Optional coins | [Meteora integration](METEORA-INTEGRATION.md) | Presets, transaction preparation, trading and graduation |
| Player protections | [Safety and economy](SAFETY-ECONOMY.md) | Disclosures, moderation and its limits |
| Native shell | [Android](ANDROID.md) | Origin boundary, phone capabilities, build, release and device checks |

## Understand the guardrails

- [Security](SECURITY.md): trust boundaries, known limits and incident handling.
  For a private report, use the root [security policy](../SECURITY.md).
- [Decisions](DECISIONS.md): accepted choices and their rationale.
  [Pending decisions](OPEN-QUESTIONS.md): unresolved choices that block work.
- [Mainnet](MAINNET.md): requirements for a separately authorized release,
  **not** a claim of readiness.
- [AGENTS.md](../AGENTS.md): repository contract and the file that owns each fact.
- [License](../LICENSE) and [bundled asset notices](../THIRD_PARTY_NOTICES.md).

## Keep this useful

Document behavior that exists; mark future work explicitly. Source code owns
constants, prices, account layouts and validation. The owning guide explains
their purpose—do not create a second specification or a task diary.

When changing a guide, follow its links from a fresh reader's point of view.
When renaming or removing one, update incoming links, including [AGENTS.md](../AGENTS.md),
and run `pnpm exec vitest run src/config/docs.test.ts`. The documentation checks cover
local links and embedded assets; external service availability needs a live check.

The README's product image is a real local-play capture, not chain activity
or a UI mockup. Refresh it from the running app when the interface changes:
use a disposable browser profile, adopt a local pet, wait for the room to
finish loading, and use **Photo → Wave** to face both companions toward the
camera. Save the photo and crop out its caption for a simple room portrait,
without developer overlays or wallet information.
Keep reusable documentation images in `docs/images/`; put temporary recordings,
release evidence and build output outside tracked product docs.
