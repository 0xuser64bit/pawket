use crate::harness::*;
use anchor_lang::{error::ErrorCode, prelude::Pubkey};
use pawket::{CareActionType, PawketError, DEVICE_FLOAT_LAMPORTS, FEE_PER_SIGNATURE, MAX_DEVICE_SECONDS};
use solana_keypair::Keypair;
use solana_signer::Signer;

const SOL: u64 = 1_000_000_000;

struct Setup {
    owner: Keypair,
    sponsor: Keypair,
    device: Keypair,
    pet: anchor_lang::prelude::Pubkey,
}

fn setup(env: &mut Env, deposit: u64, daily: u16) -> Setup {
    let owner = env.player();
    let sponsor = env.player();
    let device = env.broke();
    let pet = env.adopt(&owner, "Pepper");
    let week = env.now() + 7 * DAY;
    ok(env.send(
        &[
            open_wallet_ix(&owner.pubkey(), &sponsor.pubkey()),
            deposit_ix(&owner.pubkey(), deposit),
            link_ix(&owner.pubkey(), &device.pubkey(), week, daily),
        ],
        &sponsor,
        &[&owner, &device],
    ));
    Setup { owner, sponsor, device, pet }
}

#[test]
fn a_deposit_comes_back_only_to_its_owner_and_never_out_of_rent() {
    let mut env = Env::new();
    let owner = env.player();
    let other = env.player();
    ok(env.send(&[open_wallet_ix(&owner.pubkey(), &owner.pubkey())], &owner, &[]));
    ok(env.send(&[deposit_ix(&owner.pubkey(), SOL / 10)], &owner, &[]));
    assert_eq!(env.balance(&owner.pubkey()), SOL / 10);
    assert_eq!(env.wallet(&owner.pubkey()).deposited, SOL / 10);

    let before = env.lamports(&owner.pubkey());
    ok(env.send(&[withdraw_ix(&owner.pubkey(), SOL / 40)], &owner, &[]));
    assert_eq!(env.lamports(&owner.pubkey()), before + SOL / 40 - 5_000);
    assert_eq!(env.balance(&owner.pubkey()), SOL / 10 - SOL / 40);

    let too_much = env.send(&[withdraw_ix(&owner.pubkey(), SOL / 10)], &owner, &[]);
    expect_pawket(&too_much, PawketError::InsufficientBalance);
    expect_pawket(&env.send(&[withdraw_ix(&owner.pubkey(), 0)], &owner, &[]), PawketError::InvalidAmount);
    expect_pawket(&env.send(&[deposit_ix(&owner.pubkey(), 0)], &owner, &[]), PawketError::InvalidAmount);

    let mut theft = withdraw_ix(&owner.pubkey(), SOL / 40);
    theft.accounts[0].pubkey = other.pubkey();
    assert!(env.send(&[theft], &other, &[]).is_err());
    assert_eq!(env.balance(&owner.pubkey()), SOL / 10 - SOL / 40);
}

#[test]
fn a_linked_device_cares_with_no_prompt_and_the_balance_pays_its_fee() {
    let mut env = Env::new();
    let s = setup(&mut env, SOL / 100, 50);
    assert_eq!(env.lamports(&s.device.pubkey()), DEVICE_FLOAT_LAMPORTS);
    let balance = env.balance(&s.owner.pubkey());

    ok(env.send(&[care_by_device_ix(&s.device.pubkey(), &s.owner.pubkey(), &s.pet, CareActionType::Feed)], &s.device, &[]));
    ok(env.send(&[round_by_device_ix(&s.device.pubkey(), &s.owner.pubkey(), &s.pet)], &s.device, &[]));
    ok(env.send(&[dress_by_device_ix(&s.device.pubkey(), &s.owner.pubkey(), &s.pet, 3)], &s.device, &[]));

    let pet = env.pet(&s.pet);
    assert_eq!(pet.xp, 35);
    assert_eq!(pet.wearing, 3);
    assert_eq!(env.passport(&s.pet).care_count, 1);
    assert_eq!(env.lamports(&s.device.pubkey()), DEVICE_FLOAT_LAMPORTS);
    assert_eq!(env.balance(&s.owner.pubkey()), balance - 3 * FEE_PER_SIGNATURE);
    let wallet = env.wallet(&s.owner.pubkey());
    assert_eq!((wallet.actions, wallet.actions_today), (3, 3));
    assert_eq!(wallet.spent, DEVICE_FLOAT_LAMPORTS + 3 * FEE_PER_SIGNATURE);

    let again = env.send(&[care_by_device_ix(&s.device.pubkey(), &s.owner.pubkey(), &s.pet, CareActionType::Feed)], &s.device, &[]);
    expect_pawket(&again, PawketError::CareCooldownActive);
}

#[test]
fn a_device_cares_for_its_owners_pets_and_no_one_elses() {
    let mut env = Env::new();
    let s = setup(&mut env, SOL / 100, 50);
    let stranger = env.player();
    let theirs = env.adopt(&stranger, "Mochi");
    let attempt = env.send(&[care_by_device_ix(&s.device.pubkey(), &s.owner.pubkey(), &theirs, CareActionType::Play)], &s.device, &[]);
    expect_pawket(&attempt, PawketError::NotPetOwner);

    let impostor = env.player();
    let attempt = env.send(&[care_by_device_ix(&impostor.pubkey(), &s.owner.pubkey(), &s.pet, CareActionType::Play)], &impostor, &[]);
    expect_pawket(&attempt, PawketError::NotThisDevice);
}

#[test]
fn a_device_keeps_to_its_daily_limit_and_its_end_date() {
    let mut env = Env::new();
    let s = setup(&mut env, SOL / 100, 2);
    let act = |env: &mut Env, action| env.send(&[care_by_device_ix(&s.device.pubkey(), &s.owner.pubkey(), &s.pet, action)], &s.device, &[]);
    ok(act(&mut env, CareActionType::Feed));
    ok(act(&mut env, CareActionType::Play));
    expect_pawket(&act(&mut env, CareActionType::Groom), PawketError::DailyLimitReached);

    env.warp(DAY);
    ok(act(&mut env, CareActionType::Groom));

    env.warp(7 * DAY);
    expect_pawket(&act(&mut env, CareActionType::Rest), PawketError::DeviceExpired);
}

#[test]
fn a_link_is_signed_by_the_device_and_kept_within_bounds() {
    let mut env = Env::new();
    let owner = env.player();
    let device = env.broke();
    ok(env.send(&[open_wallet_ix(&owner.pubkey(), &owner.pubkey()), deposit_ix(&owner.pubkey(), SOL / 100)], &owner, &[]));
    let now = env.now();

    let mut unsigned = link_ix(&owner.pubkey(), &device.pubkey(), now + DAY, 10);
    unsigned.accounts[2].is_signer = false;
    assert!(env.send(&[unsigned], &owner, &[]).is_err());

    for (expires_at, daily) in [(now, 10), (now + MAX_DEVICE_SECONDS + 1, 10), (now + DAY, 0), (now + DAY, 501)] {
        let bad = env.send(&[link_ix(&owner.pubkey(), &device.pubkey(), expires_at, daily)], &owner, &[&device]);
        expect_pawket(&bad, PawketError::InvalidDeviceLink);
    }
    let bad = env.send(&[link_ix(&owner.pubkey(), &owner.pubkey(), now + DAY, 10)], &owner, &[]);
    expect_pawket(&bad, PawketError::InvalidDeviceLink);

    let poor = env.player();
    let poor_device = env.broke();
    ok(env.send(&[open_wallet_ix(&poor.pubkey(), &poor.pubkey()), deposit_ix(&poor.pubkey(), DEVICE_FLOAT_LAMPORTS - 1)], &poor, &[]));
    ok(env.send(&[link_ix(&poor.pubkey(), &poor_device.pubkey(), now + DAY, 10)], &poor, &[&poor_device]));
    assert_eq!(env.lamports(&poor_device.pubkey()), 0);
    assert_eq!(env.balance(&poor.pubkey()), DEVICE_FLOAT_LAMPORTS - 1);

    ok(env.send(&[link_ix(&owner.pubkey(), &device.pubkey(), now + MAX_DEVICE_SECONDS, 500)], &owner, &[&device]));
    assert_eq!(env.wallet(&owner.pubkey()).device, device.pubkey());
}

#[test]
fn unlinking_stops_the_device_and_a_device_that_signs_gives_its_float_back() {
    let mut env = Env::new();
    let s = setup(&mut env, SOL / 100, 50);
    let balance = env.balance(&s.owner.pubkey());

    ok(env.send(&[unlink_ix(&s.device.pubkey(), &s.owner.pubkey(), &s.device.pubkey(), true)], &s.sponsor, &[&s.device]));
    assert_eq!(env.lamports(&s.device.pubkey()), 0);
    assert_eq!(env.balance(&s.owner.pubkey()), balance + DEVICE_FLOAT_LAMPORTS);
    let wallet = env.wallet(&s.owner.pubkey());
    assert_eq!(wallet.device, anchor_lang::prelude::Pubkey::default());
    assert_eq!(wallet.spent, 0);

    let attempt = env.send(&[care_by_device_ix(&s.device.pubkey(), &s.owner.pubkey(), &s.pet, CareActionType::Feed)], &s.sponsor, &[&s.device]);
    expect_pawket(&attempt, PawketError::NotThisDevice);
    let twice = env.send(&[unlink_ix(&s.owner.pubkey(), &s.owner.pubkey(), &s.device.pubkey(), false)], &s.owner, &[]);
    expect_pawket(&twice, PawketError::NoDeviceLinked);
}

#[test]
fn the_owner_unlinks_a_lost_device_without_it() {
    let mut env = Env::new();
    let s = setup(&mut env, SOL / 100, 50);
    let stranger = env.player();
    let attempt = env.send(&[unlink_ix(&stranger.pubkey(), &s.owner.pubkey(), &s.device.pubkey(), false)], &stranger, &[]);
    expect_pawket(&attempt, PawketError::NotThisDevice);

    ok(env.send(&[unlink_ix(&s.owner.pubkey(), &s.owner.pubkey(), &s.device.pubkey(), false)], &s.owner, &[]));
    assert_eq!(env.wallet(&s.owner.pubkey()).device, anchor_lang::prelude::Pubkey::default());
    assert_eq!(env.lamports(&s.device.pubkey()), DEVICE_FLOAT_LAMPORTS);
    let attempt = env.send(&[dress_by_device_ix(&s.device.pubkey(), &s.owner.pubkey(), &s.pet, 1)], &s.device, &[]);
    expect_pawket(&attempt, PawketError::NotThisDevice);
}

#[test]
fn closing_hands_the_balance_to_the_owner_and_the_rent_to_whoever_paid_it() {
    let mut env = Env::new();
    let s = setup(&mut env, SOL / 100, 50);
    let wallet_address = wallet_pda(&s.owner.pubkey());
    let rent = env.lamports(&wallet_address) - env.balance(&s.owner.pubkey());

    let early = env.send(&[close_wallet_ix(&s.owner.pubkey(), &s.sponsor.pubkey())], &s.owner, &[]);
    expect_pawket(&early, PawketError::DeviceStillLinked);

    ok(env.send(&[unlink_ix(&s.owner.pubkey(), &s.owner.pubkey(), &s.device.pubkey(), true)], &s.owner, &[&s.device]));
    let balance = env.balance(&s.owner.pubkey());
    let owner_before = env.lamports(&s.owner.pubkey());
    let sponsor_before = env.lamports(&s.sponsor.pubkey());
    ok(env.send(&[close_wallet_ix(&s.owner.pubkey(), &s.sponsor.pubkey())], &s.sponsor, &[&s.owner]));
    assert!(!env.exists(&wallet_address));
    assert_eq!(env.lamports(&s.owner.pubkey()), owner_before + balance);
    assert_eq!(env.lamports(&s.sponsor.pubkey()), sponsor_before + rent - 10_000);
}

#[test]
fn only_the_owner_closes_a_wallet_and_its_rent_goes_only_to_whoever_paid_it() {
    let mut env = Env::new();
    let s = setup(&mut env, SOL / 100, 50);
    ok(env.send(&[unlink_ix(&s.owner.pubkey(), &s.owner.pubkey(), &s.device.pubkey(), true)], &s.owner, &[&s.device]));
    let wallet = wallet_pda(&s.owner.pubkey());
    let held = env.lamports(&wallet);
    let thief = env.player();

    let elsewhere = env.send(&[close_wallet_ix(&s.owner.pubkey(), &thief.pubkey())], &s.owner, &[]);
    expect_anchor(&elsewhere, ErrorCode::ConstraintHasOne);
    let mut stranger = close_wallet_ix(&thief.pubkey(), &s.sponsor.pubkey());
    stranger.accounts[1].pubkey = wallet;
    expect_anchor(&env.send(&[stranger], &thief, &[]), ErrorCode::ConstraintSeeds);
    assert_eq!(env.lamports(&wallet), held);
}

#[test]
fn nobody_opens_or_pays_into_a_wallet_in_someone_elses_name() {
    let mut env = Env::new();
    let (owner, stranger) = (env.player(), env.player());
    let wallet = wallet_pda(&owner.pubkey());
    let mut early = open_wallet_ix(&stranger.pubkey(), &stranger.pubkey());
    early.accounts[2].pubkey = wallet;
    expect_anchor(&env.send(&[early], &stranger, &[]), ErrorCode::ConstraintSeeds);
    assert!(!env.exists(&wallet));
    ok(env.send(&[open_wallet_ix(&owner.pubkey(), &owner.pubkey())], &owner, &[]));
    let mut deposit = deposit_ix(&stranger.pubkey(), SOL / 100);
    deposit.accounts[1].pubkey = wallet;
    expect_anchor(&env.send(&[deposit], &stranger, &[]), ErrorCode::ConstraintSeeds);
    assert_eq!(env.wallet(&owner.pubkey()).deposited, 0);
}

#[test]
fn nobody_but_its_owner_links_a_device_to_a_wallet() {
    let mut env = Env::new();
    let owner = env.player();
    let stranger = env.player();
    let device = env.broke();
    ok(env.send(&[open_wallet_ix(&owner.pubkey(), &owner.pubkey()), deposit_ix(&owner.pubkey(), SOL / 100)], &owner, &[]));

    let mut hijack = link_ix(&stranger.pubkey(), &device.pubkey(), env.now() + DAY, 500);
    hijack.accounts[1].pubkey = wallet_pda(&owner.pubkey());
    expect_anchor(&env.send(&[hijack], &stranger, &[&device]), ErrorCode::ConstraintSeeds);
    assert_eq!(env.wallet(&owner.pubkey()).device, Pubkey::default());
    assert_eq!(env.balance(&owner.pubkey()), SOL / 100);
    assert_eq!(env.lamports(&device.pubkey()), 0);
}

#[test]
fn a_replaced_device_can_neither_act_nor_unlink_its_replacement() {
    let mut env = Env::new();
    let s = setup(&mut env, SOL / 100, 50);
    let newer = env.broke();
    let week = env.now() + 7 * DAY;
    ok(env.send(&[link_ix(&s.owner.pubkey(), &newer.pubkey(), week, 50)], &s.owner, &[&newer]));

    let (old, owner) = (s.device.pubkey(), s.owner.pubkey());
    let balance = env.balance(&owner);
    let care = care_by_device_ix(&old, &owner, &s.pet, CareActionType::Feed);
    expect_pawket(&env.send(&[care], &s.device, &[]), PawketError::NotThisDevice);
    let unlink = unlink_ix(&old, &owner, &newer.pubkey(), false);
    expect_pawket(&env.send(&[unlink], &s.device, &[]), PawketError::NotThisDevice);
    assert_eq!(env.wallet(&owner).device, newer.pubkey());
    assert_eq!(env.lamports(&old), DEVICE_FLOAT_LAMPORTS - 2 * FEE_PER_SIGNATURE);
    assert_eq!(env.balance(&owner), balance);
}

#[test]
fn a_leaked_device_draws_one_fee_an_action_from_the_balance_whatever_it_does_with_its_float() {
    let mut env = Env::new();
    let s = setup(&mut env, SOL / 100, 50);
    let (device, owner, thief) = (s.device.pubkey(), s.owner.pubkey(), env.player().pubkey());
    let balance = env.balance(&owner);
    let spent = env.wallet(&owner).spent;

    let ixs = [
        transfer_ix(&device, &thief, 100_000),
        care_by_device_ix(&device, &owner, &s.pet, CareActionType::Feed),
        transfer_ix(&device, &thief, FEE_PER_SIGNATURE),
        dress_by_device_ix(&device, &owner, &s.pet, 2),
        transfer_ix(&device, &thief, FEE_PER_SIGNATURE),
        round_by_device_ix(&device, &owner, &s.pet),
    ];
    ok(env.send(&ixs, &s.device, &[]));
    assert_eq!(env.balance(&owner), balance - 3 * FEE_PER_SIGNATURE);
    assert_eq!(env.wallet(&owner).spent, spent + 3 * FEE_PER_SIGNATURE);
    assert_eq!(env.wallet(&owner).actions_today, 3);
}

#[test]
fn a_device_with_nothing_left_in_the_wallet_still_acts_until_its_float_runs_out() {
    let mut env = Env::new();
    let s = setup(&mut env, DEVICE_FLOAT_LAMPORTS, 50);
    assert_eq!(env.balance(&s.owner.pubkey()), 0);
    ok(env.send(&[care_by_device_ix(&s.device.pubkey(), &s.owner.pubkey(), &s.pet, CareActionType::Feed)], &s.device, &[]));
    assert_eq!(env.lamports(&s.device.pubkey()), DEVICE_FLOAT_LAMPORTS - FEE_PER_SIGNATURE);
    ok(env.send(&[deposit_ix(&s.owner.pubkey(), SOL / 100)], &s.owner, &[]));
    ok(env.send(&[care_by_device_ix(&s.device.pubkey(), &s.owner.pubkey(), &s.pet, CareActionType::Play)], &s.device, &[]));
    assert_eq!(env.lamports(&s.device.pubkey()), DEVICE_FLOAT_LAMPORTS - FEE_PER_SIGNATURE);
    assert_eq!(env.balance(&s.owner.pubkey()), SOL / 100 - FEE_PER_SIGNATURE);
}

#[test]
fn the_wallet_layout_is_the_contract_the_web_app_decodes() {
    use anchor_lang::{Discriminator, Space};
    let mut env = Env::new();
    let s = setup(&mut env, SOL / 100, 40);
    assert_eq!(8 + pawket::PawketWallet::INIT_SPACE, 157);
    assert_eq!(pawket::PawketWallet::DISCRIMINATOR.len(), 8);
    let data = env.svm.get_account(&wallet_pda(&s.owner.pubkey())).unwrap().data;
    assert_eq!(data.len(), 157);
    assert_eq!(&data[8..40], s.owner.pubkey().as_ref());
    assert_eq!(&data[40..72], s.device.pubkey().as_ref());
    assert_eq!(&data[72..80], &(env.now() + 7 * DAY).to_le_bytes());
    assert_eq!(&data[80..82], &40u16.to_le_bytes());
    assert_eq!(&data[92..100], &(SOL / 100).to_le_bytes());
    assert_eq!(&data[108..116], &DEVICE_FLOAT_LAMPORTS.to_le_bytes());
    assert_eq!(&data[116..148], s.sponsor.pubkey().as_ref());
    assert_eq!(&data[148..156], &env.now().to_le_bytes());
}

#[test]
fn a_device_can_pay_for_its_own_unlinking_and_leave_nothing_behind() {
    let mut env = Env::new();
    let s = setup(&mut env, SOL / 100, 50);
    let balance = env.balance(&s.owner.pubkey());
    ok(env.send(&[unlink_ix(&s.device.pubkey(), &s.owner.pubkey(), &s.device.pubkey(), true)], &s.device, &[]));
    assert!(!env.exists(&s.device.pubkey()));
    assert_eq!(env.balance(&s.owner.pubkey()), balance + DEVICE_FLOAT_LAMPORTS - FEE_PER_SIGNATURE);
}
