use anchor_lang::{
    error::ErrorCode,
    prelude::Pubkey,
    solana_program::system_program,
    Discriminator,
};
use pawket::{CareMark, PawketError, Pet, PetPassport, PetPersonality, PetSpecies};
use solana_signer::Signer;

use crate::harness::*;

#[test]
fn a_new_pet_starts_at_72_with_an_empty_passport() {
    let mut env = Env::new();
    let owner = env.player();
    let name = "Pepper";
    ok(env.send(
        &[adopt_ix_with(
            &owner.pubkey(),
            &owner.pubkey(),
            name,
            PetSpecies::LunaCat,
            PetPersonality::Mischief,
        )],
        &owner,
        &[],
    ));
    let address = pet_pda(&owner.pubkey(), name);

    let pet = env.pet(&address);
    assert_eq!(pet.owner, owner.pubkey());
    assert_eq!(pet.name, name);
    assert_eq!(pet.species, PetSpecies::LunaCat);
    assert_eq!(pet.personality, PetPersonality::Mischief);
    assert_eq!(pet.birth_timestamp, T0);
    assert_eq!(pet.stats_updated_at, T0);
    assert_eq!((pet.level, pet.xp), (1, 0));
    assert_eq!(
        (pet.hunger, pet.happiness, pet.energy, pet.hygiene),
        (72, 72, 72, 72)
    );
    assert_eq!(
        (pet.last_feed_at, pet.last_play_at, pet.last_groom_at, pet.last_rest_at),
        (0, 0, 0, 0)
    );
    assert_eq!(pet.wearing, 0);
    assert_eq!(
        pet.bump,
        Pubkey::find_program_address(&[b"pet", owner.pubkey().as_ref(), name.as_bytes()], &pawket::ID).1
    );

    let passport = env.passport(&address);
    assert_eq!(passport.pet, address);
    assert_eq!(passport.owner, owner.pubkey());
    assert_eq!(passport.event_count, 1);
    assert_eq!((passport.care_count, passport.plays), (0, 0));
    assert_eq!((passport.streak, passport.best_streak), (0, 0));
    assert_eq!((passport.last_active_day, passport.last_play_day), (0, 0));
    assert_eq!(passport.recent, [CareMark::default(); 8]);
}

#[test]
fn account_layouts_are_the_contract_the_web_app_decodes() {
    let mut env = Env::new();
    let owner = env.player();
    let address = env.adopt(&owner, "Nib");

    assert_eq!(8 + <Pet as anchor_lang::Space>::INIT_SPACE, 130);
    assert_eq!(8 + <PetPassport as anchor_lang::Space>::INIT_SPACE, 169);
    assert_eq!(env.svm.get_account(&address).unwrap().data.len(), 130);
    assert_eq!(env.svm.get_account(&passport_pda(&address)).unwrap().data.len(), 169);
    assert_eq!(Pet::DISCRIMINATOR, [180, 195, 178, 241, 61, 123, 238, 32]);
    assert_eq!(PetPassport::DISCRIMINATOR, [197, 235, 164, 111, 43, 33, 153, 145]);

    let data = env.svm.get_account(&address).unwrap().data;
    assert_eq!(&data[8..40], owner.pubkey().as_ref());
    assert_eq!(&data[56..60], &[72, 72, 72, 72]);
    assert_eq!(&data[102..106], &3u32.to_le_bytes());
    assert_eq!(&data[106..109], b"Nib");
}

#[test]
fn a_sponsor_pays_the_rent_and_the_owner_pays_nothing() {
    let mut env = Env::new();
    let sponsor = env.player();
    let owner = env.broke();
    let before = env.lamports(&sponsor.pubkey());

    ok(env.send(
        &[adopt_ix(&owner.pubkey(), &sponsor.pubkey(), "Tuesday")],
        &sponsor,
        &[&owner],
    ));

    let address = pet_pda(&owner.pubkey(), "Tuesday");
    assert_eq!(env.pet(&address).owner, owner.pubkey());
    assert_eq!(env.lamports(&owner.pubkey()), 0);
    let rent = env.lamports(&address) + env.lamports(&passport_pda(&address));
    assert!(before - env.lamports(&sponsor.pubkey()) > rent);
}

#[test]
fn the_owner_must_sign_even_when_a_sponsor_pays() {
    let mut env = Env::new();
    let sponsor = env.player();
    let owner = env.broke();
    let mut ix = adopt_ix(&owner.pubkey(), &sponsor.pubkey(), "Marmalade");
    ix.accounts[0].is_signer = false;

    let result = env.send(&[ix], &sponsor, &[]);
    expect_anchor(&result, ErrorCode::AccountNotSigner);
}

#[test]
fn names_are_two_to_twenty_four_utf8_bytes() {
    let mut env = Env::new();
    let owner = env.player();
    let id = owner.pubkey();

    expect_pawket(&env.send(&[adopt_ix(&id, &id, "P")], &owner, &[]), PawketError::InvalidPetName);
    expect_pawket(
        &env.send(&[adopt_ix(&id, &id, "abcdefghijklmnopqrstuvwxy")], &owner, &[]),
        PawketError::InvalidPetName,
    );
    ok(env.send(&[adopt_ix(&id, &id, "ねこねこねこねこ")], &owner, &[]));
    ok(env.send(&[adopt_ix(&id, &id, "Bo")], &owner, &[]));
    ok(env.send(&[adopt_ix(&id, &id, "abcdefghijklmnopqrstuvwx")], &owner, &[]));
}

#[test]
fn a_name_is_one_pet_per_owner_and_free_for_everyone_else() {
    let mut env = Env::new();
    let first = env.player();
    let second = env.player();
    env.adopt(&first, "Pepper");

    let again = env.send(&[adopt_ix(&first.pubkey(), &first.pubkey(), "Pepper")], &first, &[]);
    assert!(again.is_err(), "the same owner and name is the same pet");
    env.adopt(&second, "Pepper");
    assert_ne!(pet_pda(&first.pubkey(), "Pepper"), pet_pda(&second.pubkey(), "Pepper"));
    assert_eq!(system_program::ID, anchor_lang::system_program::ID);
}
