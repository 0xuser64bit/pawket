use anchor_lang::{Discriminator, Space};
use pawket::{Closet, PawketError, CLASSIC_PRICE_LAMPORTS, ROOM_PRICE_LAMPORTS, TREASURY, WEARABLE_COUNT, WEARABLE_PRICE_LAMPORTS};
use solana_keypair::Keypair;
use solana_signer::Signer;

type Instruction = anchor_lang::solana_program::instruction::Instruction;

use crate::harness::*;

const HALO: u8 = 19;
const LAST_CLASSIC: u8 = 18;
const LAST_PIECE: u8 = 28;
const FIRST_ROOM: u8 = 64;
const LAST_ROOM: u8 = 75;
const LAST_FRAME: u8 = 87;

#[test]
fn a_piece_bought_in_the_market_goes_to_the_treasury_and_into_the_closet_while_a_sponsor_pays_the_rest() {
    let mut env = Env::new();
    let sponsor = env.player();
    let owner = env.player();
    let pet = env.adopt(&owner, "Pepper");
    let treasury_before = env.lamports(&TREASURY);
    let owner_before = env.lamports(&owner.pubkey());

    ok(env.send(&[buy_ix(&owner.pubkey(), &sponsor.pubkey(), HALO)], &sponsor, &[&owner]));

    assert_eq!(env.lamports(&TREASURY) - treasury_before, WEARABLE_PRICE_LAMPORTS);
    assert_eq!(owner_before - env.lamports(&owner.pubkey()), WEARABLE_PRICE_LAMPORTS);
    let closet = env.closet(&owner.pubkey());
    assert_eq!(closet.owner, owner.pubkey());
    assert!(closet.has(HALO));
    assert!(!closet.has(HALO + 1));
    assert_eq!((closet.count, closet.spent), (1, WEARABLE_PRICE_LAMPORTS));

    expect_pawket(&env.dress(&owner, &pet, HALO), PawketError::UnknownWearable);
    ok(env.send(&[dress_owned_ix(&owner.pubkey(), &pet, HALO)], &owner, &[]));
    assert_eq!(env.pet(&pet).wearing, HALO);
}

#[test]
fn a_room_is_recorded_like_a_piece_and_the_closet_adds_up() {
    let mut env = Env::new();
    let owner = env.player();
    for item in [HALO, FIRST_ROOM, FIRST_ROOM + 1] {
        ok(env.send(&[buy_ix(&owner.pubkey(), &owner.pubkey(), item)], &owner, &[]));
    }
    let closet = env.closet(&owner.pubkey());
    assert!(closet.has(FIRST_ROOM) && closet.has(FIRST_ROOM + 1));
    assert_eq!(closet.count, 3);
    assert_eq!(closet.spent, WEARABLE_PRICE_LAMPORTS + 2 * ROOM_PRICE_LAMPORTS);
}

#[test]
fn nothing_is_bought_twice_and_only_what_the_market_sells_is_sold() {
    let mut env = Env::new();
    let owner = env.player();
    ok(env.send(&[buy_ix(&owner.pubkey(), &owner.pubkey(), HALO)], &owner, &[]));
    let spent = env.closet(&owner.pubkey()).spent;
    expect_pawket(&env.send(&[buy_ix(&owner.pubkey(), &owner.pubkey(), HALO)], &owner, &[]), PawketError::AlreadyOwned);
    for item in [0, 1, WEARABLE_COUNT, LAST_PIECE + 1, FIRST_ROOM - 1, LAST_ROOM + 1, 79, LAST_FRAME + 1, 255] {
        expect_pawket(&env.send(&[buy_ix(&owner.pubkey(), &owner.pubkey(), item)], &owner, &[]), PawketError::UnknownItem);
    }
    assert_eq!(env.closet(&owner.pubkey()).spent, spent);
    for item in 0..=u8::MAX {
        let expected = match item {
            4..=LAST_CLASSIC => Some(CLASSIC_PRICE_LAMPORTS),
            HALO..=LAST_PIECE => Some(WEARABLE_PRICE_LAMPORTS),
            FIRST_ROOM..=LAST_ROOM => Some(ROOM_PRICE_LAMPORTS),
            80..=LAST_FRAME => Some(pawket::FRAME_PRICE_LAMPORTS),
            _ => None,
        };
        assert_eq!(pawket::item_price(item), expected, "item {item}");
    }
}

#[test]
fn a_sale_goes_to_the_treasury_and_nowhere_else() {
    let mut env = Env::new();
    let owner = env.player();
    let thief = env.player();
    let result = env.send(&[buy_ix_to(&owner.pubkey(), &owner.pubkey(), HALO, &thief.pubkey())], &owner, &[]);
    expect_anchor(&result, anchor_lang::error::ErrorCode::ConstraintAddress);
}

#[test]
fn a_closet_that_is_there_already_is_bought_into_only_while_it_names_its_owner() {
    let mut env = Env::new();
    let owner = env.player();
    let other = env.player();
    let forged = Closet { owner: other.pubkey(), items: [0; 32], count: 0, spent: 0, bump: 0 };
    env.forge(&closet_pda(&owner.pubkey()), &forged);
    let treasury_before = env.lamports(&TREASURY);

    let result = env.send(&[buy_ix(&owner.pubkey(), &owner.pubkey(), HALO)], &owner, &[]);
    expect_anchor(&result, anchor_lang::error::ErrorCode::ConstraintRaw);
    assert_eq!(env.lamports(&TREASURY), treasury_before);
}

#[test]
fn a_purchase_lands_only_in_the_buyers_own_closet() {
    let mut env = Env::new();
    let (buyer, other) = (env.player(), env.player());
    ok(env.send(&[buy_ix(&other.pubkey(), &other.pubkey(), HALO)], &other, &[]));
    let mut misdirected = buy_ix(&buyer.pubkey(), &buyer.pubkey(), HALO + 1);
    misdirected.accounts[2].pubkey = closet_pda(&other.pubkey());
    expect_anchor(&env.send(&[misdirected], &buyer, &[]), anchor_lang::error::ErrorCode::ConstraintSeeds);
    assert_eq!(env.closet(&other.pubkey()).count, 1);
}

#[test]
fn nobody_dresses_someone_elses_pet_in_what_they_bought() {
    let mut env = Env::new();
    let (owner, stranger) = (env.player(), env.player());
    let pet = env.adopt(&owner, "Pepper");
    ok(env.send(&[buy_ix(&stranger.pubkey(), &stranger.pubkey(), HALO)], &stranger, &[]));
    let result = env.send(&[dress_owned_ix(&stranger.pubkey(), &pet, HALO)], &stranger, &[]);
    expect_pawket(&result, PawketError::NotPetOwner);
    assert_eq!(env.pet(&pet).wearing, 0);
}

#[test]
fn a_piece_not_in_the_closet_is_not_worn() {
    let mut env = Env::new();
    let owner = env.player();
    let pet = env.adopt(&owner, "Pepper");
    ok(env.send(&[buy_ix(&owner.pubkey(), &owner.pubkey(), HALO)], &owner, &[]));

    expect_pawket(
        &env.send(&[dress_owned_ix(&owner.pubkey(), &pet, HALO + 1)], &owner, &[]),
        PawketError::NotInCloset,
    );
    expect_pawket(
        &env.send(&[dress_owned_ix(&owner.pubkey(), &pet, LAST_PIECE + 1)], &owner, &[]),
        PawketError::UnknownWearable,
    );
    ok(env.send(&[dress_owned_ix(&owner.pubkey(), &pet, 3)], &owner, &[]));
    ok(env.send(&[dress_owned_ix(&owner.pubkey(), &pet, 0)], &owner, &[]));
    assert_eq!(env.pet(&pet).wearing, 0);

    let other = env.player();
    ok(env.send(&[buy_ix(&other.pubkey(), &other.pubkey(), HALO + 1)], &other, &[]));
    let mut borrowed = dress_owned_ix(&owner.pubkey(), &pet, HALO + 1);
    borrowed.accounts[2].pubkey = closet_pda(&other.pubkey());
    assert!(env.send(&[borrowed], &owner, &[]).is_err());
}

#[test]
fn a_linked_device_dresses_a_pet_in_what_its_owner_bought() {
    let mut env = Env::new();
    let owner = env.player();
    let device = env.broke();
    let pet = env.adopt(&owner, "Pepper");
    ok(env.send(&[buy_ix(&owner.pubkey(), &owner.pubkey(), HALO)], &owner, &[]));
    ok(env.send(&[open_wallet_ix(&owner.pubkey(), &owner.pubkey()), deposit_ix(&owner.pubkey(), 100_000_000)], &owner, &[]));
    ok(env.send(&[link_ix(&owner.pubkey(), &device.pubkey(), env.now() + DAY, 10)], &owner, &[&device]));

    ok(env.send(&[dress_owned_by_device_ix(&device.pubkey(), &owner.pubkey(), &pet, HALO)], &device, &[]));
    assert_eq!(env.pet(&pet).wearing, HALO);
    expect_pawket(
        &env.send(&[dress_owned_by_device_ix(&device.pubkey(), &owner.pubkey(), &pet, HALO + 1)], &device, &[]),
        PawketError::NotInCloset,
    );
    let other = env.player();
    ok(env.send(&[buy_ix(&other.pubkey(), &other.pubkey(), HALO + 1)], &other, &[]));
    let mut borrowed = dress_owned_by_device_ix(&device.pubkey(), &owner.pubkey(), &pet, HALO + 1);
    borrowed.accounts[3].pubkey = closet_pda(&other.pubkey());
    expect_anchor(&env.send(&[borrowed], &device, &[]), anchor_lang::error::ErrorCode::ConstraintSeeds);
    assert_eq!(env.pet(&pet).wearing, HALO);
}

#[test]
fn the_closet_layout_is_the_contract_the_web_app_decodes() {
    let mut env = Env::new();
    let owner = env.player();
    ok(env.send(&[buy_ix(&owner.pubkey(), &owner.pubkey(), HALO)], &owner, &[]));
    assert_eq!(8 + <Closet as Space>::INIT_SPACE, 83);
    let data = env.svm.get_account(&closet_pda(&owner.pubkey())).unwrap().data;
    assert_eq!(data.len(), 83);
    assert_eq!(&data[..8], Closet::DISCRIMINATOR);
    assert_eq!(&data[8..40], owner.pubkey().as_ref());
    assert_eq!(data[40 + usize::from(HALO / 8)], 1 << (HALO % 8));
}

#[test]
fn funded_purchases_debit_pawket_wallet_and_never_the_owners_existing_sol() {
    let mut env = Env::new();
    let (owner, sponsor, device) = (env.player(), env.player(), env.broke());
    ok(env.send(&[open_wallet_ix(&owner.pubkey(), &sponsor.pubkey()), deposit_ix(&owner.pubkey(), 200_000_000)], &sponsor, &[&owner]));
    ok(env.send(&[link_ix(&owner.pubkey(), &device.pubkey(), env.now() + DAY, 100)], &sponsor, &[&owner, &device]));
    let (keep, balance, treasury) = (env.lamports(&owner.pubkey()), env.balance(&owner.pubkey()), env.lamports(&TREASURY));
    for item in [4, 71, 83] {
        ok(env.send(&[buy_with_wallet_ix(&owner.pubkey(), &sponsor.pubkey(), item)], &sponsor, &[&owner]));
        assert!(env.closet(&owner.pubkey()).has(item));
    }
    let cost = CLASSIC_PRICE_LAMPORTS + ROOM_PRICE_LAMPORTS + pawket::FRAME_PRICE_LAMPORTS;
    assert_eq!(env.lamports(&owner.pubkey()), keep);
    assert_eq!(balance - env.balance(&owner.pubkey()), cost);
    assert_eq!(env.lamports(&TREASURY) - treasury, cost);
    expect_pawket(&env.send(&[buy_with_wallet_ix(&owner.pubkey(), &sponsor.pubkey(), 83)], &sponsor, &[&owner]), PawketError::AlreadyOwned);
    expect_pawket(&env.send(&[buy_with_wallet_ix(&owner.pubkey(), &sponsor.pubkey(), FIRST_ROOM)], &sponsor, &[&owner]), PawketError::InsufficientBalance);
    assert!(!env.closet(&owner.pubkey()).has(FIRST_ROOM));
    let stranger = env.player();
    ok(env.send(&[open_wallet_ix(&stranger.pubkey(), &sponsor.pubkey())], &sponsor, &[&stranger]));
    let mut forged = buy_with_wallet_ix(&owner.pubkey(), &sponsor.pubkey(), 5);
    forged.accounts[5].pubkey = wallet_pda(&stranger.pubkey());
    expect_anchor(&env.send(&[forged], &sponsor, &[&owner]), anchor_lang::error::ErrorCode::ConstraintSeeds);
    let device_buy = buy_with_wallet_ix(&device.pubkey(), &sponsor.pubkey(), 5);
    assert!(env.send(&[device_buy], &sponsor, &[&device]).is_err());
}

#[test]
fn owner_approved_external_spending_returns_change_and_sale_proceeds_to_pawket_wallet() {
    use anchor_lang::solana_program::system_instruction::transfer;
    let mut env = Env::new();
    let (owner, device, recipient, sponsor) = (env.player(), env.broke(), env.player(), env.player());
    ok(env.send(&[open_wallet_ix(&owner.pubkey(), &sponsor.pubkey()), deposit_ix(&owner.pubkey(), 100_000_000)], &sponsor, &[&owner]));
    ok(env.send(&[link_ix(&owner.pubkey(), &device.pubkey(), env.now() + DAY, 100)], &sponsor, &[&owner, &device]));
    let keep = env.lamports(&owner.pubkey());
    let before = env.balance(&owner.pubkey());
    let spent = env.wallet(&owner.pubkey()).spent;
    let fund = wallet_spend_ix(&owner.pubkey(), &device.pubkey(), keep, Some(20_000_000));
    let settle = wallet_spend_ix(&owner.pubkey(), &device.pubkey(), keep, None);
    ok(env.send(&[fund.clone(), transfer(&owner.pubkey(), &recipient.pubkey(), 7_000_000), settle.clone()], &device, &[&owner]));
    assert_eq!(env.lamports(&owner.pubkey()), keep);
    assert_eq!(before - env.balance(&owner.pubkey()), 7_010_000);
    assert_eq!(env.wallet(&owner.pubkey()).spent - spent, 7_010_000);
    let before = env.balance(&owner.pubkey());
    ok(env.send(&[fund.clone(), transfer(&recipient.pubkey(), &owner.pubkey(), 30_000_000), settle.clone()], &device, &[&owner, &recipient]));
    assert_eq!(env.lamports(&owner.pubkey()), keep);
    assert_eq!(env.balance(&owner.pubkey()) - before, 30_000_000 - 15_000);
    let before = env.balance(&owner.pubkey());
    let overspend = transfer(&owner.pubkey(), &recipient.pubkey(), 20_000_001);
    expect_pawket_at(&env.send(&[fund.clone(), overspend, settle.clone()], &device, &[&owner]), 2, PawketError::InsufficientBalance);
    assert_eq!(env.lamports(&owner.pubkey()), keep);
    assert_eq!(env.balance(&owner.pubkey()), before);
    expect_pawket_at(&env.send(&[fund.clone()], &device, &[&owner]), 0, PawketError::InvalidAmount);
    expect_pawket_at(&env.send(&[settle.clone()], &device, &[&owner]), 0, PawketError::InvalidAmount);
    let wrong_keep = wallet_spend_ix(&owner.pubkey(), &device.pubkey(), keep - 1, None);
    expect_pawket_at(&env.send(&[fund.clone(), wrong_keep], &device, &[&owner]), 0, PawketError::InvalidAmount);
    let mut foreign = settle.clone();
    foreign.accounts[1].pubkey = wallet_pda(&recipient.pubkey());
    expect_pawket_at(&env.send(&[fund.clone(), foreign], &device, &[&owner]), 0, PawketError::InvalidAmount);
    let first = transfer(&recipient.pubkey(), &owner.pubkey(), 1);
    expect_pawket_at(&env.send(&[first, fund.clone(), settle.clone()], &device, &[&owner, &recipient]), 1, PawketError::InvalidAmount);
    let pay = transfer(&owner.pubkey(), &recipient.pubkey(), 1_000);
    expect_pawket_at(&env.send(&[fund.clone(), pay, settle.clone(), settle.clone()], &device, &[&owner]), 2, PawketError::InvalidAmount);
    let stranger = env.broke();
    let elsewhere = wallet_spend_ix(&owner.pubkey(), &stranger.pubkey(), keep, Some(20_000_000));
    let settle_elsewhere = wallet_spend_ix(&owner.pubkey(), &stranger.pubkey(), keep, None);
    expect_pawket_at(&env.send(&[elsewhere, settle_elsewhere], &device, &[&owner]), 0, PawketError::NotThisDevice);
    env.warp(2 * DAY);
    expect_pawket_at(&env.send(&[fund, settle], &device, &[&owner]), 0, PawketError::DeviceExpired);
    assert_eq!(env.lamports(&owner.pubkey()), keep);
    assert_eq!(env.balance(&owner.pubkey()), before);
}

#[test]
fn a_funded_purchase_is_held_to_what_the_market_sells_its_treasury_and_the_owners_closet() {
    let mut env = Env::new();
    let (owner, sponsor, thief) = (env.player(), env.player(), env.player());
    ok(env.send(&[open_wallet_ix(&owner.pubkey(), &sponsor.pubkey()), deposit_ix(&owner.pubkey(), 200_000_000)], &sponsor, &[&owner]));
    let (balance, treasury) = (env.balance(&owner.pubkey()), env.lamports(&TREASURY));
    let buy = |item: u8| buy_with_wallet_ix(&owner.pubkey(), &sponsor.pubkey(), item);
    for item in [0, 1, LAST_PIECE + 1, 79, LAST_FRAME + 1, 255] {
        expect_pawket(&env.send(&[buy(item)], &sponsor, &[&owner]), PawketError::UnknownItem);
    }
    let elsewhere = buy_with_wallet_ix_to(&owner.pubkey(), &sponsor.pubkey(), HALO, &thief.pubkey());
    expect_anchor(&env.send(&[elsewhere], &sponsor, &[&owner]), anchor_lang::error::ErrorCode::ConstraintAddress);
    let forged = Closet { owner: thief.pubkey(), items: [0; 32], count: 0, spent: 0, bump: 0 };
    env.forge(&closet_pda(&owner.pubkey()), &forged);
    expect_anchor(&env.send(&[buy(HALO)], &sponsor, &[&owner]), anchor_lang::error::ErrorCode::ConstraintRaw);
    assert_eq!(env.balance(&owner.pubkey()), balance);
    assert_eq!(env.lamports(&TREASURY), treasury);
}

/// A spend funded for the owner's approved transaction: its opening and settling halves.
struct Spend {
    owner: Keypair,
    device: Keypair,
    keep: u64,
    balance: u64,
}

fn spend_ready(env: &mut Env) -> Spend {
    let (owner, device, sponsor) = (env.player(), env.broke(), env.player());
    ok(env.send(&[open_wallet_ix(&owner.pubkey(), &sponsor.pubkey()), deposit_ix(&owner.pubkey(), 100_000_000)], &sponsor, &[&owner]));
    ok(env.send(&[link_ix(&owner.pubkey(), &device.pubkey(), env.now() + DAY, 100)], &sponsor, &[&owner, &device]));
    let (keep, balance) = (env.lamports(&owner.pubkey()), env.balance(&owner.pubkey()));
    Spend { owner, device, keep, balance }
}

impl Spend {
    fn halves(&self, keep: u64, amount: u64) -> [Instruction; 2] {
        [Some(amount), None].map(|amount| wallet_spend_ix(&self.owner.pubkey(), &self.device.pubkey(), keep, amount))
    }

    fn untouched(&self, env: &Env) {
        assert_eq!(env.lamports(&self.owner.pubkey()), self.keep);
        assert_eq!(env.balance(&self.owner.pubkey()), self.balance);
    }
}

#[test]
fn a_spend_opens_first_on_exactly_what_the_owner_holds_and_within_the_balance() {
    let mut env = Env::new();
    let s = spend_ready(&mut env);
    let (owner, device, bystander) = (&s.owner, &s.device, env.player());
    let [fund, settle] = s.halves(s.keep, 1_000_000);
    // Funding comes first, even after an instruction that leaves the owner's SOL alone.
    let aside = transfer_ix(&bystander.pubkey(), &device.pubkey(), 1);
    expect_pawket_at(&env.send(&[aside, fund, settle], device, &[owner, &bystander]), 1, PawketError::InvalidAmount);
    // The SOL the owner keeps is exactly what it holds, so a settlement can neither sweep nor spend any of it.
    for keep in [s.keep - 1, s.keep + 1] {
        expect_pawket_at(&env.send(&s.halves(keep, 1_000_000), device, &[owner]), 0, PawketError::InvalidAmount);
    }
    // Nothing past the balance is funded, not even what settling would hand straight back.
    expect_pawket_at(&env.send(&s.halves(s.keep, s.balance + 1), device, &[owner]), 0, PawketError::InsufficientBalance);
    s.untouched(&env);
}

#[test]
fn a_spend_opens_and_settles_only_with_pawkets_own_instructions_on_the_real_record_of_them() {
    let mut env = Env::new();
    let s = spend_ready(&mut env);
    let (owner, device) = (&s.owner, &s.device);
    let [fund, settle] = s.halves(s.keep, 20_000_000);
    // A program anyone may deploy, given the same accounts and bytes, neither settles a spend nor opens one.
    let any = env.any_program();
    let elsewhere = |ix: &Instruction| Instruction { program_id: any, ..ix.clone() };
    expect_pawket_at(&env.send(&[fund.clone(), elsewhere(&settle)], device, &[owner]), 0, PawketError::InvalidAmount);
    expect_pawket_at(&env.send(&[elsewhere(&fund), settle.clone()], device, &[owner]), 1, PawketError::InvalidAmount);
    // Nor does another of Pawket's instructions of the same length on the same owner and wallet.
    let mut deposit = deposit_ix(&owner.pubkey(), 1);
    deposit.data.extend_from_slice(&s.keep.to_le_bytes());
    expect_pawket_at(&env.send(&[deposit, settle.clone()], device, &[owner]), 1, PawketError::InvalidAmount);
    // Both halves read the transaction's own instructions, never an account made to look like them.
    let mut forged = fund;
    forged.accounts[3].pubkey = Keypair::new().pubkey();
    expect_anchor(&env.send(&[forged, settle], device, &[owner]), anchor_lang::error::ErrorCode::ConstraintAddress);
    s.untouched(&env);
}

#[test]
fn nobody_funds_a_spend_from_a_wallet_that_is_not_theirs() {
    let mut env = Env::new();
    let s = spend_ready(&mut env);
    let (stranger, payer) = (env.player(), env.player());
    let keep = env.lamports(&stranger.pubkey());
    // The stranger signs as owner over this wallet and its linked device, which signs nothing here,
    // and sends what it is funded away before settling.
    let [mut fund, mut settle] = [Some(90_000_000), None].map(|amount| wallet_spend_ix(&stranger.pubkey(), &s.device.pubkey(), keep, amount));
    fund.accounts[1].pubkey = wallet_pda(&s.owner.pubkey());
    settle.accounts[1].pubkey = wallet_pda(&s.owner.pubkey());
    let away = transfer_ix(&stranger.pubkey(), &payer.pubkey(), 90_000_000);
    expect_anchor(&env.send(&[fund, away, settle], &payer, &[&stranger]), anchor_lang::error::ErrorCode::ConstraintSeeds);
    s.untouched(&env);
}
