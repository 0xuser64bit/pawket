use anchor_lang::{Discriminator, Space};
use pawket::{Closet, PawketError, ROOM_PRICE_LAMPORTS, TREASURY, WEARABLE_COUNT, WEARABLE_PRICE_LAMPORTS};
use solana_signer::Signer;

use crate::harness::*;

/// The first piece the Market sells: the slot after the free eighteen.
const HALO: u8 = WEARABLE_COUNT + 1;
const LAST_PIECE: u8 = WEARABLE_COUNT + 4;
const FIRST_ROOM: u8 = 64;

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
    // The owner paid the price and nothing else: the fee and the closet's rent were the sponsor's.
    assert_eq!(owner_before - env.lamports(&owner.pubkey()), WEARABLE_PRICE_LAMPORTS);
    let closet = env.closet(&owner.pubkey());
    assert_eq!(closet.owner, owner.pubkey());
    assert!(closet.has(HALO));
    assert!(!closet.has(HALO + 1));
    assert_eq!((closet.count, closet.spent), (1, WEARABLE_PRICE_LAMPORTS));

    // Bought, it is worn with `dress_owned`; the old `dress` still knows only the eighteen.
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
    for item in [0, 1, WEARABLE_COUNT, LAST_PIECE + 1, FIRST_ROOM - 1, FIRST_ROOM + 2, 255] {
        expect_pawket(&env.send(&[buy_ix(&owner.pubkey(), &owner.pubkey(), item)], &owner, &[]), PawketError::UnknownItem);
    }
    assert_eq!(env.closet(&owner.pubkey()).spent, spent);
    // Every id there is: the four pieces and two rooms have their prices, and nothing else has one.
    for item in 0..=u8::MAX {
        let expected = match item {
            HALO..=LAST_PIECE => Some(WEARABLE_PRICE_LAMPORTS),
            FIRST_ROOM..=65 => Some(ROOM_PRICE_LAMPORTS),
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
    // At the owner's closet address, a closet that names someone else. Only `buy` writes a closet
    // on a cluster, always with its signer, so this is `init_if_needed`'s second path, held anyway.
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
    // The free eighteen, and nothing at all, go on through `dress_owned` too.
    ok(env.send(&[dress_owned_ix(&owner.pubkey(), &pet, 3)], &owner, &[]));
    ok(env.send(&[dress_owned_ix(&owner.pubkey(), &pet, 0)], &owner, &[]));
    assert_eq!(env.pet(&pet).wearing, 0);

    // Another owner's closet does not dress this pet.
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
