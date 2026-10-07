use anchor_lang::Space;
use pawket::{Guestbook, PawketError, RECENT_WAVES};
use solana_signer::Signer;

use crate::harness::*;

#[test]
fn anyone_but_the_owner_waves_once_a_day_and_the_guestbook_keeps_the_last_eight() {
    let mut env = Env::new();
    let sponsor = env.player();
    let owner = env.player();
    let pet = env.adopt(&owner, "Pepper");
    let before = env.pet(&pet);

    let visitor = env.broke();
    ok(env.send(&[wave_ix(&visitor.pubkey(), &sponsor.pubkey(), &pet)], &sponsor, &[&visitor]));
    let book = env.guestbook(&pet);
    assert_eq!((book.pet, book.waves), (pet, 1));
    assert_eq!(book.recent[0].visitor, visitor.pubkey());
    assert_eq!(book.recent[0].at, T0);
    // A wave changes nothing about the pet.
    let after = env.pet(&pet);
    assert_eq!((after.xp, after.happiness, after.stats_updated_at), (before.xp, before.happiness, before.stats_updated_at));

    expect_pawket(
        &env.send(&[wave_ix(&visitor.pubkey(), &sponsor.pubkey(), &pet)], &sponsor, &[&visitor]),
        PawketError::AlreadyWavedToday,
    );
    expect_pawket(
        &env.send(&[wave_ix(&owner.pubkey(), &owner.pubkey(), &pet)], &owner, &[]),
        PawketError::CannotWaveAtOwnPet,
    );
    env.warp(DAY);
    ok(env.send(&[wave_ix(&visitor.pubkey(), &sponsor.pubkey(), &pet)], &sponsor, &[&visitor]));

    for _ in 0..RECENT_WAVES {
        let someone = env.broke();
        ok(env.send(&[wave_ix(&someone.pubkey(), &sponsor.pubkey(), &pet)], &sponsor, &[&someone]));
    }
    let book = env.guestbook(&pet);
    assert_eq!(book.waves, 2 + RECENT_WAVES as u32);
    assert!(book.recent.iter().all(|mark| mark.visitor != visitor.pubkey()), "the oldest wave is overwritten");
    assert_eq!(8 + <Guestbook as Space>::INIT_SPACE, 365);
}

#[test]
fn a_guestbook_that_is_there_already_takes_waves_only_for_the_pet_it_names() {
    let mut env = Env::new();
    let owner = env.player();
    let visitor = env.player();
    let pepper = env.adopt(&owner, "Pepper");
    let nib = env.adopt(&owner, "Nib");
    // At Pepper's guestbook address, a book that names Nib: `init_if_needed`'s second path, held.
    let forged = Guestbook { pet: nib, waves: 0, recent: Default::default(), bump: 0 };
    env.forge(&guestbook_pda(&pepper), &forged);

    let result = env.send(&[wave_ix(&visitor.pubkey(), &visitor.pubkey(), &pepper)], &visitor, &[]);
    expect_anchor(&result, anchor_lang::error::ErrorCode::ConstraintRaw);
    assert_eq!(env.guestbook(&pepper).waves, 0);
}
