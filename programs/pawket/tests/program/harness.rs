//! LiteSVM harness for the pawket program: a clock, players, and one builder per instruction.
#![allow(dead_code)]

use anchor_lang::{
    prelude::{Clock, Pubkey},
    solana_program::{instruction::Instruction, system_program},
    AccountDeserialize, InstructionData, ToAccountMetas,
};
use litesvm::{
    types::{FailedTransactionMetadata, TransactionMetadata},
    LiteSVM,
};
use pawket::{CareActionType, PawketError, Pet, PetPassport, PetPersonality, PetSpecies};
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
