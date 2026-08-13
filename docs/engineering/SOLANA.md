# Solana / Anchor engineering

Program: `programs/pawket/programs/pawket/src/lib.rs`  
Anchor 0.31.1 · program ID `FQwe9LUPMTrhYyr32mHPpX87tcpjr98Eamz9wJQDaSef`

The program is real. The **live app does not use it yet**. Mobile shows the program ID; it does not send instructions. Treat this file as the contract so the first wiring cannot drift.

## Program

Single module today. Split only when a second file has a clear account/instruction boundary.

### Instructions

| Instruction              | Args                                 | Who signs   | Notes                                                            |
| ------------------------ | ------------------------------------ | ----------- | ---------------------------------------------------------------- |
| `initialize_game_config` | `treasury: Pubkey`                   | `authority` | First caller becomes authority. Nothing else reads this account. |
| `adopt_pet`              | `name`, `species`, `personality`     | `owner`     | Inits pet + passport PDAs.                                       |
| `perform_care_action`    | `action`                             | `owner`     | Owner-gated, per-action 1800s cooldown.                          |
| `register_item`          | `sku`, `item_type`, `price_lamports` | any signer  | **Not** admin-gated. Do not ship as admin.                       |
| `record_purchase`        | `quantity`                           | buyer       | **Does not transfer tokens.** Do not ship as checkout.           |

SDK builders exist only for the first three.

### Accounts and PDAs

| Account          | Seeds                              | Space            |
| ---------------- | ---------------------------------- | ---------------- |
| `GameConfig`     | `[b"game_config"]`                 | `8 + INIT_SPACE` |
| `Pet`            | `[b"pet", owner, name.as_bytes()]` | `8 + INIT_SPACE` |
| `PetPassport`    | `[b"passport", pet.key()]`         | `8 + INIT_SPACE` |
| `ItemDefinition` | `[b"item", sku.as_bytes()]`        | `8 + INIT_SPACE` |
| `ItemOwnership`  | `[b"ownership", owner, item]`      | `8 + INIT_SPACE` |

Pet identity is `(owner, exact UTF-8 name bytes)`. No rename. No close. Same name + same owner cannot be re-adopted.

Passport on-chain is an `event_count`. The timeline is API-only.

### Enums (Borsh index)

`PetSpecies` LunaCat=0, MossPup=1, CloudBun=2  
`PetPersonality` Curious=0, Cozy=1, Brave=2, Mischief=3  
`CareActionType` Feed=0, Play=1, Groom=2, Rest=3

Shared TS uses string enums (`luna_cat`, `feed`). Only `solanaClient.ts` translates to Borsh indexes.

### Care math (must match `@pawket/shared`)

| Action | Hunger | Happiness | Energy | Hygiene |
| ------ | ------ | --------- | ------ | ------- |
| Feed   | +23    | +2        | —      | —       |
| Play   | −6     | +23       | −12    | —       |
| Groom  | —      | +3        | —      | +25     |
| Rest   | —      | —         | +28    | —       |

XP +10, level `xp/100+1`, stats clamped 0–100, cooldown 1800s **per action**. Initial stats 72.

**On-chain does not apply decay.** Off-chain care applies decay first. Dual-writing the same action without a reconciliation plan will desync vitals.

### Events / errors

Events: `GameConfigInitialized`, `PetAdopted`, `CarePerformed`, `PurchaseRecorded`.  
Errors 6000–6005: `InvalidPetName`, `NotPetOwner`, `CareCooldownActive`, `InvalidSku`, `InactiveItem`, `InvalidQuantity`.

## Rust conventions

- Accounts: `#[account] #[derive(InitSpace)]`, store the bump.
- Constraints: seeds + bump on every PDA; `has_one = owner` on care.
- Arithmetic: saturating add/sub, then `.min(100)` for stats. Never wrap `u8`.
- Names: `snake_case` instructions, `PascalCase` accounts. Mirror existing names.
- Constants at the top of `lib.rs` stay twins of `packages/shared/src/constants.ts`. `pnpm invariants` enforces the numeric ones.

## Safety rules

1. Do not change PDA seed strings or order.
2. Care signer must remain `pet.owner` (`has_one` + seed).
3. Name 2–24 UTF-8 bytes. Program does **not** trim — clients must trim before deriving. Shared Zod is JS string length, not bytes — ASCII names until that is unified.
4. SKU 2–32 UTF-8 bytes (PDA seed cap). Never raise this to 64.
5. Do not add a close/reinit without replay protection.
6. Do not treat `record_purchase` as paid.
7. Do not treat `register_item` as admin.
8. `GameConfig` is currently unused by later instructions. If you add an admin path, gate it on `game_config.authority`.
9. Clock is `Clock::get()?.unix_timestamp`. Tests that care about cooldown must warp/sleep.

## Client / program boundary

`packages/pawket-sdk/src/solanaClient.ts` is a **manual** web3.js builder, not `anchor.Program`.

It must stay aligned on:

- Program ID
- 8-byte discriminators
- Account metas (order, signer, writable)
- Arg encoding: Anchor string = `u32 LE length + utf8`; enums = 1-byte variant
- PDA seeds

Committed IDL: `programs/pawket/idl/pawket.json`. After `anchor build`:

```sh
pnpm idl:sync
pnpm invariants
```

Then update builders/tests if the IDL changed.

`PawketProgramClient` constructs unsigned `Transaction`s. It does not fetch accounts, subscribe, or send.

Mobile must call these builders — never assemble instruction bytes in a screen.

## Adding an instruction

Use skill `adding-solana-instruction`. You are not done until Rust, committed IDL, SDK builder, SDK test, and (non-stub) Anchor test all move together.
