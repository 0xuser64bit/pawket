//! `perform_care_action`: the locked deltas, the cooldown, lazy decay, XP, and the Passport.

use anchor_lang::error::ErrorCode;
use pawket::{decayed, utc_day, CareActionType, CareMark, PawketError};
use solana_keypair::Keypair;
use solana_signer::Signer;

use crate::harness::*;

const ACTIONS: [CareActionType; 4] = [
    CareActionType::Feed,
    CareActionType::Play,
    CareActionType::Groom,
    CareActionType::Rest,
];

#[test]
fn each_action_applies_the_locked_deltas() {
    // The same table as `applyCareAction` in src/lib/game/math.test.ts.
    let expected = [
        (CareActionType::Feed, (95, 74, 72, 72)),
        (CareActionType::Play, (66, 95, 60, 72)),
        (CareActionType::Groom, (72, 75, 72, 97)),
        (CareActionType::Rest, (72, 72, 100, 72)),
    ];
    for (action, vitals) in expected {
        let mut env = Env::new();
        let owner = env.player();
        let pet = env.adopt(&owner, "Pepper");
        ok(env.care(&owner, &pet, action));
        let state = env.pet(&pet);
        assert_eq!(
            (state.hunger, state.happiness, state.energy, state.hygiene),
            vitals,
            "{action:?}"
        );
        assert_eq!((state.xp, state.level), (10, 1));
        assert_eq!(state.last_care_at(action), T0);
    }
}

#[test]
fn each_action_rests_for_thirty_minutes_on_its_own_clock() {
    let mut env = Env::new();
    let owner = env.player();
    let pet = env.adopt(&owner, "Pepper");

    ok(env.care(&owner, &pet, CareActionType::Feed));
    // Another action is not held by the first one's cooldown.
    ok(env.care(&owner, &pet, CareActionType::Play));
    env.warp(30 * 60 - 1);
    expect_pawket(&env.care(&owner, &pet, CareActionType::Feed), PawketError::CareCooldownActive);
    env.warp(1);
    ok(env.care(&owner, &pet, CareActionType::Feed));
    expect_pawket(&env.care(&owner, &pet, CareActionType::Feed), PawketError::CareCooldownActive);
}

#[test]
fn only_the_owner_can_care() {
    let mut env = Env::new();
    let owner = env.player();
    let stranger = env.player();
    let pet = env.adopt(&owner, "Pepper");

    let result = env.send(&[care_ix(&stranger.pubkey(), &pet, CareActionType::Feed)], &stranger, &[]);
    expect_pawket(&result, PawketError::NotPetOwner);
}

#[test]
fn a_passport_only_records_its_own_pet() {
    let mut env = Env::new();
    let owner = env.player();
    let pepper = env.adopt(&owner, "Pepper");
    let nib = env.adopt(&owner, "Nib");
    let mut ix = care_ix(&owner.pubkey(), &pepper, CareActionType::Feed);
    ix.accounts[2].pubkey = passport_pda(&nib);

    expect_anchor(&env.send(&[ix], &owner, &[]), ErrorCode::ConstraintSeeds);
}

#[test]
fn a_passport_counts_only_at_its_own_address() {
    let mut env = Env::new();
    let owner = env.player();
    let pet = env.adopt(&owner, "Pepper");
    // The pet's own passport, word for word, kept somewhere else: only its address is wrong.
    let elsewhere = Keypair::new().pubkey();
    let copy = env.passport(&pet);
    env.forge(&elsewhere, &copy);
    let mut ix = care_ix(&owner.pubkey(), &pet, CareActionType::Feed);
    ix.accounts[2].pubkey = elsewhere;

    expect_anchor(&env.send(&[ix], &owner, &[]), ErrorCode::ConstraintSeeds);
    assert_eq!(env.passport(&pet).care_count, 0);
}

#[test]
fn decay_is_lazy_and_lands_on_the_same_integers_as_the_web_app() {
    let mut env = Env::new();
    let owner = env.player();
    let pet = env.adopt(&owner, "Pepper");

    // Twelve minutes is exactly half a point of hunger: 71.5 rounds up to 72, as Math.round does.
    assert_eq!(decayed(72, 25, 720), 72);
    assert_eq!(decayed(72, 25, 721), 71);
    assert_eq!(decayed(1, 25, 48 * HOUR), 0);
    assert_eq!(decayed(100, 12, 0), 100);
    assert_eq!(decayed(72, 25, -5), 72);

    env.warp(12 * HOUR);
    ok(env.care(&owner, &pet, CareActionType::Rest));
    let state = env.pet(&pet);
    // 12h: hunger −30, happiness −21.6, energy −18, hygiene −14.4; then rest +28 energy.
    assert_eq!(
        (state.hunger, state.happiness, state.energy, state.hygiene),
        (42, 50, 82, 58)
    );
    assert_eq!(state.stats_updated_at, T0 + 12 * HOUR);
}

#[test]
fn time_only_lowers_a_vital_and_no_clock_can_make_decay_fail() {
    // Every value, every rate, and elapsed times from the most negative to the largest: a vital
    // never rises, never leaves 0–100, and only falls as time goes on. A panic here would leave a
    // pet that can never be cared for again.
    let times = [i64::MIN, -1, 0, 1, 719, 720, 721, HOUR, DAY, 300_000, 1_000_000, 1_000_001, i64::MAX];
    for value in 0..=100u8 {
        for rate in pawket::DECAY_TENTHS_PER_HOUR {
            let mut previous = value;
            for elapsed in times {
                let now = decayed(value, rate, elapsed);
                assert!(now <= previous, "{value} at {rate}/h rose after {elapsed}s");
                previous = now;
            }
        }
    }
}

#[test]
fn a_pet_left_alone_for_decades_is_cared_for_like_any_other() {
    let mut env = Env::new();
    let owner = env.player();
    let pet = env.adopt(&owner, "Pepper");
    ok(env.care(&owner, &pet, CareActionType::Feed));
    env.warp(50 * 365 * DAY);
    ok(env.care(&owner, &pet, CareActionType::Feed));
    let state = env.pet(&pet);
    assert_eq!((state.hunger, state.happiness, state.energy, state.hygiene), (23, 2, 0, 0));
    assert_eq!(env.passport(&pet).streak, 1);
}

#[test]
fn xp_rises_ten_per_care_and_the_level_every_hundred() {
    let mut env = Env::new();
    let owner = env.player();
    let pet = env.adopt(&owner, "Pepper");
    for round in 0..3 {
        for action in ACTIONS {
            ok(env.care(&owner, &pet, action));
        }
        env.warp(30 * 60);
        let state = env.pet(&pet);
        assert_eq!(state.xp, 40 * (round + 1));
    }
    assert_eq!(env.pet(&pet).level, 2);
}

#[test]
fn the_passport_keeps_the_last_eight_cares_and_counts_them_all() {
    let mut env = Env::new();
    let owner = env.player();
    let pet = env.adopt(&owner, "Pepper");
    for i in 0..10 {
        ok(env.care(&owner, &pet, ACTIONS[i % 4]));
        env.warp(30 * 60);
    }

    let passport = env.passport(&pet);
    assert_eq!(passport.care_count, 10);
    assert_eq!(passport.event_count, 11);
    // Slots 0 and 1 were overwritten by cares 8 and 9; slot 2 holds the oldest kept, care 2.
    let half_hour = 30 * 60;
    assert_eq!(passport.recent[0], CareMark { action: ACTIONS[0], at: T0 + 8 * half_hour });
    assert_eq!(passport.recent[1], CareMark { action: ACTIONS[1], at: T0 + 9 * half_hour });
    assert_eq!(passport.recent[2], CareMark { action: ACTIONS[2], at: T0 + 2 * half_hour });
    assert_eq!(passport.recent[7], CareMark { action: ACTIONS[3], at: T0 + 7 * half_hour });
}

#[test]
fn the_streak_counts_utc_days_and_remembers_the_best() {
    let mut env = Env::new();
    let owner = env.player();
    let pet = env.adopt(&owner, "Pepper");
    let today = utc_day(T0);

    for day in 0..3 {
        ok(env.care(&owner, &pet, CareActionType::Feed));
        let passport = env.passport(&pet);
        assert_eq!(passport.streak, day + 1);
        assert_eq!(passport.last_active_day, today + u32::from(day));
        env.warp(DAY);
    }
    // A second care on the same day changes nothing.
    env.warp(-DAY);
    ok(env.care(&owner, &pet, CareActionType::Play));
    assert_eq!(env.passport(&pet).streak, 3);

    // Skip a day: the streak starts again, the best stays.
    env.warp(2 * DAY);
    ok(env.care(&owner, &pet, CareActionType::Feed));
    let passport = env.passport(&pet);
    assert_eq!((passport.streak, passport.best_streak), (1, 3));
}

#[test]
fn the_streak_turns_over_at_midnight_utc_not_after_24_hours() {
    let mut env = Env::new();
    let owner = env.player();
    let pet = env.adopt(&owner, "Pepper");
    let midnight = (utc_day(T0) as i64 + 1) * DAY;

    env.set_time(midnight - 1);
    ok(env.care(&owner, &pet, CareActionType::Feed));
    env.set_time(midnight);
    ok(env.care(&owner, &pet, CareActionType::Play));
    assert_eq!(env.passport(&pet).streak, 2);
}
