use anchor_lang::{Discriminator, Space};
use pawket::{Guild, GuildMember, PawketError, MAX_MOTTO_LEN};
use solana_signer::Signer;

use crate::harness::*;

#[test]
fn a_pet_founds_a_guild_and_is_its_first_member_while_a_sponsor_pays() {
    let mut env = Env::new();
    let sponsor = env.player();
    let owner = env.broke();
    ok(env.send(&[adopt_ix(&owner.pubkey(), &sponsor.pubkey(), "Pepper")], &sponsor, &[&owner]));
    let pet = pet_pda(&owner.pubkey(), "Pepper");

    ok(env.send(&[found_ix(&owner.pubkey(), &sponsor.pubkey(), &pet, "sunbeam-club")], &sponsor, &[&owner]));

    let guild = env.guild("sunbeam-club");
    assert_eq!(guild.founder, owner.pubkey());
    assert_eq!(guild.founder_pet, pet);
    assert_eq!(guild.member_count, 1);
    assert_eq!(guild.name, "Sunbeam Club");
    assert_eq!(guild.motto, "Naps first, questions later.");
    assert_eq!(guild.created_at, T0);
    let member = env.member(&pet);
    assert_eq!(member.guild, guild_pda("sunbeam-club"));
    assert_eq!(member.owner, owner.pubkey());
    assert_eq!(member.payer, sponsor.pubkey());
    assert_eq!(env.lamports(&owner.pubkey()), 0);
}

#[test]
fn a_slug_is_one_guild() {
    let mut env = Env::new();
    let first = env.player();
    let second = env.player();
    let a = env.adopt(&first, "Pepper");
    let b = env.adopt(&second, "Miso");
    ok(env.send(&[found_ix(&first.pubkey(), &first.pubkey(), &a, "sunbeam-club")], &first, &[]));

    let again = env.send(&[found_ix(&second.pubkey(), &second.pubkey(), &b, "sunbeam-club")], &second, &[]);
    assert!(again.is_err(), "a slug that is taken is taken");
    assert_eq!(env.guild("sunbeam-club").founder, first.pubkey());
}

#[test]
fn slugs_names_mottos_and_crests_are_held_to_their_rules() {
    let mut env = Env::new();
    let owner = env.player();
    let id = owner.pubkey();
    let pet = env.adopt(&owner, "Pepper");
    let found = |slug: &str, name: &str, motto: &str, crest: u8, colour: u8| found_ix_with(&id, &id, &pet, slug, name, motto, crest, colour);

    for slug in ["ab", "Sunbeam", "-sunbeam", "sunbeam-", "sun beam", "sunbeam_club", "abcdefghijklmnopqrstuvwxy"] {
        expect_pawket(&env.send(&[found(slug, "Sunbeam", "", 0, 0)], &owner, &[]), PawketError::InvalidGuildSlug);
    }
    expect_pawket(&env.send(&[found("sunbeam", "Su", "", 0, 0)], &owner, &[]), PawketError::InvalidGuildName);
    expect_pawket(
        &env.send(&[found("sunbeam", &"a".repeat(33), "", 0, 0)], &owner, &[]),
        PawketError::InvalidGuildName,
    );
    expect_pawket(
        &env.send(&[found("sunbeam", "Sunbeam", &"a".repeat(MAX_MOTTO_LEN + 1), 0, 0)], &owner, &[]),
        PawketError::InvalidGuildMotto,
    );
    expect_pawket(&env.send(&[found("sunbeam", "Sunbeam", "", 8, 0)], &owner, &[]), PawketError::UnknownCrest);
    expect_pawket(&env.send(&[found("sunbeam", "Sunbeam", "", 0, 6)], &owner, &[]), PawketError::UnknownCrest);

    // At the limits, with a name in another script: it is bytes that count.
    ok(env.send(&[found("abc", "ねこ会", &"a".repeat(MAX_MOTTO_LEN), 7, 5)], &owner, &[]));
    assert_eq!(env.guild("abc").name, "ねこ会");
}

#[test]
fn a_pet_is_in_one_guild_at_a_time_and_leaving_gives_the_rent_back() {
    let mut env = Env::new();
    let founder = env.player();
    let sponsor = env.player();
    let owner = env.broke();
    let first = env.adopt(&founder, "Pepper");
    let second = env.adopt(&founder, "Miso");
    ok(env.send(&[found_ix(&founder.pubkey(), &founder.pubkey(), &first, "sunbeam-club")], &founder, &[]));
    ok(env.send(&[found_ix(&founder.pubkey(), &founder.pubkey(), &second, "cloud-nine")], &founder, &[]));
    ok(env.send(&[adopt_ix(&owner.pubkey(), &sponsor.pubkey(), "Biscuit")], &sponsor, &[&owner]));
    let pet = pet_pda(&owner.pubkey(), "Biscuit");
    let sunbeam = guild_pda("sunbeam-club");
    let cloud = guild_pda("cloud-nine");

    ok(env.send(&[join_ix(&owner.pubkey(), &sponsor.pubkey(), &pet, &sunbeam)], &sponsor, &[&owner]));
    assert_eq!(env.guild("sunbeam-club").member_count, 2);
    let twice = env.send(&[join_ix(&owner.pubkey(), &sponsor.pubkey(), &pet, &cloud)], &sponsor, &[&owner]);
    assert!(twice.is_err(), "one guild at a time");
    assert_eq!(env.guild("cloud-nine").member_count, 1);

    let rent = env.lamports(&member_pda(&pet));
    let before = env.lamports(&sponsor.pubkey());
    ok(env.send(&[leave_ix(&owner.pubkey(), &pet, &sunbeam, &sponsor.pubkey())], &sponsor, &[&owner]));
    assert_eq!(env.guild("sunbeam-club").member_count, 1);
    assert!(!env.exists(&member_pda(&pet)));
    // Two signatures at 5,000 lamports each: the sponsor pays the fee and has the rent back.
    assert_eq!(env.lamports(&sponsor.pubkey()), before + rent - 10_000);

    ok(env.send(&[join_ix(&owner.pubkey(), &sponsor.pubkey(), &pet, &cloud)], &sponsor, &[&owner]));
    assert_eq!(env.guild("cloud-nine").member_count, 2);
}

#[test]
fn only_the_owner_founds_joins_or_leaves_for_a_pet() {
    let mut env = Env::new();
    let owner = env.player();
    let stranger = env.player();
    let pet = env.adopt(&owner, "Pepper");
    let other = env.adopt(&owner, "Miso");
    let s = stranger.pubkey();

    let result = env.send(&[found_ix(&s, &s, &pet, "sunbeam-club")], &stranger, &[]);
    expect_pawket(&result, PawketError::NotPetOwner);
    ok(env.send(&[found_ix(&owner.pubkey(), &owner.pubkey(), &other, "sunbeam-club")], &owner, &[]));
    let sunbeam = guild_pda("sunbeam-club");
    let result = env.send(&[join_ix(&s, &s, &pet, &sunbeam)], &stranger, &[]);
    expect_pawket(&result, PawketError::NotPetOwner);
    let result = env.send(&[leave_ix(&s, &other, &sunbeam, &owner.pubkey())], &stranger, &[]);
    expect_pawket(&result, PawketError::NotPetOwner);
}

#[test]
fn the_rent_goes_back_only_to_whoever_paid_it() {
    let mut env = Env::new();
    let owner = env.player();
    let thief = env.player();
    let pet = env.adopt(&owner, "Pepper");
    ok(env.send(&[found_ix(&owner.pubkey(), &owner.pubkey(), &pet, "sunbeam-club")], &owner, &[]));

    let result = env.send(&[leave_ix(&owner.pubkey(), &pet, &guild_pda("sunbeam-club"), &thief.pubkey())], &owner, &[]);
    expect_anchor(&result, anchor_lang::error::ErrorCode::ConstraintHasOne);
    assert!(env.exists(&member_pda(&pet)));
}

#[test]
fn guild_layouts_are_the_contract_the_web_app_decodes() {
    let mut env = Env::new();
    let owner = env.player();
    let pet = env.adopt(&owner, "Pepper");
    ok(env.send(&[found_ix(&owner.pubkey(), &owner.pubkey(), &pet, "sunbeam-club")], &owner, &[]));

    assert_eq!(8 + Guild::INIT_SPACE, 235);
    assert_eq!(8 + GuildMember::INIT_SPACE, 145);
    assert_eq!(env.svm.get_account(&guild_pda("sunbeam-club")).unwrap().data.len(), 235);
    assert_eq!(env.svm.get_account(&member_pda(&pet)).unwrap().data.len(), 145);
    assert_eq!(Guild::DISCRIMINATOR.len(), 8);

    let guild = env.svm.get_account(&guild_pda("sunbeam-club")).unwrap().data;
    assert_eq!(&guild[8..40], owner.pubkey().as_ref());
    assert_eq!(&guild[40..72], pet.as_ref());
    assert_eq!(&guild[80..84], &1u32.to_le_bytes());
    assert_eq!(&guild[87..91], &12u32.to_le_bytes());
    assert_eq!(&guild[91..103], b"sunbeam-club");

    let member = env.svm.get_account(&member_pda(&pet)).unwrap().data;
    assert_eq!(&member[8..40], pet.as_ref());
    assert_eq!(&member[40..72], guild_pda("sunbeam-club").as_ref());
}
