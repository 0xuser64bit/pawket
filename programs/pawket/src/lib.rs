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
//! There is no store and no token: nothing here moves value except rent, which `payer` covers so a
//! sponsor can adopt on a player's behalf while the player alone signs for the pet.
#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

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
pub const WEARABLE_COUNT: u8 = 6;
/// How many cares the Passport keeps, newest overwriting oldest.
pub const RECENT_CARES: usize = 8;
pub const SECONDS_PER_DAY: i64 = 86_400;

pub const PET_SEED: &[u8] = b"pet";
pub const PASSPORT_SEED: &[u8] = b"passport";

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
        require!(
            (MIN_NAME_LEN..=MAX_NAME_LEN).contains(&name.len()),
            PawketError::InvalidPetName
        );
        let now = Clock::get()?.unix_timestamp;
        let owner = ctx.accounts.owner.key();
        let pet_key = ctx.accounts.pet.key();

        ctx.accounts.pet.set_inner(Pet {
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
            bump: ctx.bumps.pet,
            name: name.clone(),
        });
        ctx.accounts.passport.set_inner(PetPassport {
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
            bump: ctx.bumps.passport,
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

    /// Feed, play, groom or rest: decay to now, apply the locked deltas, +10 XP, then write the
    /// Passport. Each action waits 30 minutes after its last use.
    pub fn perform_care_action(ctx: Context<Care>, action: CareActionType) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let pet = &mut ctx.accounts.pet;
        require!(
            now - pet.last_care_at(action) >= CARE_COOLDOWN_SECONDS,
            PawketError::CareCooldownActive
        );
        pet.decay_to(now);
        pet.apply(action);
        pet.set_last_care_at(action, now);
        pet.gain_xp(XP_PER_CARE_ACTION);

        let passport = &mut ctx.accounts.passport;
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

    /// A finished playground round. The first of a UTC day adds 25 XP; every one counts as a play
    /// and as showing up. Vitals and cooldowns stay where they are.
    pub fn finish_round(ctx: Context<Care>) -> Result<()> {
        let day = utc_day(Clock::get()?.unix_timestamp);
        let passport = &mut ctx.accounts.passport;
        let xp_gained = if passport.last_play_day == day {
            0
        } else {
            DAILY_GOAL_REWARD_XP
        };
        passport.plays = passport.plays.saturating_add(1);
        passport.last_play_day = day;
        passport.event_count = passport.event_count.saturating_add(1);
        passport.mark_active(day);

        let pet = &mut ctx.accounts.pet;
        pet.gain_xp(xp_gained);
        emit!(RoundFinished {
            pet: pet.key(),
            xp_gained,
            plays: passport.plays,
        });
        Ok(())
    }

    /// Put something on, or take it off with 0. Looks only: nothing else on the pet changes.
    pub fn dress(ctx: Context<Dress>, wearing: u8) -> Result<()> {
        require!(wearing <= WEARABLE_COUNT, PawketError::UnknownWearable);
        let pet = &mut ctx.accounts.pet;
        pet.wearing = wearing;
        emit!(PetDressed {
            pet: pet.key(),
            wearing,
        });
        Ok(())
    }
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
    #[account(mut, has_one = pet)]
    pub passport: Account<'info, PetPassport>,
}

#[derive(Accounts)]
pub struct Dress<'info> {
    pub owner: Signer<'info>,
    #[account(mut, has_one = owner @ PawketError::NotPetOwner)]
    pub pet: Account<'info, Pet>,
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
}
