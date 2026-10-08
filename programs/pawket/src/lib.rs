//! Pawket: a companion whose care is its record.
//!
//! A `Pet` PDA (`[b"pet", owner, name]`) holds the vitals, XP, cooldowns and what it is wearing.
//! Its `PetPassport` (`[b"passport", pet]`) holds the record: the UTC-day streak, the counts and
//! the last eight cares.
//!
//! Decay is lazy. Stored vitals are their value at `stats_updated_at`; every care first decays
//! them forward with the integer arithmetic below, which is `applyStatDecay` in
//! `src/lib/game/math.ts` exactly. A client projects the same function forward for display.
//! Every number here moves with `src/lib/game/constants.ts`, or neither moves.
//!
//! A pet can belong to one guild: a `Guild` PDA (`[b"guild", slug]`) founded by a pet, and a
//! `GuildMember` PDA (`[b"member", pet]`) per pet in it. A guild is people and their pets, and nothing
//! else — no token, no treasury, no vote weight, and nothing in it touches a vital, XP or a score.
//!
//! A player can keep a Pawket Wallet: a `PawketWallet` PDA (`[b"wallet", owner]`) whose lamports above
//! rent are a balance only its owner can fill or empty — a withdrawal only ever goes back to the
//! owner. The owner can link one device key to it, for up to 30 days and a set number of actions a
//! UTC day; the device may then do for the owner's pets what the owner signs for — care, rounds,
//! clothes, adoption, guilds, gatherings and waves (each `*_by_device`) — without the owner signing
//! each one, and nothing that moves money. A sponsor may pay its fees and rent as it does the
//! owner's; when the device pays its own fee, each action refills it from the balance by at most
//! that fee, so the balance pays for those actions and for nothing else.
//!
//! The Market sells looks for SOL at prices fixed here (`item_price`): a sale goes from the owner
//! straight to Pawket's treasury, and the owner's `Closet` (`[b"closet", owner]`) records it for
//! good. A piece from the Market is worn with `dress_owned`; nothing bought changes a vital, XP, a
//! cooldown or a score.
//!
//! A guild's founder can plan events (`GuildEvent`, `[b"event", guild, id]`) that its pets RSVP to
//! and check in at (`EventRsvp`, `[b"rsvp", event, pet]`), and open polls (`GuildPoll`,
//! `[b"poll", guild, id]`) that each wallet with a pet in the guild answers once (`Ballot`,
//! `[b"ballot", poll, owner]`). Anyone but its owner can wave at a pet, once a UTC day; its
//! `Guestbook` (`[b"guestbook", pet]`) keeps the last eight.
//!
//! Nothing here moves value except rent, which `payer` covers so a sponsor can adopt (or found, or
//! join, or open a closet, an event, a poll, a guestbook) on a player's behalf while the player
//! alone signs, a player's own Pawket Wallet, and a Market sale, which goes only to the treasury. Leaving a guild hands the member account's rent back to
//! whoever paid it.
#![allow(clippy::result_large_err)]

use anchor_lang::{prelude::*, system_program, Discriminator};

declare_id!("PawkHvXJKfsUfKs8mgLS7FXbLuNZ43fwEFGkzYdeM74");

pub const MIN_NAME_LEN: usize = 2;
pub const MAX_NAME_LEN: usize = 24;
pub const MAX_STAT: u8 = 100;
pub const INITIAL_STAT_VALUE: u8 = 72;
pub const CARE_COOLDOWN_SECONDS: i64 = 30 * 60;
pub const XP_PER_CARE_ACTION: u32 = 10;
pub const DAILY_GOAL_REWARD_XP: u32 = 25;
pub const BASE_XP_PER_LEVEL: u32 = 100;
/// Points lost per hour, in tenths: hunger 2.5, happiness 1.8, energy 1.5, hygiene 1.2.
pub const DECAY_TENTHS_PER_HOUR: [i64; 4] = [25, 18, 15, 12];
/// The wardrobe in `src/lib/closet/catalog.ts`, numbered from 1 in catalog order. 0 is nothing.
pub const WEARABLE_COUNT: u8 = 3;
/// How many cares the Passport keeps, newest overwriting oldest.
pub const RECENT_CARES: usize = 8;
pub const SECONDS_PER_DAY: i64 = 86_400;

pub const PET_SEED: &[u8] = b"pet";
pub const PASSPORT_SEED: &[u8] = b"passport";
pub const GUILD_SEED: &[u8] = b"guild";
pub const MEMBER_SEED: &[u8] = b"member";

/// A guild's slug is its seed: 3 to 24 of `a-z`, `0-9` and `-`, never starting or ending with `-`.
pub const MIN_SLUG_LEN: usize = 3;
pub const MAX_SLUG_LEN: usize = 24;
/// What a guild is called, in UTF-8 bytes.
pub const MIN_GUILD_NAME_LEN: usize = 3;
pub const MAX_GUILD_NAME_LEN: usize = 32;
pub const MAX_MOTTO_LEN: usize = 80;
/// Glyphs and colours a crest is drawn from: `src/lib/guilds/guild.ts`, in order.
pub const CREST_COUNT: u8 = 8;
pub const COLOUR_COUNT: u8 = 6;

pub const WALLET_SEED: &[u8] = b"wallet";
/// A device stays linked this long at most before its owner links it again.
pub const MAX_DEVICE_SECONDS: i64 = 30 * SECONDS_PER_DAY;
/// The most a device may do in one UTC day, whatever its owner allows.
pub const MAX_DAILY_ACTIONS: u16 = 500;
/// What a device keeps on hand for its own fees: its rent-exempt minimum and change.
pub const DEVICE_FLOAT_LAMPORTS: u64 = 1_000_000;
/// One signature's fee. A device's action is refilled by at most this much.
pub const FEE_PER_SIGNATURE: u64 = 5_000;

pub const CLOSET_SEED: &[u8] = b"closet";
pub const EVENT_SEED: &[u8] = b"event";
pub const RSVP_SEED: &[u8] = b"rsvp";
pub const POLL_SEED: &[u8] = b"poll";
pub const BALLOT_SEED: &[u8] = b"ballot";
pub const GUESTBOOK_SEED: &[u8] = b"guestbook";

/// Where every Market sale goes: Pawket's treasury.
pub const TREASURY: Pubkey = pubkey!("SEpAw5iTAXf4j5YUsgpLD8UTKLCT6xqUAkecnvJvWfw");
/// The Market's wardrobe: pieces after the eighteen (slots 19–22), worn with `dress_owned`.
pub const MARKET_WEARABLE_COUNT: u8 = 19;
/// The Market's rooms, as item ids from 64. The app draws them; the Closet records them.
pub const FIRST_ROOM_ITEM: u8 = 64;
pub const MARKET_ROOM_COUNT: u8 = 8;
pub const FIRST_FRAME_ITEM: u8 = 80;
pub const MARKET_FRAME_COUNT: u8 = 4;
pub const FRAME_PRICE_LAMPORTS: u64 = 25_000_000;
pub const WEARABLE_PRICE_LAMPORTS: u64 = 50_000_000;
pub const ROOM_PRICE_LAMPORTS: u64 = 100_000_000;

/// An event's title and note, in UTF-8 bytes, and how far ahead and how long it may run.
pub const MIN_EVENT_TITLE_LEN: usize = 3;
pub const MAX_EVENT_TITLE_LEN: usize = 48;
pub const MAX_EVENT_NOTE_LEN: usize = 120;
pub const MAX_EVENT_SECONDS: i64 = 7 * SECONDS_PER_DAY;
pub const MAX_EVENT_LEAD_SECONDS: i64 = 60 * SECONDS_PER_DAY;
/// A pet can check in this long before its event starts.
pub const CHECK_IN_EARLY_SECONDS: i64 = 15 * 60;

/// A poll's question and options, in UTF-8 bytes, and how long it stays open.
pub const MIN_POLL_QUESTION_LEN: usize = 3;
pub const MAX_POLL_QUESTION_LEN: usize = 80;
pub const MAX_POLL_OPTION_LEN: usize = 24;
pub const MIN_POLL_OPTIONS: usize = 2;
pub const MAX_POLL_OPTIONS: usize = 4;
pub const MIN_POLL_SECONDS: i64 = 10 * 60;
pub const MAX_POLL_SECONDS: i64 = 14 * SECONDS_PER_DAY;

/// How many visitors a guestbook keeps, newest overwriting oldest.
pub const RECENT_WAVES: usize = 8;

#[program]
pub mod pawket {
    use super::*;

    /// A new pet at 72 across the board. The owner signs for the name; `payer` covers rent and
    /// may be the owner or a sponsor.
    pub fn adopt_pet(
        ctx: Context<AdoptPet>,
        name: String,
        species: PetSpecies,
        personality: PetPersonality,
    ) -> Result<()> {
        let bumps = (ctx.bumps.pet, ctx.bumps.passport);
        let a = ctx.accounts;
        adopt(&mut a.pet, &mut a.passport, a.owner.key(), name, species, personality, bumps)
    }

    /// Adoption signed by the owner's linked device: the pet is the owner's, at the owner's address.
    pub fn adopt_pet_by_device(
        ctx: Context<AdoptPetByDevice>,
        name: String,
        species: PetSpecies,
        personality: PetPersonality,
    ) -> Result<()> {
        let bumps = (ctx.bumps.pet, ctx.bumps.passport);
        let a = ctx.accounts;
        act(&mut a.wallet, &a.device, Clock::get()?.unix_timestamp)?;
        adopt(&mut a.pet, &mut a.passport, a.wallet.owner, name, species, personality, bumps)
    }

    /// Feed, play, groom or rest: decay to now, apply the locked deltas, +10 XP, then write the
    /// Passport. Each action waits 30 minutes after its last use.
    pub fn perform_care_action(ctx: Context<Care>, action: CareActionType) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        care(&mut ctx.accounts.pet, &mut ctx.accounts.passport, action, now)
    }

    /// A finished playground round. The first of a UTC day adds 25 XP; every one counts as a play
    /// and as showing up. Vitals and cooldowns stay where they are.
    pub fn finish_round(ctx: Context<Care>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        round(&mut ctx.accounts.pet, &mut ctx.accounts.passport, now)
    }

    /// Put something on, or take it off with 0. Looks only: nothing else on the pet changes.
    pub fn dress(ctx: Context<Dress>, wearing: u8) -> Result<()> {
        dress_pet(&mut ctx.accounts.pet, wearing)
    }

    /// A pet founds a guild and is its first member. The slug is the guild's address, so a name is
    /// one guild; `payer` covers the rent of both accounts.
    pub fn found_guild(
        ctx: Context<FoundGuild>,
        slug: String,
        name: String,
        motto: String,
        crest: u8,
        colour: u8,
    ) -> Result<()> {
        let bumps = (ctx.bumps.guild, ctx.bumps.member);
        let a = ctx.accounts;
        let who = Who { owner: a.owner.key(), pet: a.pet.key(), payer: a.payer.key() };
        found(&mut a.guild, &mut a.member, who, slug, name, motto, crest, colour, bumps)
    }

    /// A founding signed by the owner's linked device.
    pub fn found_guild_by_device(
        ctx: Context<FoundGuildByDevice>,
        slug: String,
        name: String,
        motto: String,
        crest: u8,
        colour: u8,
    ) -> Result<()> {
        let bumps = (ctx.bumps.guild, ctx.bumps.member);
        let a = ctx.accounts;
        act(&mut a.wallet, &a.device, Clock::get()?.unix_timestamp)?;
        let who = Who { owner: a.wallet.owner, pet: a.pet.key(), payer: a.payer.key() };
        found(&mut a.guild, &mut a.member, who, slug, name, motto, crest, colour, bumps)
    }

    /// A pet joins a guild. A pet is in one guild at most: its member account is seeded by the pet.
    pub fn join_guild(ctx: Context<JoinGuild>) -> Result<()> {
        let a = ctx.accounts;
        let who = Who { owner: a.owner.key(), pet: a.pet.key(), payer: a.payer.key() };
        join(&mut a.guild, &mut a.member, who, ctx.bumps.member)
    }

    /// A join signed by the owner's linked device.
    pub fn join_guild_by_device(ctx: Context<JoinGuildByDevice>) -> Result<()> {
        let a = ctx.accounts;
        act(&mut a.wallet, &a.device, Clock::get()?.unix_timestamp)?;
        let who = Who { owner: a.wallet.owner, pet: a.pet.key(), payer: a.payer.key() };
        join(&mut a.guild, &mut a.member, who, ctx.bumps.member)
    }

    /// A pet leaves its guild. The member account closes and its rent goes back to whoever paid it.
    /// The guild stays, with one fewer; a guild with nobody in it is still on the record.
    pub fn leave_guild(ctx: Context<LeaveGuild>) -> Result<()> {
        leave(&mut ctx.accounts.guild, ctx.accounts.pet.key())
    }

    /// Leaving, signed by the owner's linked device. The rent still goes back to whoever paid it.
    pub fn leave_guild_by_device(ctx: Context<LeaveGuildByDevice>) -> Result<()> {
        let a = ctx.accounts;
        act(&mut a.wallet, &a.device, Clock::get()?.unix_timestamp)?;
        leave(&mut a.guild, a.pet.key())
    }

    /// The owner's Pawket Wallet: a balance only they can fill or empty, and room for one linked
    /// device. `payer` covers its rent, and gets it back when the wallet closes.
    pub fn open_wallet(ctx: Context<OpenWallet>) -> Result<()> {
        let owner = ctx.accounts.owner.key();
        ctx.accounts.wallet.set_inner(PawketWallet {
            owner,
            device: Pubkey::default(),
            device_expires_at: 0,
            daily_actions: 0,
            day: 0,
            actions_today: 0,
            actions: 0,
            deposited: 0,
            withdrawn: 0,
            spent: 0,
            rent_payer: ctx.accounts.payer.key(),
            created_at: Clock::get()?.unix_timestamp,
            bump: ctx.bumps.wallet,
        });
        emit!(WalletOpened {
            owner,
            wallet: ctx.accounts.wallet.key(),
        });
        Ok(())
    }

    /// `amount` lamports from the owner's own wallet into their Pawket Wallet.
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, PawketError::InvalidAmount);
        system_program::transfer(
            CpiContext::new(
                system_program::ID,
                system_program::Transfer {
                    from: ctx.accounts.owner.to_account_info(),
                    to: ctx.accounts.wallet.to_account_info(),
                },
            ),
            amount,
        )?;
        let wallet = &mut ctx.accounts.wallet;
        wallet.deposited = wallet.deposited.saturating_add(amount);
        emit!(WalletDeposited {
            owner: wallet.owner,
            amount,
        });
        Ok(())
    }

    /// `amount` lamports from the Pawket Wallet back to its owner — only ever to its owner, and
    /// never into the rent that keeps the account alive.
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        require!(amount > 0, PawketError::InvalidAmount);
        let info = ctx.accounts.wallet.to_account_info();
        require!(amount <= spendable(&info)?, PawketError::InsufficientBalance);
        info.sub_lamports(amount)?;
        ctx.accounts.owner.add_lamports(amount)?;
        let wallet = &mut ctx.accounts.wallet;
        wallet.withdrawn = wallet.withdrawn.saturating_add(amount);
        emit!(WalletWithdrew {
            owner: wallet.owner,
            amount,
        });
        Ok(())
    }

    /// Fund a transaction from Pawket Wallet. The owner's existing SOL must remain untouched;
    /// settlement is the final instruction in this same atomic transaction. Only the owner signs.
    pub fn fund_wallet_spend(ctx: Context<WalletSpend>, amount: u64, keep: u64) -> Result<()> {
        use solana_instructions_sysvar::{load_current_index_checked, load_instruction_at_checked};
        let a = ctx.accounts;
        require!(load_current_index_checked(&a.instructions)? == 0, PawketError::InvalidAmount);
        require!(a.owner.lamports() == keep, PawketError::InvalidAmount);
        let data = a.instructions.try_borrow_data()?;
        let count = u16::from_le_bytes([data[0], data[1]]) as usize;
        drop(data);
        let last = load_instruction_at_checked(count - 1, &a.instructions)?;
        require!(last.program_id == crate::ID && last.accounts.len() >= 2 && last.data == [crate::instruction::SettleWalletSpend::DISCRIMINATOR, &keep.to_le_bytes()].concat(), PawketError::InvalidAmount);
        require!(last.accounts[0].pubkey == a.owner.key() && last.accounts[1].pubkey == a.wallet.key(), PawketError::InvalidAmount);
        require!(a.wallet.device_expires_at > Clock::get()?.unix_timestamp, PawketError::DeviceExpired);
        let refill = DEVICE_FLOAT_LAMPORTS.saturating_sub(a.device.lamports());
        let total = amount.checked_add(refill).ok_or(PawketError::InvalidAmount)?;
        require!(total <= spendable(&a.wallet.to_account_info())?, PawketError::InsufficientBalance);
        a.wallet.sub_lamports(total)?;
        a.owner.add_lamports(amount)?;
        a.device.add_lamports(refill)?;
        a.wallet.spent = a.wallet.spent.saturating_add(total);
        Ok(())
    }

    /// Return unspent SOL and sale proceeds to Pawket Wallet. If any existing owner SOL would be
    /// consumed, the whole transaction fails, including the external trade.
    pub fn settle_wallet_spend(ctx: Context<WalletSpend>, keep: u64) -> Result<()> {
        use solana_instructions_sysvar::{load_current_index_checked, load_instruction_at_checked};
        let a = ctx.accounts;
        let current = load_current_index_checked(&a.instructions)? as usize;
        require!(load_instruction_at_checked(current + 1, &a.instructions).is_err(), PawketError::InvalidAmount);
        let first = load_instruction_at_checked(0, &a.instructions)?;
        require!(first.program_id == crate::ID && first.accounts.len() >= 2 && first.data.len() == 24 && first.data[..8] == *crate::instruction::FundWalletSpend::DISCRIMINATOR, PawketError::InvalidAmount);
        require!(first.accounts[0].pubkey == a.owner.key() && first.accounts[1].pubkey == a.wallet.key(), PawketError::InvalidAmount);
        require!(first.data[16..24] == keep.to_le_bytes(), PawketError::InvalidAmount);
        let amount = u64::from_le_bytes(first.data[8..16].try_into().unwrap());
        let surplus = a.owner.lamports().checked_sub(keep).ok_or(PawketError::InsufficientBalance)?;
        if surplus > 0 {
            system_program::transfer(CpiContext::new(system_program::ID, system_program::Transfer {
                from: a.owner.to_account_info(), to: a.wallet.to_account_info(),
            }), surplus)?;
        }
        a.wallet.spent = a.wallet.spent.saturating_sub(surplus.min(amount));
        a.wallet.deposited = a.wallet.deposited.saturating_add(surplus.saturating_sub(amount));
        Ok(())
    }

    /// Link `device` to act for the owner until `expires_at` (30 days at most), at most
    /// `daily_actions` times a UTC day: it may do for the owner's pets what the owner signs for —
    /// care, rounds, clothes, adoption, guilds, gatherings, waves — and nothing that moves money.
    /// The device signs too, so only a key that is really there is linked, and it is handed its fee
    /// float from the balance when the balance holds one. One device at a time: linking one
    /// replaces the last.
    pub fn link_device(ctx: Context<LinkDevice>, expires_at: i64, daily_actions: u16) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        require!(
            expires_at > now
                && expires_at <= now + MAX_DEVICE_SECONDS
                && (1..=MAX_DAILY_ACTIONS).contains(&daily_actions)
                && ctx.accounts.device.key() != ctx.accounts.owner.key(),
            PawketError::InvalidDeviceLink
        );
        let info = ctx.accounts.wallet.to_account_info();
        let device = &ctx.accounts.device;
        // The whole float, or none: a balance that cannot cover it leaves the device to act only
        // while a sponsor pays its fees, and never with a sliver below its rent.
        let wanted = DEVICE_FLOAT_LAMPORTS.saturating_sub(device.lamports());
        let float = if wanted <= spendable(&info)? { wanted } else { 0 };
        if float > 0 {
            info.sub_lamports(float)?;
            device.add_lamports(float)?;
        }
        let wallet = &mut ctx.accounts.wallet;
        wallet.device = device.key();
        wallet.device_expires_at = expires_at;
        wallet.daily_actions = daily_actions;
        wallet.spent = wallet.spent.saturating_add(float);
        emit!(DeviceLinked {
            owner: wallet.owner,
            device: wallet.device,
            expires_at,
            daily_actions,
        });
        Ok(())
    }

    /// The device stops acting for the owner. The owner or the device itself may say so; when the
    /// device signs, whatever it holds comes back to the balance.
    pub fn unlink_device(ctx: Context<UnlinkDevice>) -> Result<()> {
        let device = &ctx.accounts.device;
        let returned = if device.is_signer { device.lamports() } else { 0 };
        if returned > 0 {
            system_program::transfer(
                CpiContext::new(
                    system_program::ID,
                    system_program::Transfer {
                        from: device.to_account_info(),
                        to: ctx.accounts.wallet.to_account_info(),
                    },
                ),
                returned,
            )?;
        }
        let wallet = &mut ctx.accounts.wallet;
        emit!(DeviceUnlinked {
            owner: wallet.owner,
            device: wallet.device,
            returned,
        });
        wallet.device = Pubkey::default();
        wallet.device_expires_at = 0;
        wallet.spent = wallet.spent.saturating_sub(returned);
        Ok(())
    }

    /// The Pawket Wallet closes: its balance goes to its owner, its rent to whoever paid it. A
    /// device is unlinked first, so nothing is left behind on one.
    pub fn close_wallet(ctx: Context<CloseWallet>) -> Result<()> {
        let info = ctx.accounts.wallet.to_account_info();
        let returned = spendable(&info)?;
        if returned > 0 {
            info.sub_lamports(returned)?;
            ctx.accounts.owner.add_lamports(returned)?;
        }
        emit!(WalletClosed {
            owner: ctx.accounts.owner.key(),
            returned,
        });
        Ok(())
    }

    /// A care, signed by the owner's linked device: the same rules and the same record as one the
    /// owner signs.
    pub fn care_by_device(ctx: Context<CareByDevice>, action: CareActionType) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        act(&mut ctx.accounts.wallet, &ctx.accounts.device, now)?;
        care(&mut ctx.accounts.pet, &mut ctx.accounts.passport, action, now)
    }

    /// A finished round, signed by the owner's linked device.
    pub fn finish_round_by_device(ctx: Context<CareByDevice>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        act(&mut ctx.accounts.wallet, &ctx.accounts.device, now)?;
        round(&mut ctx.accounts.pet, &mut ctx.accounts.passport, now)
    }

    /// Dressing, signed by the owner's linked device.
    pub fn dress_by_device(ctx: Context<DressByDevice>, wearing: u8) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        act(&mut ctx.accounts.wallet, &ctx.accounts.device, now)?;
        dress_pet(&mut ctx.accounts.pet, wearing)
    }

    /// Buy one thing in the Market at its fixed price, paid by the owner straight into Pawket's
    /// treasury; the owner's Closet records it for good. `payer` covers the Closet's rent the first
    /// time — the owner, or a sponsor.
    pub fn buy(ctx: Context<Buy>, item: u8) -> Result<()> {
        let price = item_price(item).ok_or(PawketError::UnknownItem)?;
        let owner = ctx.accounts.owner.key();
        let closet = &mut ctx.accounts.closet;
        if closet.owner == Pubkey::default() {
            closet.owner = owner;
            closet.bump = ctx.bumps.closet;
        }
        require!(!closet.has(item), PawketError::AlreadyOwned);
        // The record, then the payment: the transfer reads nothing the record changed, and if it
        // fails the whole purchase does.
        closet.add(item);
        closet.count = closet.count.saturating_add(1);
        closet.spent = closet.spent.saturating_add(price);
        system_program::transfer(CpiContext::new(system_program::ID, system_program::Transfer {
            from: ctx.accounts.owner.to_account_info(), to: ctx.accounts.treasury.to_account_info(),
        }), price)?;
        emit!(ItemBought { owner, item, price });
        Ok(())
    }

    /// An owner-approved purchase from Pawket Wallet into the fixed treasury.
    /// The balance never reaches into rent; the sponsor may pay the Closet's rent.
    pub fn buy_with_wallet(ctx: Context<BuyWithWallet>, item: u8) -> Result<()> {
        let price = item_price(item).ok_or(PawketError::UnknownItem)?;
        let owner = ctx.accounts.owner.key();
        let closet = &mut ctx.accounts.closet;
        if closet.owner == Pubkey::default() {
            closet.owner = owner;
            closet.bump = ctx.bumps.closet;
        }
        require!(!closet.has(item), PawketError::AlreadyOwned);
        // The record, then the payment: the transfer reads nothing the record changed, and if it
        // fails the whole purchase does.
        closet.add(item);
        closet.count = closet.count.saturating_add(1);
        closet.spent = closet.spent.saturating_add(price);
        let wallet = &mut ctx.accounts.wallet;
        let info = wallet.to_account_info();
        require!(price <= spendable(&info)?, PawketError::InsufficientBalance);
        info.sub_lamports(price)?;
        ctx.accounts.treasury.add_lamports(price)?;
        wallet.spent = wallet.spent.saturating_add(price);
        emit!(ItemBought { owner, item, price });
        Ok(())
    }

    /// Put on anything the owner may wear: one of the three starters, or a Market piece their Closet
    /// holds. 0 takes it off. Looks only, like `dress`.
    pub fn dress_owned(ctx: Context<DressOwned>, wearing: u8) -> Result<()> {
        may_wear(&ctx.accounts.closet, wearing)?;
        put_on(&mut ctx.accounts.pet, wearing)
    }

    /// `dress_owned`, signed by the owner's linked device.
    pub fn dress_owned_by_device(ctx: Context<DressOwnedByDevice>, wearing: u8) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        act(&mut ctx.accounts.wallet, &ctx.accounts.device, now)?;
        may_wear(&ctx.accounts.closet, wearing)?;
        put_on(&mut ctx.accounts.pet, wearing)
    }

    /// A guild's founder plans an event: a title, a line about it, when it starts and ends. `id` is
    /// the founder's to choose (the app uses the start time), so a guild's events need no counter.
    pub fn create_event(
        ctx: Context<CreateEvent>,
        id: u32,
        title: String,
        note: String,
        starts_at: i64,
        ends_at: i64,
    ) -> Result<()> {
        let a = ctx.accounts;
        let (guild, creator) = (a.guild.key(), a.owner.key());
        plan(&mut a.event, guild, creator, id, title, note, starts_at, ends_at, ctx.bumps.event)
    }

    /// An event planned by the founder's linked device.
    pub fn create_event_by_device(
        ctx: Context<CreateEventByDevice>,
        id: u32,
        title: String,
        note: String,
        starts_at: i64,
        ends_at: i64,
    ) -> Result<()> {
        let a = ctx.accounts;
        act(&mut a.wallet, &a.device, Clock::get()?.unix_timestamp)?;
        let (guild, creator) = (a.guild.key(), a.wallet.owner);
        plan(&mut a.event, guild, creator, id, title, note, starts_at, ends_at, ctx.bumps.event)
    }

    /// A pet in the guild is going to its event. One RSVP per pet per event, until it ends.
    pub fn rsvp(ctx: Context<Rsvp>) -> Result<()> {
        let a = ctx.accounts;
        let who = Who { owner: a.owner.key(), pet: a.pet.key(), payer: a.payer.key() };
        going(&mut a.event, &mut a.rsvp, who, ctx.bumps.rsvp)
    }

    /// An RSVP signed by the owner's linked device.
    pub fn rsvp_by_device(ctx: Context<RsvpByDevice>) -> Result<()> {
        let a = ctx.accounts;
        act(&mut a.wallet, &a.device, Clock::get()?.unix_timestamp)?;
        let who = Who { owner: a.wallet.owner, pet: a.pet.key(), payer: a.payer.key() };
        going(&mut a.event, &mut a.rsvp, who, ctx.bumps.rsvp)
    }

    /// At the event — from fifteen minutes before it starts until it ends — a pet that said it was
    /// going checks in, once.
    pub fn check_in(ctx: Context<CheckIn>) -> Result<()> {
        arrive(&mut ctx.accounts.event, &mut ctx.accounts.rsvp)
    }

    /// A check-in signed by the owner's linked device.
    pub fn check_in_by_device(ctx: Context<CheckInByDevice>) -> Result<()> {
        let a = ctx.accounts;
        act(&mut a.wallet, &a.device, Clock::get()?.unix_timestamp)?;
        arrive(&mut a.event, &mut a.rsvp)
    }

    /// A guild's founder asks the guild something: two to four options, open from ten minutes to
    /// fourteen days. Each wallet with a pet in the guild answers once; no weight, no token.
    pub fn create_poll(
        ctx: Context<CreatePoll>,
        id: u32,
        question: String,
        options: Vec<String>,
        closes_at: i64,
    ) -> Result<()> {
        let a = ctx.accounts;
        let (guild, creator) = (a.guild.key(), a.owner.key());
        ask(&mut a.poll, guild, creator, id, question, options, closes_at, ctx.bumps.poll)
    }

    /// A poll opened by the founder's linked device.
    pub fn create_poll_by_device(
        ctx: Context<CreatePollByDevice>,
        id: u32,
        question: String,
        options: Vec<String>,
        closes_at: i64,
    ) -> Result<()> {
        let a = ctx.accounts;
        act(&mut a.wallet, &a.device, Clock::get()?.unix_timestamp)?;
        let (guild, creator) = (a.guild.key(), a.wallet.owner);
        ask(&mut a.poll, guild, creator, id, question, options, closes_at, ctx.bumps.poll)
    }

    /// A wallet with a pet in the guild answers its poll: one ballot per wallet, before it closes.
    pub fn vote(ctx: Context<Vote>, option: u8) -> Result<()> {
        let a = ctx.accounts;
        let who = Who { owner: a.owner.key(), pet: a.pet.key(), payer: a.payer.key() };
        cast(&mut a.poll, &mut a.ballot, who, option, ctx.bumps.ballot)
    }

    /// A ballot cast by the owner's linked device: still one per wallet, the owner's.
    pub fn vote_by_device(ctx: Context<VoteByDevice>, option: u8) -> Result<()> {
        let a = ctx.accounts;
        act(&mut a.wallet, &a.device, Clock::get()?.unix_timestamp)?;
        let who = Who { owner: a.wallet.owner, pet: a.pet.key(), payer: a.payer.key() };
        cast(&mut a.poll, &mut a.ballot, who, option, ctx.bumps.ballot)
    }

    /// Anyone but its owner waves at a pet, once a UTC day. Its guestbook counts every wave and
    /// keeps the last eight visitors. A wave changes nothing about the pet.
    pub fn wave(ctx: Context<Wave>) -> Result<()> {
        let a = ctx.accounts;
        greet(&mut a.guestbook, &a.pet, a.visitor.key(), ctx.bumps.guestbook)
    }

    /// A wave from the visitor's linked device: the visitor is the device's owner.
    pub fn wave_by_device(ctx: Context<WaveByDevice>) -> Result<()> {
        let a = ctx.accounts;
        act(&mut a.wallet, &a.device, Clock::get()?.unix_timestamp)?;
        greet(&mut a.guestbook, &a.pet, a.wallet.owner, ctx.bumps.guestbook)
    }
}

/// Who an action is for: the pet's owner (whoever signed for them), the pet, and who pays any rent.
struct Who {
    owner: Pubkey,
    pet: Pubkey,
    payer: Pubkey,
}

/// A new pet for `owner` at 72 across the board, and its Passport.
fn adopt(
    pet: &mut Account<Pet>,
    passport: &mut Account<PetPassport>,
    owner: Pubkey,
    name: String,
    species: PetSpecies,
    personality: PetPersonality,
    bumps: (u8, u8),
) -> Result<()> {
    require!(
        (MIN_NAME_LEN..=MAX_NAME_LEN).contains(&name.len()),
        PawketError::InvalidPetName
    );
    let now = Clock::get()?.unix_timestamp;
    let pet_key = pet.key();
    pet.set_inner(Pet {
        owner,
        species,
        personality,
        birth_timestamp: now,
        level: 1,
        xp: 0,
        hunger: INITIAL_STAT_VALUE,
        happiness: INITIAL_STAT_VALUE,
        energy: INITIAL_STAT_VALUE,
        hygiene: INITIAL_STAT_VALUE,
        stats_updated_at: now,
        last_feed_at: 0,
        last_play_at: 0,
        last_groom_at: 0,
        last_rest_at: 0,
        wearing: 0,
        bump: bumps.0,
        name: name.clone(),
    });
    passport.set_inner(PetPassport {
        pet: pet_key,
        owner,
        event_count: 1,
        care_count: 0,
        plays: 0,
        streak: 0,
        best_streak: 0,
        last_active_day: 0,
        last_play_day: 0,
        recent: [CareMark::default(); RECENT_CARES],
        bump: bumps.1,
    });
    emit!(PetAdopted {
        owner,
        pet: pet_key,
        name,
        species,
        personality,
    });
    Ok(())
}

/// A guild named `slug`, founded by `who.pet`, which becomes its first member.
#[allow(clippy::too_many_arguments)]
fn found(
    guild: &mut Account<Guild>,
    member: &mut Account<GuildMember>,
    who: Who,
    slug: String,
    name: String,
    motto: String,
    crest: u8,
    colour: u8,
    bumps: (u8, u8),
) -> Result<()> {
    require!(valid_slug(&slug), PawketError::InvalidGuildSlug);
    require!(
        (MIN_GUILD_NAME_LEN..=MAX_GUILD_NAME_LEN).contains(&name.len()),
        PawketError::InvalidGuildName
    );
    require!(motto.len() <= MAX_MOTTO_LEN, PawketError::InvalidGuildMotto);
    require!(crest < CREST_COUNT && colour < COLOUR_COUNT, PawketError::UnknownCrest);
    let now = Clock::get()?.unix_timestamp;
    let guild_key = guild.key();
    guild.set_inner(Guild {
        founder: who.owner,
        founder_pet: who.pet,
        created_at: now,
        member_count: 1,
        crest,
        colour,
        bump: bumps.0,
        slug: slug.clone(),
        name,
        motto,
    });
    member.set_inner(GuildMember {
        pet: who.pet,
        guild: guild_key,
        owner: who.owner,
        payer: who.payer,
        joined_at: now,
        bump: bumps.1,
    });
    emit!(GuildFounded {
        guild: guild_key,
        founder: who.owner,
        pet: who.pet,
        slug,
    });
    Ok(())
}

fn join(guild: &mut Account<Guild>, member: &mut Account<GuildMember>, who: Who, bump: u8) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let guild_key = guild.key();
    guild.member_count = guild.member_count.saturating_add(1);
    member.set_inner(GuildMember {
        pet: who.pet,
        guild: guild_key,
        owner: who.owner,
        payer: who.payer,
        joined_at: now,
        bump,
    });
    emit!(GuildJoined {
        guild: guild_key,
        pet: who.pet,
    });
    Ok(())
}

fn leave(guild: &mut Account<Guild>, pet: Pubkey) -> Result<()> {
    guild.member_count = guild.member_count.saturating_sub(1);
    emit!(GuildLeft { guild: guild.key(), pet });
    Ok(())
}

#[allow(clippy::too_many_arguments)]
fn plan(
    event: &mut Account<GuildEvent>,
    guild: Pubkey,
    creator: Pubkey,
    id: u32,
    title: String,
    note: String,
    starts_at: i64,
    ends_at: i64,
    bump: u8,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    require!(
        (MIN_EVENT_TITLE_LEN..=MAX_EVENT_TITLE_LEN).contains(&title.len())
            && note.len() <= MAX_EVENT_NOTE_LEN
            && ends_at > starts_at
            && ends_at > now
            && ends_at.checked_sub(starts_at).is_some_and(|span| span <= MAX_EVENT_SECONDS)
            && starts_at <= now + MAX_EVENT_LEAD_SECONDS,
        PawketError::InvalidEvent
    );
    let event_key = event.key();
    event.set_inner(GuildEvent {
        guild,
        creator,
        id,
        starts_at,
        ends_at,
        created_at: now,
        going: 0,
        came: 0,
        bump,
        title,
        note,
    });
    emit!(EventCreated {
        guild,
        event: event_key,
        starts_at
    });
    Ok(())
}

fn going(event: &mut Account<GuildEvent>, rsvp: &mut Account<EventRsvp>, who: Who, bump: u8) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    require!(now < event.ends_at, PawketError::EventOver);
    event.going = event.going.saturating_add(1);
    let event_key = event.key();
    rsvp.set_inner(EventRsvp {
        event: event_key,
        pet: who.pet,
        owner: who.owner,
        payer: who.payer,
        at: now,
        came: false,
        bump,
    });
    emit!(EventRsvped {
        event: event_key,
        pet: who.pet
    });
    Ok(())
}

fn arrive(event: &mut Account<GuildEvent>, rsvp: &mut Account<EventRsvp>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    require!(
        now >= event.starts_at - CHECK_IN_EARLY_SECONDS && now <= event.ends_at,
        PawketError::NotCheckInTime
    );
    require!(!rsvp.came, PawketError::AlreadyCheckedIn);
    rsvp.came = true;
    event.came = event.came.saturating_add(1);
    emit!(CheckedIn {
        event: event.key(),
        pet: rsvp.pet,
    });
    Ok(())
}

#[allow(clippy::too_many_arguments)]
fn ask(
    poll: &mut Account<GuildPoll>,
    guild: Pubkey,
    creator: Pubkey,
    id: u32,
    question: String,
    options: Vec<String>,
    closes_at: i64,
    bump: u8,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    require!(
        (MIN_POLL_QUESTION_LEN..=MAX_POLL_QUESTION_LEN).contains(&question.len())
            && (MIN_POLL_OPTIONS..=MAX_POLL_OPTIONS).contains(&options.len())
            && options.iter().all(|option| (1..=MAX_POLL_OPTION_LEN).contains(&option.len()))
            && closes_at >= now + MIN_POLL_SECONDS
            && closes_at <= now + MAX_POLL_SECONDS,
        PawketError::InvalidPoll
    );
    let poll_key = poll.key();
    poll.set_inner(GuildPoll {
        guild,
        creator,
        id,
        created_at: now,
        closes_at,
        votes: [0; MAX_POLL_OPTIONS],
        bump,
        question,
        options,
    });
    emit!(PollCreated {
        guild,
        poll: poll_key,
        closes_at
    });
    Ok(())
}

fn cast(poll: &mut Account<GuildPoll>, ballot: &mut Account<Ballot>, who: Who, option: u8, bump: u8) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    require!(now < poll.closes_at, PawketError::PollClosed);
    require!(usize::from(option) < poll.options.len(), PawketError::UnknownOption);
    poll.votes[usize::from(option)] = poll.votes[usize::from(option)].saturating_add(1);
    let poll_key = poll.key();
    ballot.set_inner(Ballot {
        poll: poll_key,
        owner: who.owner,
        pet: who.pet,
        payer: who.payer,
        option,
        at: now,
        bump,
    });
    emit!(Voted {
        poll: poll_key,
        owner: who.owner,
        option
    });
    Ok(())
}

fn greet(book: &mut Account<Guestbook>, pet: &Account<Pet>, visitor: Pubkey, bump: u8) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    require!(visitor != pet.owner, PawketError::CannotWaveAtOwnPet);
    let pet_key = pet.key();
    if book.pet == Pubkey::default() {
        book.pet = pet_key;
        book.bump = bump;
    }
    let today = utc_day(now);
    require!(
        !book.recent.iter().any(|mark| mark.at != 0 && mark.visitor == visitor && utc_day(mark.at) == today),
        PawketError::AlreadyWavedToday
    );
    let slot = book.waves as usize % RECENT_WAVES;
    book.recent[slot] = WaveMark { visitor, at: now };
    book.waves = book.waves.saturating_add(1);
    emit!(Waved {
        pet: pet_key,
        visitor,
        waves: book.waves,
    });
    Ok(())
}

/// Feed, play, groom or rest: decay to now, apply the locked deltas, +10 XP, then write the
/// Passport. Each action waits 30 minutes after its last use.
fn care(pet: &mut Account<Pet>, passport: &mut Account<PetPassport>, action: CareActionType, now: i64) -> Result<()> {
    require!(
        now - pet.last_care_at(action) >= CARE_COOLDOWN_SECONDS,
        PawketError::CareCooldownActive
    );
    pet.decay_to(now);
    pet.apply(action);
    pet.set_last_care_at(action, now);
    pet.gain_xp(XP_PER_CARE_ACTION);

    let slot = passport.care_count as usize % RECENT_CARES;
    passport.recent[slot] = CareMark { action, at: now };
    passport.care_count = passport.care_count.saturating_add(1);
    passport.event_count = passport.event_count.saturating_add(1);
    passport.mark_active(utc_day(now));
    emit!(CarePerformed {
        owner: pet.owner,
        pet: pet.key(),
        action,
        xp: pet.xp,
        level: pet.level,
        streak: passport.streak,
    });
    Ok(())
}

/// A finished playground round. The first of a UTC day adds 25 XP; every one counts as a play and
/// as showing up. Vitals and cooldowns stay where they are.
fn round(pet: &mut Account<Pet>, passport: &mut Account<PetPassport>, now: i64) -> Result<()> {
    let day = utc_day(now);
    let xp_gained = if passport.last_play_day == day {
        0
    } else {
        DAILY_GOAL_REWARD_XP
    };
    passport.plays = passport.plays.saturating_add(1);
    passport.last_play_day = day;
    passport.event_count = passport.event_count.saturating_add(1);
    passport.mark_active(day);

    pet.gain_xp(xp_gained);
    emit!(RoundFinished {
        pet: pet.key(),
        xp_gained,
        plays: passport.plays,
    });
    Ok(())
}

/// Put something on, or take it off with 0. Looks only: nothing else on the pet changes.
fn dress_pet(pet: &mut Account<Pet>, wearing: u8) -> Result<()> {
    require!(wearing <= WEARABLE_COUNT, PawketError::UnknownWearable);
    put_on(pet, wearing)
}

fn put_on(pet: &mut Account<Pet>, wearing: u8) -> Result<()> {
    pet.wearing = wearing;
    emit!(PetDressed {
        pet: pet.key(),
        wearing,
    });
    Ok(())
}

/// One of the eighteen, or a Market piece the Closet holds.
fn may_wear(closet: &Closet, wearing: u8) -> Result<()> {
    require!(wearing <= WEARABLE_COUNT + MARKET_WEARABLE_COUNT, PawketError::UnknownWearable);
    require!(wearing <= WEARABLE_COUNT || closet.has(wearing), PawketError::NotInCloset);
    Ok(())
}

/// What an item costs in the Market, in lamports, or None where nothing is sold.
pub fn item_price(item: u8) -> Option<u64> {
    if (WEARABLE_COUNT + 1..=WEARABLE_COUNT + MARKET_WEARABLE_COUNT).contains(&item) {
        Some(WEARABLE_PRICE_LAMPORTS)
    } else if (FIRST_ROOM_ITEM..FIRST_ROOM_ITEM + MARKET_ROOM_COUNT).contains(&item) {
        Some(ROOM_PRICE_LAMPORTS)
    } else if (FIRST_FRAME_ITEM..FIRST_FRAME_ITEM + MARKET_FRAME_COUNT).contains(&item) {
        Some(FRAME_PRICE_LAMPORTS)
    } else {
        None
    }
}

/// Lamports in a Pawket Wallet above the rent that keeps it alive: its balance.
fn spendable(info: &AccountInfo) -> Result<u64> {
    let rent = Rent::get()?.minimum_balance(info.data_len());
    Ok(info.lamports().saturating_sub(rent))
}

/// A device acting for its owner: still linked, under today's limit — then the fee it paid is
/// refilled from the balance, never past its float and never by more than one fee, so the balance
/// pays for the device's actions and for nothing else.
fn act<'info>(wallet: &mut Account<'info, PawketWallet>, device: &Signer<'info>, now: i64) -> Result<()> {
    require!(now < wallet.device_expires_at, PawketError::DeviceExpired);
    let day = utc_day(now);
    if wallet.day != day {
        wallet.day = day;
        wallet.actions_today = 0;
    }
    require!(wallet.actions_today < wallet.daily_actions, PawketError::DailyLimitReached);
    wallet.actions_today = wallet.actions_today.saturating_add(1);
    wallet.actions = wallet.actions.saturating_add(1);

    let info = wallet.to_account_info();
    let held = device.lamports();
    let refill = DEVICE_FLOAT_LAMPORTS
        .saturating_sub(held)
        .min(FEE_PER_SIGNATURE)
        .min(spendable(&info)?);
    // A device that holds nothing is not topped up into a sliver below rent.
    if refill > 0 && held.saturating_add(refill) >= Rent::get()?.minimum_balance(0) {
        info.sub_lamports(refill)?;
        device.add_lamports(refill)?;
        wallet.spent = wallet.spent.saturating_add(refill);
    }
    Ok(())
}

/// `a-z`, `0-9` and inner `-`, 3 to 24 bytes: `slugFor` in `src/lib/guilds/guild.ts`.
pub fn valid_slug(slug: &str) -> bool {
    let bytes = slug.as_bytes();
    (MIN_SLUG_LEN..=MAX_SLUG_LEN).contains(&bytes.len())
        && bytes.iter().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || *b == b'-')
        && bytes[0] != b'-'
        && bytes[bytes.len() - 1] != b'-'
}

/// Past this, every vital is 0 whatever it started at (100 points at 1.2 an hour is gone in
/// 300,000 s), so clamping changes no result and keeps the products small enough for i64.
/// Keep it i64: the same arithmetic in i128 came out wrong on SBF v2 while passing natively.
const DECAY_HORIZON_SECONDS: i64 = 1_000_000;

/// `Math.round(value − rate × hours)` clamped to 0–100, as `applyStatDecay` computes it. Round
/// half up is floor(x + ½); in 36000ths of a point (rate in tenths per hour, time in seconds)
/// every term is an integer, so both sides agree exactly.
pub fn decayed(value: u8, tenths_per_hour: i64, elapsed_seconds: i64) -> u8 {
    let elapsed = elapsed_seconds.clamp(0, DECAY_HORIZON_SECONDS);
    let scaled = i64::from(value) * 36_000 - tenths_per_hour * elapsed + 18_000;
    if scaled <= 0 {
        0
    } else {
        (scaled / 36_000).min(i64::from(MAX_STAT)) as u8
    }
}

pub fn level_for(xp: u32) -> u16 {
    (xp / BASE_XP_PER_LEVEL + 1).min(u32::from(u16::MAX)) as u16
}

/// Days since the Unix epoch, UTC. The streak's calendar.
pub fn utc_day(unix_timestamp: i64) -> u32 {
    unix_timestamp.div_euclid(SECONDS_PER_DAY).clamp(0, i64::from(u32::MAX)) as u32
}

fn up(value: u8, by: u8) -> u8 {
    value.saturating_add(by).min(MAX_STAT)
}

impl Pet {
    pub fn last_care_at(&self, action: CareActionType) -> i64 {
        match action {
            CareActionType::Feed => self.last_feed_at,
            CareActionType::Play => self.last_play_at,
            CareActionType::Groom => self.last_groom_at,
            CareActionType::Rest => self.last_rest_at,
        }
    }

    fn set_last_care_at(&mut self, action: CareActionType, at: i64) {
        match action {
            CareActionType::Feed => self.last_feed_at = at,
            CareActionType::Play => self.last_play_at = at,
            CareActionType::Groom => self.last_groom_at = at,
            CareActionType::Rest => self.last_rest_at = at,
        }
    }

    fn decay_to(&mut self, now: i64) {
        let elapsed = now - self.stats_updated_at;
        let [hunger, happiness, energy, hygiene] = DECAY_TENTHS_PER_HOUR;
        self.hunger = decayed(self.hunger, hunger, elapsed);
        self.happiness = decayed(self.happiness, happiness, elapsed);
        self.energy = decayed(self.energy, energy, elapsed);
        self.hygiene = decayed(self.hygiene, hygiene, elapsed);
        self.stats_updated_at = now;
    }

    /// The locked deltas: `applyCareAction` in `src/lib/game/math.ts`.
    fn apply(&mut self, action: CareActionType) {
        match action {
            CareActionType::Feed => {
                self.hunger = up(self.hunger, 23);
                self.happiness = up(self.happiness, 2);
            }
            CareActionType::Play => {
                self.hunger = self.hunger.saturating_sub(6);
                self.happiness = up(self.happiness, 23);
                self.energy = self.energy.saturating_sub(12);
            }
            CareActionType::Groom => {
                self.happiness = up(self.happiness, 3);
                self.hygiene = up(self.hygiene, 25);
            }
            CareActionType::Rest => {
                self.energy = up(self.energy, 28);
            }
        }
    }

    fn gain_xp(&mut self, xp: u32) {
        self.xp = self.xp.saturating_add(xp);
        self.level = level_for(self.xp);
    }
}

impl PetPassport {
    /// `nextStreak` in `src/lib/guest/pet.ts`: the same day changes nothing, the day after adds
    /// one, any gap starts again at one.
    fn mark_active(&mut self, day: u32) {
        if self.last_active_day == day {
            return;
        }
        self.streak = if self.last_active_day.checked_add(1) == Some(day) {
            self.streak.saturating_add(1)
        } else {
            1
        };
        self.best_streak = self.best_streak.max(self.streak);
        self.last_active_day = day;
    }
}

impl Closet {
    /// Whether the Closet holds `item`: one bit per item id.
    pub fn has(&self, item: u8) -> bool {
        self.items[usize::from(item / 8)] & (1 << (item % 8)) != 0
    }

    fn add(&mut self, item: u8) {
        self.items[usize::from(item / 8)] |= 1 << (item % 8);
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct AdoptPet<'info> {
    pub owner: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,
        space = 8 + Pet::INIT_SPACE,
        seeds = [PET_SEED, owner.key().as_ref(), name.as_bytes()],
        bump
    )]
    pub pet: Account<'info, Pet>,
    #[account(
        init,
        payer = payer,
        space = 8 + PetPassport::INIT_SPACE,
        seeds = [PASSPORT_SEED, pet.key().as_ref()],
        bump
    )]
    pub passport: Account<'info, PetPassport>,
    pub system_program: Program<'info, System>,
}

/// Care and a finished round: the owner signs, the pet and its Passport are written.
#[derive(Accounts)]
pub struct Care<'info> {
    pub owner: Signer<'info>,
    #[account(mut, has_one = owner @ PawketError::NotPetOwner)]
    pub pet: Account<'info, Pet>,
    #[account(mut, seeds = [PASSPORT_SEED, pet.key().as_ref()], bump = passport.bump)]
    pub passport: Account<'info, PetPassport>,
}

#[derive(Accounts)]
pub struct Dress<'info> {
    pub owner: Signer<'info>,
    #[account(mut, has_one = owner @ PawketError::NotPetOwner)]
    pub pet: Account<'info, Pet>,
}

#[derive(Accounts)]
#[instruction(slug: String)]
pub struct FoundGuild<'info> {
    pub owner: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(has_one = owner @ PawketError::NotPetOwner)]
    pub pet: Account<'info, Pet>,
    #[account(
        init,
        payer = payer,
        space = 8 + Guild::INIT_SPACE,
        seeds = [GUILD_SEED, slug.as_bytes()],
        bump
    )]
    pub guild: Account<'info, Guild>,
    #[account(
        init,
        payer = payer,
        space = 8 + GuildMember::INIT_SPACE,
        seeds = [MEMBER_SEED, pet.key().as_ref()],
        bump
    )]
    pub member: Account<'info, GuildMember>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinGuild<'info> {
    pub owner: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(has_one = owner @ PawketError::NotPetOwner)]
    pub pet: Account<'info, Pet>,
    #[account(mut, seeds = [GUILD_SEED, guild.slug.as_bytes()], bump = guild.bump)]
    pub guild: Account<'info, Guild>,
    #[account(
        init,
        payer = payer,
        space = 8 + GuildMember::INIT_SPACE,
        seeds = [MEMBER_SEED, pet.key().as_ref()],
        bump
    )]
    pub member: Account<'info, GuildMember>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LeaveGuild<'info> {
    pub owner: Signer<'info>,
    #[account(has_one = owner @ PawketError::NotPetOwner)]
    pub pet: Account<'info, Pet>,
    #[account(
        mut,
        seeds = [MEMBER_SEED, pet.key().as_ref()],
        bump = member.bump,
        has_one = pet,
        has_one = guild,
        has_one = payer,
        close = payer
    )]
    pub member: Account<'info, GuildMember>,
    #[account(mut)]
    pub guild: Account<'info, Guild>,
    /// CHECK: whoever paid the member account's rent, which it gets back. Held to `member.payer`.
    #[account(mut)]
    pub payer: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct OpenWallet<'info> {
    pub owner: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,
        space = 8 + PawketWallet::INIT_SPACE,
        seeds = [WALLET_SEED, owner.key().as_ref()],
        bump
    )]
    pub wallet: Account<'info, PawketWallet>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [WALLET_SEED, owner.key().as_ref()],
        bump = wallet.bump,
        has_one = owner
    )]
    pub wallet: Account<'info, PawketWallet>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [WALLET_SEED, owner.key().as_ref()],
        bump = wallet.bump,
        has_one = owner
    )]
    pub wallet: Account<'info, PawketWallet>,
}

#[derive(Accounts)]
pub struct WalletSpend<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut, seeds = [WALLET_SEED, owner.key().as_ref()], bump = wallet.bump, has_one = owner, has_one = device @ PawketError::NotThisDevice)]
    pub wallet: Account<'info, PawketWallet>,
    /// CHECK: only refilled to its existing fee float, with the owner's signature; held to wallet.device.
    #[account(mut)]
    pub device: UncheckedAccount<'info>,
    /// CHECK: the real instructions sysvar binds both halves to this transaction.
    #[account(address = solana_instructions_sysvar::ID)]
    pub instructions: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LinkDevice<'info> {
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [WALLET_SEED, owner.key().as_ref()],
        bump = wallet.bump,
        has_one = owner
    )]
    pub wallet: Account<'info, PawketWallet>,
    /// The device's own key, which signs to show it is really there, and is handed its float.
    #[account(mut)]
    pub device: Signer<'info>,
}

#[derive(Accounts)]
pub struct UnlinkDevice<'info> {
    /// The owner, or the device itself.
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [WALLET_SEED, wallet.owner.as_ref()],
        bump = wallet.bump,
        constraint = wallet.device != Pubkey::default() @ PawketError::NoDeviceLinked,
        constraint = authority.key() == wallet.owner || authority.key() == wallet.device @ PawketError::NotThisDevice
    )]
    pub wallet: Account<'info, PawketWallet>,
    /// CHECK: the linked device, held to `wallet.device`. What it holds comes back when it signs.
    #[account(mut, address = wallet.device)]
    pub device: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseWallet<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [WALLET_SEED, owner.key().as_ref()],
        bump = wallet.bump,
        has_one = owner,
        has_one = rent_payer,
        constraint = wallet.device == Pubkey::default() @ PawketError::DeviceStillLinked,
        close = rent_payer
    )]
    pub wallet: Account<'info, PawketWallet>,
    /// CHECK: whoever paid the wallet's rent, which it gets back. Held to `wallet.rent_payer`.
    #[account(mut)]
    pub rent_payer: UncheckedAccount<'info>,
}

/// Care and a finished round, signed by the owner's linked device.
#[derive(Accounts)]
pub struct CareByDevice<'info> {
    #[account(mut)]
    pub device: Signer<'info>,
    #[account(
        mut,
        seeds = [WALLET_SEED, wallet.owner.as_ref()],
        bump = wallet.bump,
        has_one = device @ PawketError::NotThisDevice
    )]
    pub wallet: Account<'info, PawketWallet>,
    #[account(mut, constraint = pet.owner == wallet.owner @ PawketError::NotPetOwner)]
    pub pet: Account<'info, Pet>,
    #[account(mut, seeds = [PASSPORT_SEED, pet.key().as_ref()], bump = passport.bump)]
    pub passport: Account<'info, PetPassport>,
}

#[derive(Accounts)]
pub struct DressByDevice<'info> {
    #[account(mut)]
    pub device: Signer<'info>,
    #[account(
        mut,
        seeds = [WALLET_SEED, wallet.owner.as_ref()],
        bump = wallet.bump,
        has_one = device @ PawketError::NotThisDevice
    )]
    pub wallet: Account<'info, PawketWallet>,
    #[account(mut, constraint = pet.owner == wallet.owner @ PawketError::NotPetOwner)]
    pub pet: Account<'info, Pet>,
}

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    /// Made the owner's in `buy` when it is new; one that is there already is held to them here.
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + Closet::INIT_SPACE,
        seeds = [CLOSET_SEED, owner.key().as_ref()],
        bump,
        constraint = closet.owner == Pubkey::default() || closet.owner == owner.key()
    )]
    pub closet: Account<'info, Closet>,
    #[account(mut, address = TREASURY)]
    pub treasury: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyWithWallet<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    /// Made the owner's in `buy` when it is new; one that is there already is held to them here.
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + Closet::INIT_SPACE,
        seeds = [CLOSET_SEED, owner.key().as_ref()],
        bump,
        constraint = closet.owner == Pubkey::default() || closet.owner == owner.key()
    )]
    pub closet: Account<'info, Closet>,
    #[account(mut, address = TREASURY)]
    pub treasury: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
    #[account(mut, seeds = [WALLET_SEED, owner.key().as_ref()], bump = wallet.bump, has_one = owner)]
    pub wallet: Account<'info, PawketWallet>,
}

#[derive(Accounts)]
pub struct DressOwned<'info> {
    pub owner: Signer<'info>,
    #[account(mut, has_one = owner @ PawketError::NotPetOwner)]
    pub pet: Account<'info, Pet>,
    #[account(seeds = [CLOSET_SEED, owner.key().as_ref()], bump = closet.bump)]
    pub closet: Account<'info, Closet>,
}

#[derive(Accounts)]
pub struct DressOwnedByDevice<'info> {
    #[account(mut)]
    pub device: Signer<'info>,
    #[account(
        mut,
        seeds = [WALLET_SEED, wallet.owner.as_ref()],
        bump = wallet.bump,
        has_one = device @ PawketError::NotThisDevice
    )]
    pub wallet: Account<'info, PawketWallet>,
    #[account(mut, constraint = pet.owner == wallet.owner @ PawketError::NotPetOwner)]
    pub pet: Account<'info, Pet>,
    #[account(seeds = [CLOSET_SEED, wallet.owner.as_ref()], bump = closet.bump)]
    pub closet: Account<'info, Closet>,
}

/// Every `*_by_device` instruction opens the same way: the linked device signs, and the owner's
/// Pawket Wallet says it may. The rest are the owner's instruction's accounts, in the same order.
#[derive(Accounts)]
#[instruction(name: String)]
pub struct AdoptPetByDevice<'info> {
    #[account(mut)]
    pub device: Signer<'info>,
    #[account(
        mut,
        seeds = [WALLET_SEED, wallet.owner.as_ref()],
        bump = wallet.bump,
        has_one = device @ PawketError::NotThisDevice
    )]
    pub wallet: Account<'info, PawketWallet>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,
        space = 8 + Pet::INIT_SPACE,
        seeds = [PET_SEED, wallet.owner.as_ref(), name.as_bytes()],
        bump
    )]
    pub pet: Account<'info, Pet>,
    #[account(
        init,
        payer = payer,
        space = 8 + PetPassport::INIT_SPACE,
        seeds = [PASSPORT_SEED, pet.key().as_ref()],
        bump
    )]
    pub passport: Account<'info, PetPassport>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(slug: String)]
pub struct FoundGuildByDevice<'info> {
    #[account(mut)]
    pub device: Signer<'info>,
    #[account(
        mut,
        seeds = [WALLET_SEED, wallet.owner.as_ref()],
        bump = wallet.bump,
        has_one = device @ PawketError::NotThisDevice
    )]
    pub wallet: Account<'info, PawketWallet>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(constraint = pet.owner == wallet.owner @ PawketError::NotPetOwner)]
    pub pet: Account<'info, Pet>,
    #[account(
        init,
        payer = payer,
        space = 8 + Guild::INIT_SPACE,
        seeds = [GUILD_SEED, slug.as_bytes()],
        bump
    )]
    pub guild: Account<'info, Guild>,
    #[account(
        init,
        payer = payer,
        space = 8 + GuildMember::INIT_SPACE,
        seeds = [MEMBER_SEED, pet.key().as_ref()],
        bump
    )]
    pub member: Account<'info, GuildMember>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinGuildByDevice<'info> {
    #[account(mut)]
    pub device: Signer<'info>,
    #[account(
        mut,
        seeds = [WALLET_SEED, wallet.owner.as_ref()],
        bump = wallet.bump,
        has_one = device @ PawketError::NotThisDevice
    )]
    pub wallet: Account<'info, PawketWallet>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(constraint = pet.owner == wallet.owner @ PawketError::NotPetOwner)]
    pub pet: Account<'info, Pet>,
    #[account(mut, seeds = [GUILD_SEED, guild.slug.as_bytes()], bump = guild.bump)]
    pub guild: Account<'info, Guild>,
    #[account(
        init,
        payer = payer,
        space = 8 + GuildMember::INIT_SPACE,
        seeds = [MEMBER_SEED, pet.key().as_ref()],
        bump
    )]
    pub member: Account<'info, GuildMember>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LeaveGuildByDevice<'info> {
    #[account(mut)]
    pub device: Signer<'info>,
    #[account(
        mut,
        seeds = [WALLET_SEED, wallet.owner.as_ref()],
        bump = wallet.bump,
        has_one = device @ PawketError::NotThisDevice
    )]
    pub wallet: Account<'info, PawketWallet>,
    #[account(constraint = pet.owner == wallet.owner @ PawketError::NotPetOwner)]
    pub pet: Account<'info, Pet>,
    #[account(
        mut,
        seeds = [MEMBER_SEED, pet.key().as_ref()],
        bump = member.bump,
        has_one = pet,
        has_one = guild,
        has_one = payer,
        close = payer
    )]
    pub member: Account<'info, GuildMember>,
    #[account(mut)]
    pub guild: Account<'info, Guild>,
    /// CHECK: whoever paid the member account's rent, which it gets back. Held to `member.payer`.
    #[account(mut)]
    pub payer: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(id: u32)]
pub struct CreateEventByDevice<'info> {
    #[account(mut)]
    pub device: Signer<'info>,
    #[account(
        mut,
        seeds = [WALLET_SEED, wallet.owner.as_ref()],
        bump = wallet.bump,
        has_one = device @ PawketError::NotThisDevice
    )]
    pub wallet: Account<'info, PawketWallet>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(constraint = guild.founder == wallet.owner @ PawketError::NotGuildFounder)]
    pub guild: Account<'info, Guild>,
    #[account(
        init,
        payer = payer,
        space = 8 + GuildEvent::INIT_SPACE,
        seeds = [EVENT_SEED, guild.key().as_ref(), &id.to_le_bytes()],
        bump
    )]
    pub event: Account<'info, GuildEvent>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RsvpByDevice<'info> {
    #[account(mut)]
    pub device: Signer<'info>,
    #[account(
        mut,
        seeds = [WALLET_SEED, wallet.owner.as_ref()],
        bump = wallet.bump,
        has_one = device @ PawketError::NotThisDevice
    )]
    pub wallet: Account<'info, PawketWallet>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(constraint = pet.owner == wallet.owner @ PawketError::NotPetOwner)]
    pub pet: Account<'info, Pet>,
    #[account(
        seeds = [MEMBER_SEED, pet.key().as_ref()],
        bump = member.bump,
        constraint = member.guild == event.guild @ PawketError::NotInGuild
    )]
    pub member: Account<'info, GuildMember>,
    #[account(mut)]
    pub event: Account<'info, GuildEvent>,
    #[account(
        init,
        payer = payer,
        space = 8 + EventRsvp::INIT_SPACE,
        seeds = [RSVP_SEED, event.key().as_ref(), pet.key().as_ref()],
        bump
    )]
    pub rsvp: Account<'info, EventRsvp>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CheckInByDevice<'info> {
    #[account(mut)]
    pub device: Signer<'info>,
    #[account(
        mut,
        seeds = [WALLET_SEED, wallet.owner.as_ref()],
        bump = wallet.bump,
        has_one = device @ PawketError::NotThisDevice
    )]
    pub wallet: Account<'info, PawketWallet>,
    #[account(constraint = pet.owner == wallet.owner @ PawketError::NotPetOwner)]
    pub pet: Account<'info, Pet>,
    #[account(mut)]
    pub event: Account<'info, GuildEvent>,
    #[account(
        mut,
        seeds = [RSVP_SEED, event.key().as_ref(), pet.key().as_ref()],
        bump = rsvp.bump
    )]
    pub rsvp: Account<'info, EventRsvp>,
}

#[derive(Accounts)]
#[instruction(id: u32)]
pub struct CreatePollByDevice<'info> {
    #[account(mut)]
    pub device: Signer<'info>,
    #[account(
        mut,
        seeds = [WALLET_SEED, wallet.owner.as_ref()],
        bump = wallet.bump,
        has_one = device @ PawketError::NotThisDevice
    )]
    pub wallet: Account<'info, PawketWallet>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(constraint = guild.founder == wallet.owner @ PawketError::NotGuildFounder)]
    pub guild: Account<'info, Guild>,
    #[account(
        init,
        payer = payer,
        space = 8 + GuildPoll::INIT_SPACE,
        seeds = [POLL_SEED, guild.key().as_ref(), &id.to_le_bytes()],
        bump
    )]
    pub poll: Account<'info, GuildPoll>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VoteByDevice<'info> {
    #[account(mut)]
    pub device: Signer<'info>,
    #[account(
        mut,
        seeds = [WALLET_SEED, wallet.owner.as_ref()],
        bump = wallet.bump,
        has_one = device @ PawketError::NotThisDevice
    )]
    pub wallet: Account<'info, PawketWallet>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(constraint = pet.owner == wallet.owner @ PawketError::NotPetOwner)]
    pub pet: Account<'info, Pet>,
    #[account(
        seeds = [MEMBER_SEED, pet.key().as_ref()],
        bump = member.bump,
        constraint = member.guild == poll.guild @ PawketError::NotInGuild
    )]
    pub member: Account<'info, GuildMember>,
    #[account(mut)]
    pub poll: Account<'info, GuildPoll>,
    #[account(
        init,
        payer = payer,
        space = 8 + Ballot::INIT_SPACE,
        seeds = [BALLOT_SEED, poll.key().as_ref(), wallet.owner.as_ref()],
        bump
    )]
    pub ballot: Account<'info, Ballot>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WaveByDevice<'info> {
    #[account(mut)]
    pub device: Signer<'info>,
    #[account(
        mut,
        seeds = [WALLET_SEED, wallet.owner.as_ref()],
        bump = wallet.bump,
        has_one = device @ PawketError::NotThisDevice
    )]
    pub wallet: Account<'info, PawketWallet>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub pet: Account<'info, Pet>,
    /// Made the pet's in `greet` when it is new; one that is there already is held to it here.
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + Guestbook::INIT_SPACE,
        seeds = [GUESTBOOK_SEED, pet.key().as_ref()],
        bump,
        constraint = guestbook.pet == Pubkey::default() || guestbook.pet == pet.key()
    )]
    pub guestbook: Account<'info, Guestbook>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(id: u32)]
pub struct CreateEvent<'info> {
    pub owner: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(constraint = guild.founder == owner.key() @ PawketError::NotGuildFounder)]
    pub guild: Account<'info, Guild>,
    #[account(
        init,
        payer = payer,
        space = 8 + GuildEvent::INIT_SPACE,
        seeds = [EVENT_SEED, guild.key().as_ref(), &id.to_le_bytes()],
        bump
    )]
    pub event: Account<'info, GuildEvent>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Rsvp<'info> {
    pub owner: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(has_one = owner @ PawketError::NotPetOwner)]
    pub pet: Account<'info, Pet>,
    #[account(
        seeds = [MEMBER_SEED, pet.key().as_ref()],
        bump = member.bump,
        constraint = member.guild == event.guild @ PawketError::NotInGuild
    )]
    pub member: Account<'info, GuildMember>,
    #[account(mut)]
    pub event: Account<'info, GuildEvent>,
    #[account(
        init,
        payer = payer,
        space = 8 + EventRsvp::INIT_SPACE,
        seeds = [RSVP_SEED, event.key().as_ref(), pet.key().as_ref()],
        bump
    )]
    pub rsvp: Account<'info, EventRsvp>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CheckIn<'info> {
    pub owner: Signer<'info>,
    #[account(has_one = owner @ PawketError::NotPetOwner)]
    pub pet: Account<'info, Pet>,
    #[account(mut)]
    pub event: Account<'info, GuildEvent>,
    #[account(
        mut,
        seeds = [RSVP_SEED, event.key().as_ref(), pet.key().as_ref()],
        bump = rsvp.bump
    )]
    pub rsvp: Account<'info, EventRsvp>,
}

#[derive(Accounts)]
#[instruction(id: u32)]
pub struct CreatePoll<'info> {
    pub owner: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(constraint = guild.founder == owner.key() @ PawketError::NotGuildFounder)]
    pub guild: Account<'info, Guild>,
    #[account(
        init,
        payer = payer,
        space = 8 + GuildPoll::INIT_SPACE,
        seeds = [POLL_SEED, guild.key().as_ref(), &id.to_le_bytes()],
        bump
    )]
    pub poll: Account<'info, GuildPoll>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Vote<'info> {
    pub owner: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(has_one = owner @ PawketError::NotPetOwner)]
    pub pet: Account<'info, Pet>,
    #[account(
        seeds = [MEMBER_SEED, pet.key().as_ref()],
        bump = member.bump,
        constraint = member.guild == poll.guild @ PawketError::NotInGuild
    )]
    pub member: Account<'info, GuildMember>,
    #[account(mut)]
    pub poll: Account<'info, GuildPoll>,
    #[account(
        init,
        payer = payer,
        space = 8 + Ballot::INIT_SPACE,
        seeds = [BALLOT_SEED, poll.key().as_ref(), owner.key().as_ref()],
        bump
    )]
    pub ballot: Account<'info, Ballot>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Wave<'info> {
    pub visitor: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub pet: Account<'info, Pet>,
    /// Made the pet's in `greet` when it is new; one that is there already is held to it here.
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + Guestbook::INIT_SPACE,
        seeds = [GUESTBOOK_SEED, pet.key().as_ref()],
        bump,
        constraint = guestbook.pet == Pubkey::default() || guestbook.pet == pet.key()
    )]
    pub guestbook: Account<'info, Guestbook>,
    pub system_program: Program<'info, System>,
}

/// Fixed-size fields first and the name last, so every offset but the name's is constant.
#[account]
#[derive(InitSpace)]
pub struct Pet {
    pub owner: Pubkey,
    pub species: PetSpecies,
    pub personality: PetPersonality,
    pub birth_timestamp: i64,
    pub level: u16,
    pub xp: u32,
    pub hunger: u8,
    pub happiness: u8,
    pub energy: u8,
    pub hygiene: u8,
    pub stats_updated_at: i64,
    pub last_feed_at: i64,
    pub last_play_at: i64,
    pub last_groom_at: i64,
    pub last_rest_at: i64,
    pub wearing: u8,
    pub bump: u8,
    #[max_len(24)]
    pub name: String,
}

#[account]
#[derive(InitSpace)]
pub struct PetPassport {
    pub pet: Pubkey,
    pub owner: Pubkey,
    pub event_count: u32,
    pub care_count: u32,
    pub plays: u32,
    pub streak: u16,
    pub best_streak: u16,
    /// UTC day of the last care or round, counted from the epoch. 0 means never.
    pub last_active_day: u32,
    /// UTC day the daily round bonus was last granted. 0 means never.
    pub last_play_day: u32,
    /// Ring of the last cares; slot `care_count % 8` is written next. `at == 0` is empty.
    pub recent: [CareMark; RECENT_CARES],
    pub bump: u8,
}

/// Fixed-size fields first and the strings last, so every offset but theirs is constant.
#[account]
#[derive(InitSpace)]
pub struct Guild {
    /// The wallet that founded it.
    pub founder: Pubkey,
    /// The pet that founded it.
    pub founder_pet: Pubkey,
    pub created_at: i64,
    pub member_count: u32,
    pub crest: u8,
    pub colour: u8,
    pub bump: u8,
    #[max_len(24)]
    pub slug: String,
    #[max_len(32)]
    pub name: String,
    #[max_len(80)]
    pub motto: String,
}

/// One pet in one guild. The pet first, then the guild, so either is a cheap filter.
#[account]
#[derive(InitSpace)]
pub struct GuildMember {
    pub pet: Pubkey,
    pub guild: Pubkey,
    pub owner: Pubkey,
    /// Who paid this account's rent, and gets it back when the pet leaves.
    pub payer: Pubkey,
    pub joined_at: i64,
    pub bump: u8,
}

/// A player's Pawket Wallet. Its lamports above rent are the balance.
#[account]
#[derive(InitSpace)]
pub struct PawketWallet {
    pub owner: Pubkey,
    /// The key that may act for the owner, or the default key when no device is linked.
    pub device: Pubkey,
    /// Unix seconds from which the device may no longer act.
    pub device_expires_at: i64,
    /// How many actions the device may take in one UTC day.
    pub daily_actions: u16,
    /// The UTC day `actions_today` counts.
    pub day: u32,
    pub actions_today: u16,
    /// Every action a device has taken for this wallet.
    pub actions: u32,
    pub deposited: u64,
    pub withdrawn: u64,
    /// Lamports moved from the balance onto a device for its fees, less what came back.
    pub spent: u64,
    /// Who paid the rent, and gets it back when the wallet closes.
    pub rent_payer: Pubkey,
    pub created_at: i64,
    pub bump: u8,
}

/// What an owner has bought in the Market: one bit per item id, for good.
#[account]
#[derive(InitSpace)]
pub struct Closet {
    pub owner: Pubkey,
    pub items: [u8; 32],
    pub count: u16,
    /// Lamports paid into the treasury, in all.
    pub spent: u64,
    pub bump: u8,
}

/// A guild's event. The guild first, so a guild's events are one cheap filter; strings last.
#[account]
#[derive(InitSpace)]
pub struct GuildEvent {
    pub guild: Pubkey,
    pub creator: Pubkey,
    pub id: u32,
    pub starts_at: i64,
    pub ends_at: i64,
    pub created_at: i64,
    pub going: u32,
    pub came: u32,
    pub bump: u8,
    #[max_len(48)]
    pub title: String,
    #[max_len(120)]
    pub note: String,
}

/// One pet going to one event, and whether it came.
#[account]
#[derive(InitSpace)]
pub struct EventRsvp {
    pub event: Pubkey,
    pub pet: Pubkey,
    pub owner: Pubkey,
    pub payer: Pubkey,
    pub at: i64,
    pub came: bool,
    pub bump: u8,
}

/// A guild's poll: up to four options, a count each. The guild first; strings last.
#[account]
#[derive(InitSpace)]
pub struct GuildPoll {
    pub guild: Pubkey,
    pub creator: Pubkey,
    pub id: u32,
    pub created_at: i64,
    pub closes_at: i64,
    pub votes: [u32; 4],
    pub bump: u8,
    #[max_len(80)]
    pub question: String,
    #[max_len(4, 24)]
    pub options: Vec<String>,
}

/// One wallet's answer to one poll.
#[account]
#[derive(InitSpace)]
pub struct Ballot {
    pub poll: Pubkey,
    pub owner: Pubkey,
    pub pet: Pubkey,
    pub payer: Pubkey,
    pub option: u8,
    pub at: i64,
    pub bump: u8,
}

/// Who waved at a pet: every wave counted, the last eight kept.
#[account]
#[derive(InitSpace)]
pub struct Guestbook {
    pub pet: Pubkey,
    pub waves: u32,
    pub recent: [WaveMark; RECENT_WAVES],
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default, PartialEq, Eq, InitSpace, Debug)]
pub struct WaveMark {
    pub visitor: Pubkey,
    pub at: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default, PartialEq, Eq, InitSpace, Debug)]
pub struct CareMark {
    pub action: CareActionType,
    pub at: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum PetSpecies {
    LunaCat,
    MossPup,
    CloudBun,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum PetPersonality {
    Curious,
    Cozy,
    Brave,
    Mischief,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default, PartialEq, Eq, InitSpace, Debug)]
pub enum CareActionType {
    #[default]
    Feed,
    Play,
    Groom,
    Rest,
}

#[event]
pub struct PetAdopted {
    pub owner: Pubkey,
    pub pet: Pubkey,
    pub name: String,
    pub species: PetSpecies,
    pub personality: PetPersonality,
}

#[event]
pub struct CarePerformed {
    pub owner: Pubkey,
    pub pet: Pubkey,
    pub action: CareActionType,
    pub xp: u32,
    pub level: u16,
    pub streak: u16,
}

#[event]
pub struct RoundFinished {
    pub pet: Pubkey,
    pub xp_gained: u32,
    pub plays: u32,
}

#[event]
pub struct PetDressed {
    pub pet: Pubkey,
    pub wearing: u8,
}

#[event]
pub struct GuildFounded {
    pub guild: Pubkey,
    pub founder: Pubkey,
    pub pet: Pubkey,
    pub slug: String,
}

#[event]
pub struct GuildJoined {
    pub guild: Pubkey,
    pub pet: Pubkey,
}

#[event]
pub struct GuildLeft {
    pub guild: Pubkey,
    pub pet: Pubkey,
}

#[event]
pub struct WalletOpened {
    pub owner: Pubkey,
    pub wallet: Pubkey,
}

#[event]
pub struct WalletDeposited {
    pub owner: Pubkey,
    pub amount: u64,
}

#[event]
pub struct WalletWithdrew {
    pub owner: Pubkey,
    pub amount: u64,
}

#[event]
pub struct DeviceLinked {
    pub owner: Pubkey,
    pub device: Pubkey,
    pub expires_at: i64,
    pub daily_actions: u16,
}

#[event]
pub struct DeviceUnlinked {
    pub owner: Pubkey,
    pub device: Pubkey,
    pub returned: u64,
}

#[event]
pub struct WalletClosed {
    pub owner: Pubkey,
    pub returned: u64,
}

#[event]
pub struct ItemBought {
    pub owner: Pubkey,
    pub item: u8,
    pub price: u64,
}

#[event]
pub struct EventCreated {
    pub guild: Pubkey,
    pub event: Pubkey,
    pub starts_at: i64,
}

#[event]
pub struct EventRsvped {
    pub event: Pubkey,
    pub pet: Pubkey,
}

#[event]
pub struct CheckedIn {
    pub event: Pubkey,
    pub pet: Pubkey,
}

#[event]
pub struct PollCreated {
    pub guild: Pubkey,
    pub poll: Pubkey,
    pub closes_at: i64,
}

#[event]
pub struct Voted {
    pub poll: Pubkey,
    pub owner: Pubkey,
    pub option: u8,
}

#[event]
pub struct Waved {
    pub pet: Pubkey,
    pub visitor: Pubkey,
    pub waves: u32,
}

#[error_code]
pub enum PawketError {
    #[msg("A pet's name is 2 to 24 UTF-8 bytes.")]
    InvalidPetName,
    #[msg("Only the pet's owner can do that.")]
    NotPetOwner,
    #[msg("That care is cooling down.")]
    CareCooldownActive,
    #[msg("There is nothing like that to wear.")]
    UnknownWearable,
    #[msg("A guild's address is 3 to 24 of a-z, 0-9 and inner hyphens.")]
    InvalidGuildSlug,
    #[msg("A guild's name is 3 to 32 UTF-8 bytes.")]
    InvalidGuildName,
    #[msg("A guild's motto is at most 80 UTF-8 bytes.")]
    InvalidGuildMotto,
    #[msg("There is no crest like that.")]
    UnknownCrest,
    #[msg("An amount is more than nothing.")]
    InvalidAmount,
    #[msg("The Pawket Wallet does not hold that much.")]
    InsufficientBalance,
    #[msg("A device is linked for up to 30 days and up to 500 actions a day, and is not the owner.")]
    InvalidDeviceLink,
    #[msg("That device is not the one linked to this Pawket Wallet.")]
    NotThisDevice,
    #[msg("This device's link has run out. Link it again.")]
    DeviceExpired,
    #[msg("This device has done all it may today.")]
    DailyLimitReached,
    #[msg("No device is linked to this Pawket Wallet.")]
    NoDeviceLinked,
    #[msg("Unlink the device before closing the Pawket Wallet.")]
    DeviceStillLinked,
    #[msg("The Market sells nothing like that.")]
    UnknownItem,
    #[msg("Your closet holds that already.")]
    AlreadyOwned,
    #[msg("That piece is not in your closet.")]
    NotInCloset,
    #[msg("An event has a 3 to 48 byte title, ends after it starts and after now, runs at most 7 days, and starts within 60.")]
    InvalidEvent,
    #[msg("Only the guild's founder can do that.")]
    NotGuildFounder,
    #[msg("That pet is not in this guild.")]
    NotInGuild,
    #[msg("That event is over.")]
    EventOver,
    #[msg("Check-in opens 15 minutes before the event and closes when it ends.")]
    NotCheckInTime,
    #[msg("That pet has checked in already.")]
    AlreadyCheckedIn,
    #[msg("A poll asks 3 to 80 bytes, offers 2 to 4 options of 1 to 24, and stays open 10 minutes to 14 days.")]
    InvalidPoll,
    #[msg("That poll is closed.")]
    PollClosed,
    #[msg("That poll has no such option.")]
    UnknownOption,
    #[msg("Wave at someone else's pet.")]
    CannotWaveAtOwnPet,
    #[msg("You waved at this pet today already.")]
    AlreadyWavedToday,
}
