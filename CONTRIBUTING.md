# Make Pawket better

Good contributions make care clearer, return visits more reliable, expression
more personal or community easier to join—without making a wallet necessary
to enjoy the game. Bug fixes, accessibility improvements, documentation and
tests are welcome alongside product work.

## Get oriented

1. [Run the app](docs/DEVELOPMENT.md#setup), adopt locally and try a care and a round.
2. Read the [product contract](docs/PRODUCT.md) and [architecture](docs/ARCHITECTURE.md).
3. Find the owning system in the [documentation index](docs/README.md).
   [AGENTS.md](AGENTS.md) maps each fact to its authoritative source and
   defines repository constraints for humans and agents alike.

Use the existing **`dev` branch** for development; development pull requests
target **`dev`**, not `main`. A release is a separate `dev` → `main` PR and
requires explicit authorization. Do not deploy programs or publish APKs as
part of an ordinary contribution.

## Before building

For a bug, include the source revision, browser or Android/WebView version,
steps to reproduce, expected behavior and the actual result. Include a public
transaction signature if relevant—never a recovery phrase or secret.

For a feature, explain the player need and check the
[accepted decisions](docs/DECISIONS.md) and [pending decisions](docs/OPEN-QUESTIONS.md)
before introducing another system. A devnet implementation is not permission
to enable mainnet. Report vulnerabilities [privately](SECURITY.md).

## A reviewable change

Keep one purpose per PR. Follow the [change workflow](docs/WORKFLOW.md) for
implementation and the definition of done. Preserve local pet migrations,
public redirects, accessibility and honest failure recovery. Use existing
source-of-truth modules rather than duplicating constants, send paths or stores.

```sh
pnpm verify
pnpm exec playwright install chromium
pnpm e2e
```

The [testing guide](docs/TESTING.md) defines extra checks for program, assets,
Android, wallets and sponsorship. Devnet integration suites create accounts
and spend test SOL; they are opt-in and must not be repointed at mainnet.

In the PR, explain the player-facing result, the source layers changed,
the checks run and any remaining verification gaps. A passing web suite does
not establish consumer-wallet or physical Android compatibility.

## Documentation is part of the change

Update the guide that owns the behavior, not every file mentioning the
product. The README introduces Pawket; the [player guide](docs/PLAYING.md)
teaches the experience; specialist guides explain engineering contracts.
Keep pending ideas separate from implemented behavior, and do not add task
logs or duplicate specifications. Check navigation and assets with:

```sh
pnpm exec vitest run src/config/docs.test.ts
```

Never commit env files, keypairs, signing keystores, generated builds or private
release evidence. CI scans fetched Git history for secrets; if available
locally, `gitleaks git --redact --log-opts=--all .` reproduces that scan.

Contributions use the [MIT license](LICENSE). Preserve the separate licenses
and notices for [bundled assets](THIRD_PARTY_NOTICES.md).
