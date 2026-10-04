# Pawket — Mainnet (v1) runbook

**Status:** PLAN. Everything before mainnet is v0 (`DECISIONS.md`, "Everything
before mainnet is v0"); mainnet is v1. Nothing here runs until the team
decides to launch, and the code never targets mainnet by default — the
cluster comes from env.

## 1. What changes at v1

| Area | Devnet (v0) | Mainnet (v1) |
| --- | --- | --- |
| Program | `PawkHv…eM74`, upgradeable by one deploy wallet | the same address (its keypair is `.keys/pawket-program.json`), upgrade authority a **Squads multisig** |
| Treasury | `SEpAw5i…vWfw`, a single key in `.keys/treasury.json` | a Squads vault; `TREASURY` in `lib.rs` and `MARKET.treasury` change together |
| Sponsor | pays fees and rent from a devnet float | **off by default** (`sponsorState` refuses mainnet today); turning it on is a budget decision (§3) |
| Market prices | 0.05 / 0.1 devnet SOL | set for mainnet before the build (`item_price`); only an upgrade changes them |
| Guild coins | two presets on devnet configs | presets made on mainnet (`scripts/coin-presets.mts mainnet-beta`) **only after legal review (Q6)**; mainnet thresholds are ≥ 10 SOL so Meteora's keepers migrate them |
| Keepsakes | a devnet collection | a new collection (`scripts/keepsake-collection.mts`), its authority separated from the sponsor's hot key |
| RPC | public devnet endpoint | a paid provider (`SOLANA_RPC_URL`, server-only); the holder count and `/pulse` scan the chain |
| Rate limits | per serverless instance, in memory | a shared store (e.g. Upstash Redis) behind `createLimiter` |
| Pets | devnet pets | mainnet starts empty: devnet records do not move, and the app says so |

## 2. Decisions to make first

1. **Who pays fees on mainnet.** A sponsored mainnet adoption costs about
   0.004 SOL of rent (§3) plus fees. Options: keep the sponsor off (players
   pay, the Pawket Wallet makes it prompt-free), sponsor only adoption, or
   sponsor everything up to a daily budget.
2. **Rent recovery.** No instruction closes a pet. Before mainnet, decide on
   a `release_pet` that closes Pet + Passport and returns rent to whoever
   paid it — which needs the payer recorded at adoption (a new adoption
   instruction; the old one stays).
3. **Market prices** in SOL (and whether to revisit them as SOL moves).
4. **Coin presets and copy** signed off by legal review (Q6); the disclosure
   in `src/lib/coins/copy.ts` is the text reviewed.
5. **Audit scope.** The Pawket Wallet holds player lamports; `buy` moves
   them to the treasury; both deserve an external review before v1.

## 3. What each account costs (rent, paid once)

Rent-exempt minimum = (size + 128) × 6,960 lamports.

| Account | Size | Rent | Paid by today |
| --- | --- | --- | --- |
| Pet | 130 | 0.0018 SOL | sponsor (adoption) |
| PetPassport | 169 | 0.0021 SOL | sponsor (adoption) |
| Guild | 235 | 0.0025 SOL | sponsor |
| GuildMember | 145 | 0.0019 SOL | sponsor, returned on leave |
| PawketWallet | 157 | 0.0020 SOL | the owner, returned on close |
| Closet | 83 | 0.0015 SOL | sponsor, once per buyer |
| GuildEvent | 285 | 0.0029 SOL | sponsor |
| EventRsvp | 146 | 0.0019 SOL | sponsor |
| GuildPoll | 309 | 0.0030 SOL | sponsor |
| Ballot | 146 | 0.0019 SOL | sponsor |
| Guestbook | 365 | 0.0034 SOL | sponsor, once per pet |

A player who adopts, joins a guild and gets one guestbook costs the sponsor
about 0.009 SOL in rent. The Market's margin and Pawket's share of coin fees
are what pay for it.

## 4. Checklist

**Before the build**
- [ ] `TREASURY` / `MARKET.treasury` set to the Squads vault; `item_price` set.
- [ ] `pnpm program:test` green; `program.test.ts` green (it holds both to each other).
- [ ] External review of the program done, findings closed.
- [ ] Legal sign-off on coin copy recorded in `OPEN-QUESTIONS.md` (Q6), or coins left off.

**Deploy**
- [ ] `solana program deploy target/deploy/pawket.so --program-id .keys/pawket-program.json --url mainnet-beta`
- [ ] `solana program set-upgrade-authority <program> --new-upgrade-authority <squads multisig>`
- [ ] Keepsake collection made on mainnet; `PAWKET_COLLECTION` per cluster.
- [ ] Coin presets made on mainnet (if Q6 is signed); `COIN_CONFIGS["mainnet-beta"]` filled.

**Environment (Vercel, production)**
- [ ] `NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta`, a mainnet `NEXT_PUBLIC_SOLANA_RPC_URL`.
- [ ] `SOLANA_RPC_URL` (paid provider, server-only).
- [ ] `SPONSOR_KEYPAIR` only if §2.1 says the sponsor pays; it is never the upgrade authority or the treasury.

**After**
- [ ] `pnpm e2e:devnet` and `pnpm e2e:coins` pointed at mainnet with a funded test wallet and tiny amounts.
- [ ] `/pulse` reads mainnet; the landing's live strip says mainnet.
- [ ] Monitoring: Vercel logs alerting on 5xx from `/api/sponsor` and `/api/coins/*`.
- [ ] Program binary dumped to `.keys/backups/` before every later upgrade.
