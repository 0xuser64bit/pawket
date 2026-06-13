use anchor_lang::prelude::*;

declare_id!("FQwe9LUPMTrhYyr32mHPpX87tcpjr98Eamz9wJQDaSef");

const CARE_COOLDOWN_SECONDS: i64 = 30 * 60;
const MAX_NAME_LEN: usize = 24;
const INITIAL_STAT_VALUE: u8 = 72;
const XP_PER_CARE_ACTION: u32 = 10;

#[program]
pub mod pawket {
    use super::*;

    pub fn initialize_game_config(
        ctx: Context<InitializeGameConfig>,
        treasury: Pubkey,
    ) -> Result<()> {
        let cfg = &mut ctx.accounts.game_config;
        cfg.authority = ctx.accounts.authority.key();
        cfg.treasury = treasury;
        cfg.bump = ctx.bumps.game_config;
        emit!(GameConfigInitialized {
            authority: cfg.authority,
            treasury
        });
        Ok(())
    }

    pub fn adopt_pet(
        ctx: Context<AdoptPet>,
        name: String,
        species: PetSpecies,
        personality: PetPersonality,
    ) -> Result<()> {
        require!(
            name.len() >= 2 && name.len() <= MAX_NAME_LEN,
            PawketError::InvalidPetName
        );
        let now = Clock::get()?.unix_timestamp;
        let pet = &mut ctx.accounts.pet;
        pet.owner = ctx.accounts.owner.key();
        pet.name = name.clone();
        pet.species = species;
        pet.personality = personality;
        pet.birth_timestamp = now;
        pet.level = 1;
        pet.xp = 0;
        pet.hunger = INITIAL_STAT_VALUE;
        pet.happiness = INITIAL_STAT_VALUE;
        pet.energy = INITIAL_STAT_VALUE;
        pet.hygiene = INITIAL_STAT_VALUE;
        pet.last_feed_at = 0;
        pet.last_play_at = 0;
        pet.last_groom_at = 0;
        pet.last_rest_at = 0;
        pet.bump = ctx.bumps.pet;

        let passport = &mut ctx.accounts.passport;
        passport.pet = pet.key();
        passport.owner = pet.owner;
        passport.event_count = 1;
        passport.bump = ctx.bumps.passport;
        emit!(PetAdopted {
            owner: pet.owner,
            pet: pet.key(),
            name
        });
        Ok(())
    }

    pub fn perform_care_action(
        ctx: Context<PerformCareAction>,
        action: CareActionType,
    ) -> Result<()> {
        let pet = &mut ctx.accounts.pet;
        require_keys_eq!(
            pet.owner,
            ctx.accounts.owner.key(),
            PawketError::NotPetOwner
        );
        let now = Clock::get()?.unix_timestamp;
        match action {
            CareActionType::Feed => {
                require!(
                    now - pet.last_feed_at >= CARE_COOLDOWN_SECONDS,
                    PawketError::CareCooldownActive
                );
                pet.hunger = pet.hunger.saturating_add(23).min(100);
                pet.happiness = pet.happiness.saturating_add(2).min(100);
                pet.last_feed_at = now;
            }
            CareActionType::Play => {
                require!(
                    now - pet.last_play_at >= CARE_COOLDOWN_SECONDS,
                    PawketError::CareCooldownActive
                );
                pet.hunger = pet.hunger.saturating_sub(6);
                pet.happiness = pet.happiness.saturating_add(23).min(100);
                pet.energy = pet.energy.saturating_sub(12);
                pet.last_play_at = now;
            }
            CareActionType::Groom => {
                require!(
                    now - pet.last_groom_at >= CARE_COOLDOWN_SECONDS,
                    PawketError::CareCooldownActive
                );
                pet.happiness = pet.happiness.saturating_add(3).min(100);
                pet.hygiene = pet.hygiene.saturating_add(25).min(100);
                pet.last_groom_at = now;
            }
            CareActionType::Rest => {
                require!(
                    now - pet.last_rest_at >= CARE_COOLDOWN_SECONDS,
                    PawketError::CareCooldownActive
                );
                pet.energy = pet.energy.saturating_add(28).min(100);
                pet.last_rest_at = now;
            }
        }
        pet.xp = pet.xp.saturating_add(XP_PER_CARE_ACTION);
        pet.level = calculate_level(pet.xp);
        ctx.accounts.passport.event_count = ctx.accounts.passport.event_count.saturating_add(1);
        emit!(CarePerformed {
            owner: pet.owner,
            pet: pet.key(),
            action,
            xp: pet.xp,
            level: pet.level
        });
        Ok(())
    }

    pub fn register_item(
        ctx: Context<RegisterItem>,
        sku: String,
        item_type: ItemType,
        price_lamports: u64,
    ) -> Result<()> {
        require!(sku.len() >= 2 && sku.len() <= 64, PawketError::InvalidSku);
        let item = &mut ctx.accounts.item;
        item.authority = ctx.accounts.authority.key();
        item.sku = sku;
        item.item_type = item_type;
        item.price_lamports = price_lamports;
        item.active = true;
        item.bump = ctx.bumps.item;
        Ok(())
    }

    pub fn record_purchase(ctx: Context<RecordPurchase>, quantity: u16) -> Result<()> {
        require!(quantity > 0, PawketError::InvalidQuantity);
        require!(ctx.accounts.item.active, PawketError::InactiveItem);
        let ownership = &mut ctx.accounts.ownership;
        ownership.owner = ctx.accounts.owner.key();
        ownership.item = ctx.accounts.item.key();
        ownership.quantity = ownership.quantity.saturating_add(quantity);
        ownership.bump = ctx.bumps.ownership;
        emit!(PurchaseRecorded {
            owner: ownership.owner,
            item: ownership.item,
            quantity
        });
        Ok(())
    }
}

fn calculate_level(xp: u32) -> u16 {
    ((xp / 100) + 1).min(u16::MAX as u32) as u16
}

#[derive(Accounts)]
pub struct InitializeGameConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(init, payer = authority, space = 8 + GameConfig::INIT_SPACE, seeds = [b"game_config"], bump)]
    pub game_config: Account<'info, GameConfig>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct AdoptPet<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(init, payer = owner, space = 8 + Pet::INIT_SPACE, seeds = [b"pet", owner.key().as_ref(), name.as_bytes()], bump)]
    pub pet: Account<'info, Pet>,
    #[account(init, payer = owner, space = 8 + PetPassport::INIT_SPACE, seeds = [b"passport", pet.key().as_ref()], bump)]
    pub passport: Account<'info, PetPassport>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PerformCareAction<'info> {
    pub owner: Signer<'info>,
    #[account(mut, has_one = owner, seeds = [b"pet", owner.key().as_ref(), pet.name.as_bytes()], bump = pet.bump)]
    pub pet: Account<'info, Pet>,
    #[account(mut, seeds = [b"passport", pet.key().as_ref()], bump = passport.bump)]
    pub passport: Account<'info, PetPassport>,
}

#[derive(Accounts)]
#[instruction(sku: String)]
pub struct RegisterItem<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(init, payer = authority, space = 8 + ItemDefinition::INIT_SPACE, seeds = [b"item", sku.as_bytes()], bump)]
    pub item: Account<'info, ItemDefinition>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordPurchase<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    pub item: Account<'info, ItemDefinition>,
    #[account(init_if_needed, payer = owner, space = 8 + ItemOwnership::INIT_SPACE, seeds = [b"ownership", owner.key().as_ref(), item.key().as_ref()], bump)]
    pub ownership: Account<'info, ItemOwnership>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct GameConfig {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Pet {
    pub owner: Pubkey,
    #[max_len(24)]
    pub name: String,
    pub species: PetSpecies,
    pub personality: PetPersonality,
    pub birth_timestamp: i64,
    pub level: u16,
    pub xp: u32,
    pub hunger: u8,
    pub happiness: u8,
    pub energy: u8,
    pub hygiene: u8,
    pub last_feed_at: i64,
    pub last_play_at: i64,
    pub last_groom_at: i64,
    pub last_rest_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct PetPassport {
    pub pet: Pubkey,
    pub owner: Pubkey,
    pub event_count: u32,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ItemDefinition {
    pub authority: Pubkey,
    #[max_len(64)]
    pub sku: String,
    pub item_type: ItemType,
    pub price_lamports: u64,
    pub active: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ItemOwnership {
    pub owner: Pubkey,
    pub item: Pubkey,
    pub quantity: u16,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum PetSpecies {
    LunaCat,
    MossPup,
    CloudBun,
}
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum PetPersonality {
    Curious,
    Cozy,
    Brave,
    Mischief,
}
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum CareActionType {
    Feed,
    Play,
    Groom,
    Rest,
}
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum ItemType {
    Cosmetic,
    Food,
    Toy,
    EventPass,
    Egg,
    Bundle,
}

#[event]
pub struct GameConfigInitialized {
    pub authority: Pubkey,
    pub treasury: Pubkey,
}
#[event]
pub struct PetAdopted {
    pub owner: Pubkey,
    pub pet: Pubkey,
    pub name: String,
}
#[event]
pub struct CarePerformed {
    pub owner: Pubkey,
    pub pet: Pubkey,
    pub action: CareActionType,
    pub xp: u32,
    pub level: u16,
}
#[event]
pub struct PurchaseRecorded {
    pub owner: Pubkey,
    pub item: Pubkey,
    pub quantity: u16,
}

#[error_code]
pub enum PawketError {
    #[msg("Invalid pet name.")]
    InvalidPetName,
    #[msg("Signer does not own this pet.")]
    NotPetOwner,
    #[msg("Care action cooldown is still active.")]
    CareCooldownActive,
    #[msg("Invalid SKU.")]
    InvalidSku,
    #[msg("Item is inactive.")]
    InactiveItem,
    #[msg("Invalid quantity.")]
    InvalidQuantity,
}
