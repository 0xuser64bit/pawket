# Pawket Android: complete build and continuation prompt

## How to use this document

Give this entire document to the implementation agent alongside the Pawket repository. It is one complete prompt covering the Android build, research context, verification, release preparation, progress tracking, and continuation by another agent. The agent should implement the work, verify it, and produce reviewable release artifacts. Reading this brief is the starting point, not the final deliverable.

This assignment may pass between Claude, different Codex accounts, or other agents. Keep durable task state in `docs/ANDROID-HANDOFF.md` following section 21. The build brief defines the assignment; the handoff records actual implementation progress. Do not rely on conversation history, an account, hidden reasoning, or a remembered tool session for continuity.

This document intentionally contains no event calendar, development schedule, or effort estimates. It is not a second product specification: the current repository, its sources of truth, and the official competition requirements take precedence over historical assumptions here.

## 1. Mission

Build Pawket into a reliable Android application and prepare a complete, credible Solana Mobile Clock In submission package. Preserve the existing web product and its Solana architecture. Deliver a real installation and real mobile-wallet interaction, with useful phone-specific improvements that make the product more than an APK launcher.

Pawket is a living companion. A player can begin without a wallet, care for a pet, express themselves through its room and look, and optionally keep the pet and its care history on Solana. The Android adaptation should make that everyday loop comfortable, trustworthy, and easy to return to. Wallets and protocol details should not overwhelm the companionship experience.

Own the implementation end to end: discovery, technical research, architecture, integration, native features, regression checks, Android builds, release documentation, submission materials, and a continuously maintained handoff. Do not stop after a plan, a generated shell, or one successful wallet connection. Follow through to the acceptance criteria below.

## 2. Autonomy and working boundaries

You have substantial freedom to investigate and make routine implementation decisions. Explore the live code, installed dependency APIs, current official documentation, relevant source repositories, and actual Android behavior. Choose the simplest approach that satisfies the product and competition requirements, and explain decisions that materially affect the outcome.

The official Solana Mobile webshell is the recommended starting hypothesis, not a demand to retain a broken approach. If investigation proves another architecture necessary, document the evidence and choose a coherent alternative. A full React Native rewrite should require a concrete benefit that outweighs losing direct reuse of the existing presentation and platform code.

Do not turn this into an unrelated redesign, backend replacement, speculative product expansion, or broad dependency upgrade. Keep implementation choices proportional to their purpose. A short decision note is preferable to an architectural framework that this application does not need.

Continue independently through reversible implementation, fixes, local builds, and verification. Ask the owner only when missing information genuinely prevents progress or an action needs separate authorization. Prepare concrete artifacts before asking for external publication or submission approval.

This brief authorizes building and preparing the Android release. It does not authorize mainnet deployment, changing program addresses or authorities, widening device permissions, spending production funds, making repositories public, granting external repository access, publishing to a store, or submitting under the owner's identity. Those are distinct external actions. Do all preparatory work first and identify the precise remaining owner action.

## 3. Start with current truth and protect concurrent development

Pawket is being developed actively. Treat every capability and missing integration mentioned in this brief as something to confirm against the checkout you actually receive.

Before changing files:

1. Read the current `AGENTS.md` and any applicable nested instructions.
2. Inspect branch, commit, working-tree changes, and attached worktrees. Identify existing work that belongs to other people or agents.
3. Follow the repository's required reading sequence. Read `docs/ARCHITECTURE.md`, `docs/VISION.md`, `docs/PRODUCT.md`, `docs/AGENT-GUIDE.md`, and `docs/WORKFLOW.md`; consult planning documents and the specs for each layer you touch.
4. Read the installed Next.js guides under `node_modules/next/dist/docs/` before changing Next.js behavior. Do not rely solely on familiar APIs from another release.
5. Audit the actual routes, dependencies, wallet implementation, transaction paths, storage, 3D room, sharing, and tests.
6. Record a concise capability map: already implemented, missing for Android, implemented but unverified on Android, and dependent on external configuration.
7. Name the modules you expect to change and establish the first integration gate before coding.

If `docs/ANDROID-HANDOFF.md` already exists, read it before repeating discovery. Reconcile its baseline, files, decisions, and verification against the actual checkout. Reuse valid findings and completed work; re-check only what changed, failed, or remains uncertain. If there is no handoff, create it after the initial inspection and before substantive implementation. Follow section 21 in either case.

Prefer an isolated branch/worktree when concurrent work could conflict. Start from the appropriate current product state; do not silently omit uncommitted product work when creating isolation. If the intended baseline is unclear, keep making independent progress and request only the necessary clarification. Preserve all unrelated changes. Never reset, clean, revert, stash, or commit someone else's work as a shortcut.

Update your understanding as the repository changes. Do not resurrect removed Expo scaffolding merely because it exists in history, or assume old roadmap absences are still absences. Some repository documents describe future architecture or older product boundaries. Resolve conflicts through `AGENTS.md`, the authoritative implementation, and the closest current contract.

## 4. Product context to preserve

Audit and carry forward every feature actually supported by the current release. Relevant areas include:

- Guest adoption, multiple pets, active-pet selection, and device-local persistence.
- Feed, play, groom, and rest; decay, cooldowns, XP, level, streak, stickers, and care history.
- The shared player-and-pet 3D room, flat-room fallback, care moments, emotes, themes, and photos.
- Player profile, look, outfits, pet wardrobe, and earned expression.
- Catch, Hop, Copy, and Pairs, including the shared daily round and recording a completed round.
- Keeping a pet on Solana, reading its public Passport, and discovering live pets in the Park.
- Keepsake cards, with the existing transfer and visibility rules.
- Guild membership and any current gatherings, RSVPs, check-ins, polls, votes, guestbook waves, or public sharing features.
- Pawket Wallet funding, withdrawal, linking, delegated actions, revocation, history, limits, and fallback behavior.
- Any currently implemented cosmetic Market, purchased closet items, live product counts, or optional guild-coin flows.

The last items are especially important to re-audit: the code has evolved beyond the earlier research snapshot. Do not remove or prohibit an existing feature based on an older description of Pawket as having no Market or coins. Equally, do not invent a shipped feature merely because a specification describes it.

Maintain the current separation between companionship and money. Payments, token balances, or cosmetic purchases must not influence care math, XP, cooldowns, scores, or access to baseline play. Preserve existing financial disclosures, quote checks, permissions, and payer boundaries. Do not add SKR, ORE, trading, staking, or a new economic mechanism just to chase an optional prize.

Retain the current brand and design system. Use the existing paw mark, typography, room language, tokens, and components. Any mobile-specific treatment should feel like Pawket rather than an unrelated template app.

## 5. Research context and official sources

Re-read the current official materials before making implementation claims. Follow their linked requirements and distinguish binding rules, documentation, examples, and recommendations.

| Question | Primary source |
| --- | --- |
| Event overview and intended products | [Clock In announcement](https://solanamobile.com/blog/clock-in-the-solana-mobile-hackathon) |
| Current FAQ, submission process, and repository access | [Competition site](https://solanamobile.radiant.nexus/) |
| Binding eligibility, technical requirements, judging, and publication obligations | [Competition terms](https://solanamobile.radiant.nexus/legal/clock-in-terms.pdf) |
| Supported web-to-Android approach | [Publishing a web app](https://docs.solanamobile.com/recipes/general/publishing-a-web-app) |
| Generated Android project and CLI | [Webshell documentation](https://docs.solanamobile.com/cli/webshell) and [official CLI source](https://github.com/solana-mobile/solana-mobile-cli) |
| Web Wallet Standard/MWA registration | [Web installation guide](https://docs.solanamobile.com/get-started/web/installation) |
| Mobile Wallet Adapter capabilities | [MWA documentation](https://docs.solanamobile.com/solana-mobile-stack/mobile-wallet-adapter) |
| Seed Vault's role | [Seed Vault guide](https://docs.solanamobile.com/solana-mobile-stack/seed-vault) |
| Browser wallet restrictions | [Local Network Access guidance](https://docs.solanamobile.com/recipes/mobile-wallet-adapter/local-network-access) |
| APK generation and signing | [Build and sign an APK](https://docs.solanamobile.com/dapp-store/build-and-sign-an-apk) |
| Android wallet testing | [Test with any Android device](https://docs.solanamobile.com/recipes/general/test-with-any-android-device) |
| Store preparation | [Submit a new app](https://docs.solanamobile.com/dapp-store/submit-new-app) and [publisher policy](https://legal.solanamobile.com/pl/publisher-policy) |
| Safe native/web messaging | [Android native bridge guidance](https://developer.android.com/develop/ui/views/layout/webapps/native-api-access-jsbridge) |

The earlier research established the following baseline; verify it rather than treating it as an immutable policy:

- The event supports private GitHub access for judging; public open sourcing and an open-source license are not automatically required.
- Its FAQ permits entering both Clock In and Colosseum. Each competition still has its own eligibility conditions.
- Existing projects must satisfy the project's age condition and demonstrate significant new mobile work. A new Android folder or repository does not automatically create a new project.
- A functional Android APK, Solana Mobile Stack/MWA integration, meaningful Solana behavior, source access, demo, and pitch materials are central requirements.
- Minimal ports/wrappers are weak competition entries; a supported distribution method alone does not prove substantial mobile development.
- Direct Seed Vault SDK integration, React Native, and ownership of a Seeker were not identified as mandatory for a dApp.
- Optional token-related awards are separate from the core entry. Avoid interpreting them as a reason to redesign Pawket's economy.

Read eligibility and publication conditions, but do not fill implementation documents with calendars, completion estimates, or speculative prize claims. If official materials conflict, record the conflict, prefer the authoritative terms, and identify any clarification actually needed.

## 6. Recommended architecture

Begin by evaluating the official Solana Mobile webshell around the current hosted Next.js application. Keep the Android project in this repository, in a clear directory such as `android/` or `apps/android/`. Select the location to fit the actual tree; do not reorganize the entire repository solely to satisfy a suggested path.

The intended separation is:

```text
Android APK
  ├─ Android launch, navigation, wallet-intent handling, and native capabilities
  └─ Trusted hosted Pawket web application
       ├─ Existing presentation, game rules, and local state
       ├─ Existing server routes, chain reads, sponsor, and preparation services
       └─ Existing Solana program and external owner wallet
```

Preserve request-time pages, server-only APIs, and secrets on the server. Do not assume the current application can be statically exported. Do not put the sponsor, treasury, collection-authority, or other server signing material into the APK.

Commit maintainable Android source, configuration, and reproducible build instructions. Pin the CLI/template and dependency versions you use. Understand generated source instead of treating the converter as a black box. Do not fork the entire web product or duplicate game logic in Kotlin.

If the official shell cannot meet a verified requirement, investigate alternatives such as a narrowly extended shell, Capacitor with a justified adapter, or a focused native implementation. Do not select TWA/Bubblewrap merely because it can wrap a URL; check current wallet restrictions. Do not equate Android Chrome support with Android WebView support.

Native capabilities may use a small platform boundary with web fallbacks. Keep that boundary specific to capabilities such as sharing, haptics, and lifecycle. It must not become another wallet client, transaction engine, or pet store.

## 7. Establish genuine MWA signing first

Inspect `src/lib/solana/browser-client.ts`, `src/lib/solana/send.ts`, `src/lib/solana/use-send.ts`, `src/lib/solana/transactions.ts`, and the current wallet UI.

The earlier audit found Wallet Standard discovery without MWA registration. Confirm whether that is still true. Follow the current web installation guide; earlier official shell guidance required `@solana-mobile/wallet-standard-mobile` at least `0.5.1`. Select a current compatible version from verified documentation, not an unexamined latest dependency.

Register mobile wallet support only in the appropriate browser/client context. Handle duplicate registration, hot reload, ordinary desktop browsers, missing wallets, unsupported wallet capabilities, supported clusters, reconnect, disconnect, and account changes. Retain the one existing client and wallet UI unless a specific change is necessary.

Prove this first integration gate on Android:

1. Open Pawket in the APK.
2. Connect an MWA-compatible wallet.
3. Execute a real sponsored Pawket instruction.
4. Preserve the sponsor's signature and exact message while the owner signs.
5. Broadcast through the existing send path with preflight enabled.
6. Confirm, reload the authoritative record, and show the signature/Explorer receipt.

Do not copy a generic `signAndSendTransactions` example into a new send path. Pawket needs the signer to work with an already partially signed transaction. The existing `sendPawket` and `sendPrepared` semantics matter, including extra signatures on server-prepared transactions. Retain message-integrity checks and validate transaction formats actually used by the current product.

Also exercise owner-paid sends, sponsor-unavailable behavior, cancellation, wallet rejection, blockhash expiration, slow confirmation, and unknown outcomes. A pending or unknown transaction must not be automatically retried as a fresh financial action. Recover by its known signature where available, using the existing lifecycle rules.

For Seed Vault, use the external wallet through MWA. Do not introduce key custody or attempt to export wallet keys.

## 8. Make every current signing flow work on Android

Build a transaction capability matrix from the code rather than from this list alone. Cover each distinct signer, payer, preparation path, and confirmation behavior.

At minimum, inspect and validate the current versions of:

- Keeping/adopting a pet on Solana and all four care actions.
- Recording a playground round and applying supported clothes.
- Keepsake creation through server preparation and its additional signatures.
- Guild founding, joining, leaving, gatherings, polls, and waves where implemented.
- Pawket Wallet creation, funding, withdrawals, linking, revocation, and closure where exposed.
- Delegated actions allowed by the current `DEVICE_VARIANTS`, using `usePawketSend().act` or its current authoritative replacement.
- Cosmetic purchases and dressing purchased items, if present.
- Guild-coin launch, trade, graduation, or fee claims, if present in the reviewed release.

Do not reinterpret who pays. For example, current coin transactions are owner-paid and prepared on the server; a cosmetic price is paid by its owner even where the sponsor covers transaction fees/rent. Derive the exact rules from current code and program accounts. Preserve disclosures and explicit confirmations for anything that moves money.

Keep Meteora/legacy SDK imports in the current server-only boundary. Do not pull those SDKs into the Android web bundle to work around mobile integration.

App switching must not duplicate actions, associate a result with the wrong owner/pet, or discard a visible receipt. After wallet/account changes, invalidate or refresh the appropriate owner-scoped state. Connecting a wallet itself must not initiate a transaction.

## 9. Required mobile product improvements

Implement useful Android behavior, not decorative demonstrations. The following are the recommended default feature set. You may improve the selection when actual investigation reveals a better user-facing solution, but explain substitutions and preserve equivalent product value.

### A. Native photo sharing and saving

- Make the existing room photo flow work reliably in the APK, preserving Pawket's current print/frame design and branding.
- Use Android's system share sheet for generated pictures and supported public links.
- Save/export pictures through an appropriate Android API without requesting unnecessary broad storage access.
- Share a safe content URI with the correct MIME type and temporary permissions. Clean up temporary artifacts appropriately.
- Handle cancellation, missing targets, failures, large images, and a changing app lifecycle honestly.
- Keep browser sharing/download fallbacks working outside Android.
- Do not upload photos merely to make sharing work. If uploading becomes necessary for a separate feature, it requires a justified privacy and product decision.

### B. Purposeful haptics

- Add subtle Android feedback to meaningful interactions, including a completed guest care or confirmed on-chain care.
- Respect device capabilities and user/system preferences. Provide a simple control if appropriate to the current settings pattern.
- Do not signal successful on-chain care before confirmation, add repetitive vibration during signing, or interfere with reduced-motion/accessibility preferences.

### C. Android navigation and return-to-play

- Support system back with dialogs/sheets, route history, and root behavior in a predictable order.
- Maintain the active pet, look, room, and relevant UI state across normal app switching and relaunch.
- Return from the wallet to a comprehensible transaction state and the right pet.
- Review gestures and pull-to-refresh behavior so game input or room interaction does not accidentally reload a transaction.
- Support external Explorer, help, privacy, and public-share links safely.

### D. Comfortable phone interaction

- Fix keyboard avoidance, edge-to-edge insets, status/navigation bars, tap targets, scrolling, and text overflow.
- Make the home care deck, Profile, playground, wallet, and current social/financial surfaces usable on small phones.
- Preserve the design system and desktop/tablet behavior. Avoid forking every screen into Android-only copies.

Do not build every optional idea. Additional possibilities include explicitly opted-in local care reminders, app shortcuts into the pet's home, verified public Passport deep links, or a deliberately scoped offline guest mode. Evaluate product fit, permissions, reliability, and repository deferrals before adopting them.

The current product documentation defers push notifications. Local reminders are a separate Android feature proposal, not permission to add a push service, account system, or notification backend. If implementing reminders, keep them local where feasible, opt-in, cancellable, and tied to the correct pet. They must never trigger automatic transactions, pretend to know unavailable chain state, or invent a new source of game math.

## 10. Android project, lifecycle, and platform quality

Configure stable application identity, package naming, app label, adaptive icon, splash treatment, version name/code, supported SDK levels, and orientation behavior. Reuse existing brand assets. Verify the generated project's actual toolchain requirements rather than presenting template defaults as contest requirements.

Use the official wallet-intent handling instead of a general-purpose signing bridge. Keep navigation restricted to trusted application origins. Open unrelated hosts in an appropriate external surface. Inspect how redirects, popups, file URLs, `intent:` URLs, and wallet schemes are handled. Do not expose native capabilities to arbitrary content or frames.

If adding web/native messages, validate origin, sender context, operation name, payload type, size, and permitted destination. Use a narrow modern messaging surface. Never accept arbitrary commands, filesystem paths, wallet signing requests, private keys, or unrestricted URL loads through the bridge.

Provide usable loading, connection failure, retry, and renderer-recovery behavior. Test foreground/background transitions, process recreation, and network interruption. Do not clear app storage as a default recovery action.

No release-only bypasses: disable WebView debugging where appropriate, use trusted HTTPS, handle permissions explicitly, and avoid logging sensitive payloads. Any local-development exception must be isolated from release configuration.

## 11. Storage, continuity, and Pawket Wallet

Read the current guest, companion, player-profile, and device-key modules. Preserve their authoritative record shapes and migrations. The native layer should not become a second store for pet vitals or chain truth.

WebView storage is generally separate from Chrome and wallet-app browser storage. Choose and document a truthful continuity story:

- Guest pets and local looks remain in the app's own storage.
- Pets on Solana reload through their owner wallet.
- A pet stored elsewhere does not appear in the APK by magic.
- Changing application origin can change access to local records and IndexedDB keys.
- Uninstalling or clearing app data can remove guest records and local device keys.

Do not promise browser-to-app migration without implementing it. If you add guest transfer, make it deliberate, validate the existing record schema, and transfer no private/device keys. Do not create a new network account or synchronization service without a strong need.

Pawket Wallet uses a non-extractable WebCrypto device key persisted in IndexedDB. Its permissions, sponsorship, fee float, expiry, and limits have evolved; read the current program and send hooks. Do not repeat older assumptions that devices can never be sponsored or can sign only care.

Verify key generation, non-extractability, IndexedDB persistence, app relaunch/update, owner-specific lookup, linking, actual authorized actions, expiry, limit exhaustion, and revocation. Verify behavior on supported Android System WebView versions; inspect current Ed25519 support rather than assuming every installed version works.

Keep unsupported capability errors clear. Ordinary owner-wallet signing must remain available when the device cannot act. Do not export or convert the key into raw private-key storage. Do not call this local delegated key Seed Vault-backed. Review backup/restore expectations and explain limitations without claiming cryptographic material is recoverable when it is not.

## 12. 3D, games, accessibility, and performance

Keep the current 3D renderer where it works well. Read `docs/ROOM-3D.md`, `docs/DESIGN.md`, `src/components/home/room.tsx`, and `src/components/room3d/` before changing it.

Verify:

- WebGL capability detection and a usable flat-room fallback.
- Rendering pause while backgrounded and correct recovery on return.
- Context loss, renderer errors, memory pressure, and interrupted asset loading.
- Phone rendering resolution, model/texture loading, and interaction responsiveness.
- Reduced motion, legible text, screen-reader labels, tap targets, contrast, and useful focus/dialog behavior.
- Audio startup under Android gesture rules, mute settings, and app interruption.
- All four games' gestures, layout, completion, and daily-round recording.
- Photo capture in both supported 3D and fallback situations, with honest unsupported states if needed.

Measure before optimizing. Do not disable expression or lower quality globally merely because one device is weak. Avoid unmeasured battery/performance claims. Rebuild 3D assets through the prescribed source pipeline; never hand-edit generated assets.

## 13. Network and offline behavior

The recommended architecture remains a hosted application. A retry screen is not offline gameplay. Document what requires the network: loading an uncached application, chain reads, wallet interactions where applicable, sponsorship, server preparation, and chain writes.

Preserve guest state across failures and offer a safe retry without duplicate transactions. Do not silently queue signed care, purchases, or trades for later broadcast. Never present stale cached chain data as a fresh confirmed record.

Add offline guest play only if deliberately designed and tested. Any caching/service worker must respect sensitive routes, owner-scoped data, deployment updates, source-of-truth reloads, and the existing game model. No fake offline Solana confirmation.

## 14. Release and concurrent hosting strategy

A hosted APK can change behavior when its website changes. Plan for this explicitly because other Pawket development is continuing.

- Identify the reviewed web commit and deployment used by the Android release.
- Use a stable trusted HTTPS origin accessible to reviewers; avoid an authentication-protected preview that judges cannot open.
- Record the shell commit, CLI/template version, web deployment identifier, public configuration, supported cluster, and APK digest.
- Preserve storage continuity when choosing release origins. Do not alternate hosts casually.
- Document how compatible web updates and native updates are released and verified.
- Prefer a coherent release baseline rather than whichever development commit happens to deploy while reviewers test.

Prepare deployment configuration locally where possible. Do not change the production site or make a preview public without the relevant authorization. If external setup is required, provide the ready artifact and precise configuration the owner needs to approve.

## 15. Build and signing deliverables

Produce an installable Android release APK, not just a debug launch, source tree, or AAB. Verify the output format expected by the submission system and store.

Provide repeatable scripts or commands for development builds, release builds, installation, and relevant Android checks. Keep versions and prerequisites explicit. Ensure a fresh checkout can reproduce the source build when supplied the documented public configuration and private signing inputs.

Keep release keystores and passwords outside tracked source. Reuse an established release key when available. If no established key exists, use a deliberate app release-signing setup and document ownership and secure backup without exposing secrets. Do not present a disposable debug key as a permanent release identity.

Verify APK package identity, version, signature, supported devices, installed cold-start behavior, and checksum. Keep generated binaries/build directories out of normal source commits unless the repository intentionally distributes releases that way.

For store preparation, assemble icons, screenshots, description, privacy information, permission explanations, support links, and publisher prerequisites. Clearly distinguish prepared materials from an actually published application. Do not claim a devnet release satisfies all later store/publication conditions without checking them.

## 16. Repository access and source licensing

Use the same repository by default. Current competition guidance supports private judging access. Do not change visibility or install a repository-access app without owner authorization.

Prepare instructions identifying exactly which source the judges need: Android project, hosted application, relevant server code, program, and release baseline. A public shell alone is insufficient context for reviewing the underlying product.

If the owner chooses public open sourcing, prepare a separate visibility/license checklist. Check applicable licenses, asset attribution, generated-template notices, tracked files, and history without printing secrets. Do not assume `package.json`'s `private` flag is a source license or repository visibility setting. Never publish signing material, `.env` contents, user keys, or operational credentials.

## 17. Verification strategy

Follow `docs/TESTING.md` and `docs/WORKFLOW.md`. Use meaningful tests for changed behavior and boundaries. Avoid implementation-mirroring tests or a large snapshot suite that adds little evidence.

Run the repository's required `pnpm verify` gate and appropriate web end-to-end checks. Run the program/lockstep suites if program, IDL, builders, or game rules are changed as required by repository instructions. Such changes should normally be unnecessary for the Android adaptation.

Use existing opt-in devnet suites and dedicated development fixtures where appropriate. Inspect the current commands before running them, including any coin-specific suite. Keep automated development actions on explicitly configured development clusters; never silently target mainnet or use production/player wallets for tests.

Add Android evidence for behavior desktop Playwright cannot establish. Use available emulator/device tooling and actual MWA-compatible wallets. The official mock MWA wallet can help isolate integration behavior, but it is not proof that every real wallet works.

Maintain a compact verification matrix including:

| Area | Required evidence |
| --- | --- |
| Installation | Release APK installs, cold-starts, and updates without unintended data loss |
| Guest loop | Adopt, care, change pet/look/room, relaunch, and reopen the same local record |
| Mobile wallet | Connect, reject/cancel, reconnect, switch accounts, and return from wallet |
| Sponsored signing | Sponsor signature preserved, owner signature added, confirmed chain reload and receipt |
| Owner-paid/prepared signing | Current financial/server-prepared flows retain signer and payer semantics |
| Delegation | Supported device actions, limits, persistence, revocation, and safe owner-wallet fallback |
| Sharing | Native image/link share and image save, including cancellation and permission handling |
| Lifecycle | Back, keyboard, background/resume, interruption, renderer recovery, and no duplicate sends |
| Existing product | Current games, profile, Passport, social features, Market/coins where supported |
| Network failures | Honest retry/unknown state, retained local data, and no false confirmation |
| Web regression | Existing browser users keep their normal wallet, sharing, storage, and layout behavior |
| Release hygiene | Reproducible build, signed artifact, checksum, no embedded secrets, documented origin |

Record what was actually run, on which environment/device, with which wallet and WebView, and what passed. Distinguish static inspection, mocks, emulators, and physical-device results. Never present unrun checks as passing. If hardware or credentials are unavailable, complete all independent work, provide the artifact, and name the exact remaining verification rather than calling the release fully verified.

## 18. Submission and presentation package

Prepare a truthful package suitable for reviewer use:

- A concise product description focused on companionship and verifiable care history.
- An explanation of why mobile materially improves Pawket.
- A clear split between pre-existing product and new mobile implementation, supported by source changes.
- A reproducible source/build guide and private-repository-access instructions where applicable.
- The signed APK, version/checksum, installation instructions, cluster label, and any reviewer prerequisites.
- Screenshots from the actual Android build, not invented mockups presented as implementation.
- A pitch outline and a demo script using real current behavior.
- A feature/verification summary, explicit limitations, and store-readiness checklist.

The core demo should show installation/opening, guest adoption and care, MWA connection, keeping a pet on Solana, a confirmed care and its receipt, the public Passport, a useful mobile feature, and return/relaunch continuity. Adjust the sequence to the current product's actual entry flow. Keep financial/social extensions subordinate to the companion proposition unless they materially strengthen the explanation.

Do not fabricate users, retention, counts, revenue, benchmarks, endorsements, transaction success, or chain records. A demo seed is a demonstration fixture, not evidence of traction. Reuse live chain-derived counts only where the existing source actually reads them.

Prepare recording instructions and capture the demo when tools/device access permit. Do not upload, publish, submit, or message organizers under the owner's identity without authorization. Identify any remaining owner-only step with concrete artifacts ready for review.

## 19. Completion criteria

The implementation is complete when:

- [ ] The current product and relevant official requirements were audited, with important assumptions resolved or explicitly bounded.
- [ ] Concurrent work and the existing web product were preserved.
- [ ] The selected architecture is justified and its source lives in the appropriate repository boundary.
- [ ] A release-signed APK exists, installs, and points to the documented trusted release origin.
- [ ] MWA genuinely supplies the owner signer to Pawket's existing transaction system.
- [ ] Sponsored, owner-paid, prepared, and delegated paths used by the current release retain their required behavior.
- [ ] Confirmed state and visible receipts remain authoritative; cancellation and unknown outcomes are handled safely.
- [ ] Useful Android improvements are implemented and verifiable, rather than only described.
- [ ] Guest storage, device-key limitations, and on-chain recovery are explained accurately.
- [ ] Android navigation, lifecycle, small-screen interaction, sharing, and 3D/fallback behavior are tested.
- [ ] Browser regressions and required repository checks are addressed.
- [ ] The release can be reproduced and signing secrets stay out of source/APK content.
- [ ] Submission materials and store preparation are complete to the extent available tools permit.
- [ ] Any remaining external approval, hardware check, or configuration dependency is precisely stated.
- [ ] The persistent handoff accurately maps requirements to implemented and verified work, records unfinished changes, and provides a concrete continuation action.
- [ ] Another agent can locate the relevant source, reproduce recorded checks, and continue from the handoff without access to this conversation.

Do not treat deferred work as completed. If a requirement remains blocked, deliver the working artifact and report the gap; do not dilute the acceptance criteria or conceal the limitation.

## 20. Final implementation report

Lead with what was delivered and what the owner can install or review. Then provide:

1. Architecture decisions and meaningful mobile features.
2. Changed files and how shared source-of-truth boundaries were preserved.
3. APK location, package/version, checksum, release origin, and build instructions.
4. Verification results, devices/wallets used, and checks not performed.
5. Remaining limitations or external prerequisites.
6. Links to demo, pitch, source-access, and release/store preparation materials.
7. Any specific owner approval needed, with all preparatory work complete.
8. The handoff location, current implementation state, and first continuation action if anything remains.

Keep user-facing progress useful and concise. Do not replace evidence with confidence. Keep calendar information and implementation duration estimates out of the deliverables unless the owner later requests them.

## 21. Persistent tracking and cross-agent continuation

Maintain one concise, model-independent `docs/ANDROID-HANDOFF.md`. This is a work record, not a replacement for code, `AGENTS.md`, this brief, or the existing product specifications. It must be readable by an agent that has never seen this conversation and may be using a different account, model, device, or tool environment.

### Starting or resuming

1. Read this brief, the current repository instructions, and any existing handoff.
2. Inspect the actual branch, commit, worktree, staged/unstaged diff, and untracked files. Record what belongs to this task and what belongs to other work.
3. Confirm that the handoff refers to this checkout. Resolve source-state discrepancies before dependent edits; preserve unrelated changes.
4. Check whether listed artifacts, local services, configuration, device access, and tool versions are still available. A previous agent's tool-session identifier is not proof that a process is running now.
5. Select the next unfinished requirement and continue. Do not rebuild or redesign completed, verified work simply because you are a new agent.

One agent should own this Android implementation's writes at a time. A handoff does not authorize changing account settings, switching identities, sending prompts to another chat, or stopping unrelated Pawket development. When the owner moves the task, leave the next agent usable files and a clear checkpoint.

### What the handoff must contain

Use the following structure, adapting detail to the work actually performed:

```markdown
# Pawket Android handoff

## Current objective and checkpoint
- Checkpoint identifier:
- Overall state: not started / in progress / blocked / complete
- Current task:
- Next concrete action:
- Immediate caution for the next agent, if any:

## Source and working environment
- Repository identity, branch, worktree, and baseline commit:
- Latest task commit, if any:
- Task-owned staged, unstaged, and untracked files:
- Unrelated changes to preserve:
- Toolchain/dependency versions and non-secret configuration requirements:
- Commands for necessary local services:
- Release origin and reviewed web/shell source revisions, if selected:

## Requirements and progress
| Requirement | State | Source/artifact | Verification evidence | Remaining work |
| --- | --- | --- | --- | --- |

## Decisions and constraints
- Decision, reason, supporting source, and affected modules:
- Rejected approach and why, only when useful to prevent repeating it:
- Unresolved assumption or owner decision:

## Verification record
| Check | Command or procedure | Environment/device/wallet | Result | Evidence or failure |
| --- | --- | --- | --- | --- |

## Unfinished implementation and blockers
- Partial edits and what still needs to be connected:
- Failure reproduction and useful error summary:
- Attempts already made and their results:
- Whether the blocker prevents all work or only a particular requirement:
- Safe independent work that remains:

## Artifacts and release preparation
- APK/build output, version, signature verification, and checksum:
- Build/install instructions and public configuration references:
- Demo/screenshots/pitch/source-access materials:
- What is prepared versus actually published or submitted:
- External prerequisites or approvals still required:

## Continuation procedure
1. First exact inspection or action:
2. Expected result and verification:
3. What to do next, including a failure branch where useful:
```

For requirement rows, use explicit states: `not started`, `in progress`, `implemented; unverified`, `verified`, or `blocked`. Map the major build requirements and completion criteria to these rows. Do not mark an item verified based only on source inspection, a mock, or a different platform when it needs Android runtime evidence.

Record actual changed file paths and relevant symbols, commands and results, public source references, and artifact locations. Explain meaningful decisions in concise prose. Do not transcribe hidden reasoning, dump an entire conversation, or make the next agent reconstruct an implementation from screenshots of chat.

### When to update

Create the initial handoff before substantive edits. Refresh it after meaningful milestones, architecture changes, successful verification, significant failures, or scope changes. Before a risky change, record the current known-good state and intended change. Keep partial work understandable rather than documenting only completed features.

Always update it before a planned stop, agent/account transition, or context becoming tight. Do not wait until token or usage exhaustion is imminent. Preserve a small, current checkpoint throughout work so an abrupt stop does not erase the latest useful state. A handoff update is part of implementation, not a reason to end the task early.

Keep the latest state compact. Link to longer evidence or existing documentation instead of duplicating it. Preserve the reasons needed to avoid repeating failed approaches, but remove stale instructions or clearly supersede them. Use checkpoints and source revisions; omit development calendars and completion-duration estimates.

### Files must accompany the handoff

The handoff cannot substitute for unfinished source changes. On the same machine, make sure the next agent knows the actual worktree and task-owned uncommitted/untracked files. If the owner moves to another machine, explain which source and artifacts must accompany the handoff and which environment inputs must be configured separately. Do not assume a remote branch includes uncommitted local work.

Do not stage, stash, commit, or overwrite unrelated work to make transfer convenient. Follow the owner's Git instructions. Keep handoff documentation with the task's reviewable source changes when appropriate. Do not silently switch to a different checkout and claim continuation of changes that were left behind.

### Secrets, external actions, and truthful completion

Never put private keys, keystore passwords, seed phrases, access tokens, cookie values, or `.env` contents in the handoff. Record configuration names and secure setup requirements instead. Do not copy secrets between accounts in an attempt to preserve continuity.

For blockers, state the exact missing capability or external action and continue independent work where possible. For completion, retain reproducible release information and final verification evidence. Mark the build complete only when its acceptance criteria are satisfied; distinguish a complete local build from an approved publication or submission.

Proceed by reconciling the current checkout and handoff, proving real MWA-sponsored signing, and carrying the selected implementation through the full acceptance criteria while maintaining this continuation record.
