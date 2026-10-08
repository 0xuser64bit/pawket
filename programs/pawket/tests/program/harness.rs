//! LiteSVM harness for the pawket program: a clock, players, and one builder per instruction.
#![allow(dead_code)]

use anchor_lang::{
    prelude::{Clock, Pubkey},
    solana_program::{instruction::Instruction, system_program},
    AccountDeserialize, AccountSerialize, InstructionData, Space, ToAccountMetas,
};
use litesvm::{
    types::{FailedTransactionMetadata, TransactionMetadata},
    LiteSVM,
};
use pawket::{
    Ballot, CareActionType, Closet, EventRsvp, Guestbook, Guild, GuildEvent, GuildMember, GuildPoll, PawketError, PawketWallet, Pet,
    PetPassport, PetPersonality, PetSpecies,
};
use solana_keypair::Keypair;
use solana_signer::Signer;
use solana_transaction::Transaction;
use solana_transaction_error::TransactionError;

pub type TxResult = Result<TransactionMetadata, FailedTransactionMetadata>;

pub const SO: &[u8] = include_bytes!(concat!(env!("CARGO_TARGET_TMPDIR"), "/../deploy/pawket.so"));

/// 2026-10-01T10:00:00Z, UTC day 20727. `lockstep.txt` counts from here.
pub const T0: i64 = 1_790_848_800;
pub const HOUR: i64 = 3_600;
pub const DAY: i64 = 86_400;

pub fn pet_pda(owner: &Pubkey, name: &str) -> Pubkey {
    Pubkey::find_program_address(&[b"pet", owner.as_ref(), name.as_bytes()], &pawket::ID).0
}

pub fn passport_pda(pet: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[b"passport", pet.as_ref()], &pawket::ID).0
}

pub fn guild_pda(slug: &str) -> Pubkey {
    Pubkey::find_program_address(&[b"guild", slug.as_bytes()], &pawket::ID).0
}

pub fn member_pda(pet: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[b"member", pet.as_ref()], &pawket::ID).0
}

pub fn wallet_pda(owner: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[b"wallet", owner.as_ref()], &pawket::ID).0
}

pub fn closet_pda(owner: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[b"closet", owner.as_ref()], &pawket::ID).0
}

pub fn event_pda(guild: &Pubkey, id: u32) -> Pubkey {
    Pubkey::find_program_address(&[b"event", guild.as_ref(), &id.to_le_bytes()], &pawket::ID).0
}

pub fn rsvp_pda(event: &Pubkey, pet: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[b"rsvp", event.as_ref(), pet.as_ref()], &pawket::ID).0
}

pub fn poll_pda(guild: &Pubkey, id: u32) -> Pubkey {
    Pubkey::find_program_address(&[b"poll", guild.as_ref(), &id.to_le_bytes()], &pawket::ID).0
}

pub fn ballot_pda(poll: &Pubkey, owner: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[b"ballot", poll.as_ref(), owner.as_ref()], &pawket::ID).0
}

pub fn guestbook_pda(pet: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[b"guestbook", pet.as_ref()], &pawket::ID).0
}

pub struct Env {
    pub svm: LiteSVM,
}

impl Env {
    /// The program loaded, the clock at `T0`.
    pub fn new() -> Self {
        let mut svm = LiteSVM::new();
        svm.add_program(pawket::ID, SO).unwrap();
        let mut env = Env { svm };
        env.set_time(T0);
        env
    }

    pub fn player(&mut self) -> Keypair {
        let kp = Keypair::new();
        self.svm.airdrop(&kp.pubkey(), 10_000_000_000).unwrap();
        kp
    }

    /// A signer with no SOL: a player whose fees and rent a sponsor covers.
    pub fn broke(&mut self) -> Keypair {
        Keypair::new()
    }

    pub fn set_time(&mut self, unix_timestamp: i64) {
        let mut clock = self.svm.get_sysvar::<Clock>();
        clock.unix_timestamp = unix_timestamp;
        self.svm.set_sysvar(&clock);
    }

    pub fn now(&self) -> i64 {
        self.svm.get_sysvar::<Clock>().unix_timestamp
    }

    pub fn warp(&mut self, secs: i64) {
        let now = self.now();
        self.set_time(now + secs);
    }

    pub fn lamports(&self, address: &Pubkey) -> u64 {
        self.svm.get_account(address).map_or(0, |a| a.lamports)
    }

    fn account<T: AccountDeserialize>(&self, address: &Pubkey) -> T {
        let account = self.svm.get_account(address).unwrap();
        T::try_deserialize(&mut account.data.as_slice()).unwrap()
    }

    pub fn pet(&self, address: &Pubkey) -> Pet {
        self.account(address)
    }

    pub fn passport(&self, pet: &Pubkey) -> PetPassport {
        self.account(&passport_pda(pet))
    }

    pub fn guild(&self, slug: &str) -> Guild {
        self.account(&guild_pda(slug))
    }

    pub fn member(&self, pet: &Pubkey) -> GuildMember {
        self.account(&member_pda(pet))
    }

    pub fn wallet(&self, owner: &Pubkey) -> PawketWallet {
        self.account(&wallet_pda(owner))
    }

    pub fn closet(&self, owner: &Pubkey) -> Closet {
        self.account(&closet_pda(owner))
    }

    pub fn event(&self, address: &Pubkey) -> GuildEvent {
        self.account(address)
    }

    pub fn rsvp(&self, address: &Pubkey) -> EventRsvp {
        self.account(address)
    }

    pub fn poll(&self, address: &Pubkey) -> GuildPoll {
        self.account(address)
    }

    pub fn ballot(&self, address: &Pubkey) -> Ballot {
        self.account(address)
    }

    pub fn guestbook(&self, pet: &Pubkey) -> Guestbook {
        self.account(&guestbook_pda(pet))
    }

    /// A Pawket Wallet's balance: its lamports above rent.
    pub fn balance(&self, owner: &Pubkey) -> u64 {
        let account = self.svm.get_account(&wallet_pda(owner)).unwrap();
        account.lamports - self.svm.minimum_balance_for_rent_exemption(account.data.len())
    }

    pub fn exists(&self, address: &Pubkey) -> bool {
        self.svm.get_account(address).is_some_and(|a| a.lamports > 0)
    }

    /// `value` as the program's account at `address`, at its full size: what only `init` makes on
    /// a cluster, and only at its own address. For the tests that show a forged one is refused.
    pub fn forge<T: AccountSerialize + Space>(&mut self, address: &Pubkey, value: &T) {
        let mut data = Vec::new();
        value.try_serialize(&mut data).unwrap();
        data.resize(8 + T::INIT_SPACE, 0);
        let lamports = self.svm.minimum_balance_for_rent_exemption(data.len());
        let account = solana_account::Account { lamports, data, owner: pawket::ID, executable: false, rent_epoch: 0 };
        self.svm.set_account(*address, account).unwrap();
    }

    /// `ixs` with `fee_payer` paying; every keypair in `signers` signs.
    pub fn send(&mut self, ixs: &[Instruction], fee_payer: &Keypair, signers: &[&Keypair]) -> TxResult {
        let mut all: Vec<&Keypair> = vec![fee_payer];
        all.extend(signers.iter().copied().filter(|s| s.pubkey() != fee_payer.pubkey()));
        let tx = Transaction::new_signed_with_payer(
            ixs,
            Some(&fee_payer.pubkey()),
            &all,
            self.svm.latest_blockhash(),
        );
        let result = self.svm.send_transaction(tx);
        self.svm.expire_blockhash();
        result
    }

    /// The owner adopts and pays. Returns the pet's address.
    pub fn adopt(&mut self, owner: &Keypair, name: &str) -> Pubkey {
        ok(self.send(&[adopt_ix(&owner.pubkey(), &owner.pubkey(), name)], owner, &[]));
        pet_pda(&owner.pubkey(), name)
    }

    pub fn care(&mut self, owner: &Keypair, pet: &Pubkey, action: CareActionType) -> TxResult {
        self.send(&[care_ix(&owner.pubkey(), pet, action)], owner, &[])
    }

    pub fn round(&mut self, owner: &Keypair, pet: &Pubkey) -> TxResult {
        self.send(&[round_ix(&owner.pubkey(), pet)], owner, &[])
    }

    pub fn dress(&mut self, owner: &Keypair, pet: &Pubkey, wearing: u8) -> TxResult {
        self.send(&[dress_ix(&owner.pubkey(), pet, wearing)], owner, &[])
    }
}

pub fn adopt_ix(owner: &Pubkey, payer: &Pubkey, name: &str) -> Instruction {
    adopt_ix_with(owner, payer, name, PetSpecies::MossPup, PetPersonality::Cozy)
}

pub fn adopt_ix_with(
    owner: &Pubkey,
    payer: &Pubkey,
    name: &str,
    species: PetSpecies,
    personality: PetPersonality,
) -> Instruction {
    let pet = pet_pda(owner, name);
    Instruction {
        program_id: pawket::ID,
        accounts: pawket::accounts::AdoptPet {
            owner: *owner,
            payer: *payer,
            pet,
            passport: passport_pda(&pet),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: pawket::instruction::AdoptPet {
            name: name.to_string(),
            species,
            personality,
        }
        .data(),
    }
}

pub fn care_ix(owner: &Pubkey, pet: &Pubkey, action: CareActionType) -> Instruction {
    Instruction {
        program_id: pawket::ID,
        accounts: care_accounts(owner, pet),
        data: pawket::instruction::PerformCareAction { action }.data(),
    }
}

pub fn round_ix(owner: &Pubkey, pet: &Pubkey) -> Instruction {
    Instruction {
        program_id: pawket::ID,
        accounts: care_accounts(owner, pet),
        data: pawket::instruction::FinishRound {}.data(),
    }
}

pub fn dress_ix(owner: &Pubkey, pet: &Pubkey, wearing: u8) -> Instruction {
    Instruction {
        program_id: pawket::ID,
        accounts: pawket::accounts::Dress {
            owner: *owner,
            pet: *pet,
        }
        .to_account_metas(None),
        data: pawket::instruction::Dress { wearing }.data(),
    }
}

/// Found `slug` with `pet`, as the owner signs and `payer` pays.
pub fn found_ix(owner: &Pubkey, payer: &Pubkey, pet: &Pubkey, slug: &str) -> Instruction {
    found_ix_with(owner, payer, pet, slug, "Sunbeam Club", "Naps first, questions later.", 0, 0)
}

#[allow(clippy::too_many_arguments)]
pub fn found_ix_with(
    owner: &Pubkey,
    payer: &Pubkey,
    pet: &Pubkey,
    slug: &str,
    name: &str,
    motto: &str,
    crest: u8,
    colour: u8,
) -> Instruction {
    Instruction {
        program_id: pawket::ID,
        accounts: pawket::accounts::FoundGuild {
            owner: *owner,
            payer: *payer,
            pet: *pet,
            guild: guild_pda(slug),
            member: member_pda(pet),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: pawket::instruction::FoundGuild {
            slug: slug.to_string(),
            name: name.to_string(),
            motto: motto.to_string(),
            crest,
            colour,
        }
        .data(),
    }
}

pub fn join_ix(owner: &Pubkey, payer: &Pubkey, pet: &Pubkey, guild: &Pubkey) -> Instruction {
    Instruction {
        program_id: pawket::ID,
        accounts: pawket::accounts::JoinGuild {
            owner: *owner,
            payer: *payer,
            pet: *pet,
            guild: *guild,
            member: member_pda(pet),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: pawket::instruction::JoinGuild {}.data(),
    }
}

pub fn leave_ix(owner: &Pubkey, pet: &Pubkey, guild: &Pubkey, payer: &Pubkey) -> Instruction {
    Instruction {
        program_id: pawket::ID,
        accounts: pawket::accounts::LeaveGuild {
            owner: *owner,
            pet: *pet,
            member: member_pda(pet),
            guild: *guild,
            payer: *payer,
        }
        .to_account_metas(None),
        data: pawket::instruction::LeaveGuild {}.data(),
    }
}

pub fn open_wallet_ix(owner: &Pubkey, payer: &Pubkey) -> Instruction {
    Instruction {
        program_id: pawket::ID,
        accounts: pawket::accounts::OpenWallet {
            owner: *owner,
            payer: *payer,
            wallet: wallet_pda(owner),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: pawket::instruction::OpenWallet {}.data(),
    }
}

pub fn deposit_ix(owner: &Pubkey, amount: u64) -> Instruction {
    Instruction {
        program_id: pawket::ID,
        accounts: pawket::accounts::Deposit {
            owner: *owner,
            wallet: wallet_pda(owner),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: pawket::instruction::Deposit { amount }.data(),
    }
}

pub fn withdraw_ix(owner: &Pubkey, amount: u64) -> Instruction {
    Instruction {
        program_id: pawket::ID,
        accounts: pawket::accounts::Withdraw {
            owner: *owner,
            wallet: wallet_pda(owner),
        }
        .to_account_metas(None),
        data: pawket::instruction::Withdraw { amount }.data(),
    }
}

pub fn link_ix(owner: &Pubkey, device: &Pubkey, expires_at: i64, daily_actions: u16) -> Instruction {
    Instruction {
        program_id: pawket::ID,
        accounts: pawket::accounts::LinkDevice {
            owner: *owner,
            wallet: wallet_pda(owner),
            device: *device,
        }
        .to_account_metas(None),
        data: pawket::instruction::LinkDevice { expires_at, daily_actions }.data(),
    }
}

/// `authority` (the owner or the device) unlinks `device` from `owner`'s wallet. When the device
/// signs, pass `device_signs` so its meta is a signer and its float comes back.
pub fn unlink_ix(authority: &Pubkey, owner: &Pubkey, device: &Pubkey, device_signs: bool) -> Instruction {
    let mut accounts = pawket::accounts::UnlinkDevice {
        authority: *authority,
        wallet: wallet_pda(owner),
        device: *device,
        system_program: system_program::ID,
    }
    .to_account_metas(None);
    if device_signs {
        accounts[2].is_signer = true;
    }
    Instruction {
        program_id: pawket::ID,
        accounts,
        data: pawket::instruction::UnlinkDevice {}.data(),
    }
}

pub fn close_wallet_ix(owner: &Pubkey, rent_payer: &Pubkey) -> Instruction {
    Instruction {
        program_id: pawket::ID,
        accounts: pawket::accounts::CloseWallet {
            owner: *owner,
            wallet: wallet_pda(owner),
            rent_payer: *rent_payer,
        }
        .to_account_metas(None),
        data: pawket::instruction::CloseWallet {}.data(),
    }
}

fn device_care_accounts(device: &Pubkey, owner: &Pubkey, pet: &Pubkey) -> Vec<anchor_lang::prelude::AccountMeta> {
    pawket::accounts::CareByDevice {
        device: *device,
        wallet: wallet_pda(owner),
        pet: *pet,
        passport: passport_pda(pet),
    }
    .to_account_metas(None)
}

pub fn care_by_device_ix(device: &Pubkey, owner: &Pubkey, pet: &Pubkey, action: CareActionType) -> Instruction {
    Instruction {
        program_id: pawket::ID,
        accounts: device_care_accounts(device, owner, pet),
        data: pawket::instruction::CareByDevice { action }.data(),
    }
}

pub fn round_by_device_ix(device: &Pubkey, owner: &Pubkey, pet: &Pubkey) -> Instruction {
    Instruction {
        program_id: pawket::ID,
        accounts: device_care_accounts(device, owner, pet),
        data: pawket::instruction::FinishRoundByDevice {}.data(),
    }
}

pub fn dress_by_device_ix(device: &Pubkey, owner: &Pubkey, pet: &Pubkey, wearing: u8) -> Instruction {
    Instruction {
        program_id: pawket::ID,
        accounts: pawket::accounts::DressByDevice {
            device: *device,
            wallet: wallet_pda(owner),
            pet: *pet,
        }
        .to_account_metas(None),
        data: pawket::instruction::DressByDevice { wearing }.data(),
    }
}

pub fn buy_ix(owner: &Pubkey, payer: &Pubkey, item: u8) -> Instruction {
    buy_ix_to(owner, payer, item, &pawket::TREASURY)
}

pub fn buy_ix_to(owner: &Pubkey, payer: &Pubkey, item: u8, treasury: &Pubkey) -> Instruction {
    Instruction {
        program_id: pawket::ID,
        accounts: pawket::accounts::Buy {
            owner: *owner,
            payer: *payer,
            closet: closet_pda(owner),
            treasury: *treasury,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: pawket::instruction::Buy { item }.data(),
    }
}

pub fn dress_owned_ix(owner: &Pubkey, pet: &Pubkey, wearing: u8) -> Instruction {
    Instruction {
        program_id: pawket::ID,
        accounts: pawket::accounts::DressOwned {
            owner: *owner,
            pet: *pet,
            closet: closet_pda(owner),
        }
        .to_account_metas(None),
        data: pawket::instruction::DressOwned { wearing }.data(),
    }
}

pub fn dress_owned_by_device_ix(device: &Pubkey, owner: &Pubkey, pet: &Pubkey, wearing: u8) -> Instruction {
    Instruction {
        program_id: pawket::ID,
        accounts: pawket::accounts::DressOwnedByDevice {
            device: *device,
            wallet: wallet_pda(owner),
            pet: *pet,
            closet: closet_pda(owner),
        }
        .to_account_metas(None),
        data: pawket::instruction::DressOwnedByDevice { wearing }.data(),
    }
}

#[allow(clippy::too_many_arguments)]
pub fn create_event_ix(
    owner: &Pubkey,
    payer: &Pubkey,
    guild: &Pubkey,
    id: u32,
    title: &str,
    note: &str,
    starts_at: i64,
    ends_at: i64,
) -> Instruction {
    Instruction {
        program_id: pawket::ID,
        accounts: pawket::accounts::CreateEvent {
            owner: *owner,
            payer: *payer,
            guild: *guild,
            event: event_pda(guild, id),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: pawket::instruction::CreateEvent {
            id,
            title: title.to_string(),
            note: note.to_string(),
            starts_at,
            ends_at,
        }
        .data(),
    }
}

pub fn rsvp_ix(owner: &Pubkey, payer: &Pubkey, pet: &Pubkey, event: &Pubkey) -> Instruction {
    Instruction {
        program_id: pawket::ID,
        accounts: pawket::accounts::Rsvp {
            owner: *owner,
            payer: *payer,
            pet: *pet,
            member: member_pda(pet),
            event: *event,
            rsvp: rsvp_pda(event, pet),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: pawket::instruction::Rsvp {}.data(),
    }
}

pub fn check_in_ix(owner: &Pubkey, pet: &Pubkey, event: &Pubkey) -> Instruction {
    Instruction {
        program_id: pawket::ID,
        accounts: pawket::accounts::CheckIn {
            owner: *owner,
            pet: *pet,
            event: *event,
            rsvp: rsvp_pda(event, pet),
        }
        .to_account_metas(None),
        data: pawket::instruction::CheckIn {}.data(),
    }
}

pub fn create_poll_ix(
    owner: &Pubkey,
    payer: &Pubkey,
    guild: &Pubkey,
    id: u32,
    question: &str,
    options: &[&str],
    closes_at: i64,
) -> Instruction {
    Instruction {
        program_id: pawket::ID,
        accounts: pawket::accounts::CreatePoll {
            owner: *owner,
            payer: *payer,
            guild: *guild,
            poll: poll_pda(guild, id),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: pawket::instruction::CreatePoll {
            id,
            question: question.to_string(),
            options: options.iter().map(|o| o.to_string()).collect(),
            closes_at,
        }
        .data(),
    }
}

pub fn vote_ix(owner: &Pubkey, payer: &Pubkey, pet: &Pubkey, poll: &Pubkey, option: u8) -> Instruction {
    Instruction {
        program_id: pawket::ID,
        accounts: pawket::accounts::Vote {
            owner: *owner,
            payer: *payer,
            pet: *pet,
            member: member_pda(pet),
            poll: *poll,
            ballot: ballot_pda(poll, owner),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: pawket::instruction::Vote { option }.data(),
    }
}

pub fn wave_ix(visitor: &Pubkey, payer: &Pubkey, pet: &Pubkey) -> Instruction {
    Instruction {
        program_id: pawket::ID,
        accounts: pawket::accounts::Wave {
            visitor: *visitor,
            payer: *payer,
            pet: *pet,
            guestbook: guestbook_pda(pet),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: pawket::instruction::Wave {}.data(),
    }
}

/// `ix` as the owner's linked device signs it: the device and the owner's Pawket Wallet take the
/// owner's place, the rest of the accounts stay as they were, and the arguments stay as they were
/// behind the device instruction's own discriminator. The web app builds every device action this
/// way (`asDeviceInstruction`), so each `*ByDevice` struct must keep this order.
pub fn by_device(ix: Instruction, device: &Pubkey, owner: &Pubkey, discriminator: &[u8]) -> Instruction {
    use anchor_lang::prelude::AccountMeta;
    let mut accounts = vec![AccountMeta::new(*device, true), AccountMeta::new(wallet_pda(owner), false)];
    accounts.extend(ix.accounts.into_iter().skip(1));
    Instruction {
        program_id: ix.program_id,
        accounts,
        data: [discriminator, &ix.data[8..]].concat(),
    }
}

/// A plain system transfer, which any key may sign for its own lamports: `Transfer` is variant 2.
pub fn transfer_ix(from: &Pubkey, to: &Pubkey, lamports: u64) -> Instruction {
    use anchor_lang::prelude::AccountMeta;
    Instruction {
        program_id: system_program::ID,
        accounts: vec![AccountMeta::new(*from, true), AccountMeta::new(*to, false)],
        data: [&2u32.to_le_bytes()[..], &lamports.to_le_bytes()].concat(),
    }
}

fn care_accounts(owner: &Pubkey, pet: &Pubkey) -> Vec<anchor_lang::prelude::AccountMeta> {
    pawket::accounts::Care {
        owner: *owner,
        pet: *pet,
        passport: passport_pda(pet),
    }
    .to_account_metas(None)
}

pub fn ok(result: TxResult) -> TransactionMetadata {
    match result {
        Ok(meta) => meta,
        Err(failed) => panic!("{:?}\n{}", failed.err, failed.meta.pretty_logs()),
    }
}

pub fn expect_pawket(result: &TxResult, error: PawketError) {
    expect_custom(result, anchor_lang::error::ERROR_CODE_OFFSET + error as u32);
}

pub fn expect_anchor(result: &TxResult, error: anchor_lang::error::ErrorCode) {
    expect_custom(result, error as u32);
}

pub fn expect_custom(result: &TxResult, code: u32) {
    match result {
        Err(failed) => match &failed.err {
            TransactionError::InstructionError(_, err) => assert_eq!(
                *err,
                anchor_lang::solana_program::instruction::error::InstructionError::Custom(code),
                "logs:\n{}",
                failed.meta.pretty_logs()
            ),
            other => panic!("expected custom error {code}, got {other:?}"),
        },
        Ok(meta) => panic!(
            "expected custom error {code}, but it succeeded:\n{}",
            meta.pretty_logs()
        ),
    }
}

/// An owner-approved Market purchase paid from Pawket Wallet.
pub fn buy_with_wallet_ix(owner: &Pubkey, payer: &Pubkey, item: u8) -> Instruction {
    Instruction {
        program_id: pawket::ID,
        accounts: pawket::accounts::BuyWithWallet {
            owner: *owner, payer: *payer, closet: closet_pda(owner),
            treasury: pawket::TREASURY, system_program: system_program::ID, wallet: wallet_pda(owner),
        }.to_account_metas(None),
        data: pawket::instruction::BuyWithWallet { item }.data(),
    }
}

pub fn wallet_spend_ix(owner: &Pubkey, device: &Pubkey, keep: u64, amount: Option<u64>) -> Instruction {
    Instruction {
        program_id: pawket::ID,
        accounts: pawket::accounts::WalletSpend {
            owner: *owner, wallet: wallet_pda(owner), device: *device,
            instructions: solana_instructions_sysvar::ID, system_program: system_program::ID,
        }.to_account_metas(None),
        data: match amount {
            Some(amount) => pawket::instruction::FundWalletSpend { amount, keep }.data(),
            None => pawket::instruction::SettleWalletSpend { keep }.data(),
        },
    }
}
