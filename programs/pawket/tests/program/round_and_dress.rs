use pawket::{utc_day, PawketError, WEARABLE_COUNT};
use solana_signer::Signer;

use crate::harness::*;

#[test]
fn the_first_round_of_a_utc_day_adds_25_xp_and_every_round_counts() {
    let mut env = Env::new();
    let owner = env.player();
    let pet = env.adopt(&owner, "Pepper");

    ok(env.round(&owner, &pet));
    ok(env.round(&owner, &pet));
    let passport = env.passport(&pet);
    assert_eq!(env.pet(&pet).xp, 25);
    assert_eq!(passport.plays, 2);
    assert_eq!(passport.last_play_day, utc_day(T0));
    assert_eq!(passport.event_count, 3);

    env.warp(DAY);
    ok(env.round(&owner, &pet));
    assert_eq!(env.pet(&pet).xp, 50);
    assert_eq!(env.passport(&pet).plays, 3);
}

#[test]
fn a_round_is_showing_up_and_leaves_the_vitals_alone() {
    let mut env = Env::new();
    let owner = env.player();
    let pet = env.adopt(&owner, "Pepper");
    env.warp(5 * HOUR);
    let before = env.pet(&pet);

    ok(env.round(&owner, &pet));
    let after = env.pet(&pet);
    assert_eq!(
        (after.hunger, after.happiness, after.energy, after.hygiene, after.stats_updated_at),
        (before.hunger, before.happiness, before.energy, before.hygiene, before.stats_updated_at)
    );
    assert_eq!(env.passport(&pet).streak, 1);
}

#[test]
fn only_the_owner_finishes_a_round() {
    let mut env = Env::new();
    let owner = env.player();
    let stranger = env.player();
    let pet = env.adopt(&owner, "Pepper");

    let result = env.send(&[round_ix(&stranger.pubkey(), &pet)], &stranger, &[]);
    expect_pawket(&result, PawketError::NotPetOwner);
}

#[test]
fn dress_puts_on_and_takes_off_and_changes_nothing_else() {
    let mut env = Env::new();
    let owner = env.player();
    let pet = env.adopt(&owner, "Pepper");
    let before = env.pet(&pet);

    ok(env.dress(&owner, &pet, 3));
    let dressed = env.pet(&pet);
    assert_eq!(dressed.wearing, 3);
    assert_eq!(
        (dressed.xp, dressed.hunger, dressed.happiness, dressed.energy, dressed.hygiene),
        (before.xp, before.hunger, before.happiness, before.energy, before.hygiene)
    );
    assert_eq!(env.passport(&pet).event_count, 1);

    ok(env.dress(&owner, &pet, WEARABLE_COUNT));
    ok(env.dress(&owner, &pet, 0));
    assert_eq!(env.pet(&pet).wearing, 0);
}

#[test]
fn dress_refuses_what_the_wardrobe_does_not_have_and_strangers() {
    let mut env = Env::new();
    let owner = env.player();
    let stranger = env.player();
    let pet = env.adopt(&owner, "Pepper");

    expect_pawket(&env.dress(&owner, &pet, WEARABLE_COUNT + 1), PawketError::UnknownWearable);
    let result = env.send(&[dress_ix(&stranger.pubkey(), &pet, 1)], &stranger, &[]);
    expect_pawket(&result, PawketError::NotPetOwner);
}
