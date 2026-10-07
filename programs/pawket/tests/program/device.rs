//! A linked device does for its owner's pets everything the owner signs for — adopting, founding,
//! joining and leaving, planning, going, checking in, asking, voting, waving — with the sponsor
//! paying the fee and the rent exactly as it does for the owner, and the owner signing nothing.
//! It never acts for anyone else's pet, past its limit, or with money.

use anchor_lang::{error::ErrorCode, Discriminator};
use pawket::{instruction as ix, CareActionType, Guestbook, PawketError, CHECK_IN_EARLY_SECONDS, DEVICE_FLOAT_LAMPORTS};
use solana_keypair::Keypair;
use solana_signer::Signer;

use crate::harness::*;

struct Linked {
    owner: Keypair,
    sponsor: Keypair,
    device: Keypair,
    pet: anchor_lang::prelude::Pubkey,
}

/// A player with a pet and a Pawket Wallet holding nothing, its rent and fee paid by the sponsor,
/// and a device linked for a week at `daily` actions a day: what a player with an empty wallet gets.
fn linked(env: &mut Env, daily: u16) -> Linked {
    let owner = env.player();
    let sponsor = env.player();
    let device = env.broke();
    let pet = env.adopt(&owner, "Pepper");
    let week = env.now() + 7 * DAY;
    ok(env.send(
        &[open_wallet_ix(&owner.pubkey(), &sponsor.pubkey()), link_ix(&owner.pubkey(), &device.pubkey(), week, daily)],
        &sponsor,
        &[&owner, &device],
    ));
    Linked { owner, sponsor, device, pet }
}

impl Linked {
    /// `owners_ix`, as the device signs it, with the sponsor paying the fee.
    fn send(&self, env: &mut Env, owners_ix: anchor_lang::solana_program::instruction::Instruction, discriminator: &[u8]) -> TxResult {
        let device_ix = by_device(owners_ix, &self.device.pubkey(), &self.owner.pubkey(), discriminator);
        env.send(&[device_ix], &self.sponsor, &[&self.device])
    }
}

#[test]
fn a_device_does_everything_its_owner_signs_for_and_the_owner_signs_nothing() {
    let mut env = Env::new();
    let d = linked(&mut env, 50);
    let (owner, sponsor) = (d.owner.pubkey(), d.sponsor.pubkey());
    // The link handed over no float: there was no balance to hand it from.
    assert_eq!(env.lamports(&d.device.pubkey()), 0);
    let owner_lamports = env.lamports(&owner);

    // A second pet, the owner's, at the owner's address.
    ok(d.send(&mut env, adopt_ix(&owner, &sponsor, "Biscuit"), ix::AdoptPetByDevice::DISCRIMINATOR));
    let biscuit = pet_pda(&owner, "Biscuit");
    assert_eq!(env.pet(&biscuit).owner, owner);
    assert_eq!(env.passport(&biscuit).owner, owner);

    // Pepper founds a guild; Biscuit joins it and leaves again, the rent back to the sponsor.
    ok(d.send(&mut env, found_ix(&owner, &sponsor, &d.pet, "sunbeam-club"), ix::FoundGuildByDevice::DISCRIMINATOR));
    let guild = guild_pda("sunbeam-club");
    assert_eq!((env.guild("sunbeam-club").founder, env.member(&d.pet).owner), (owner, owner));
    ok(d.send(&mut env, join_ix(&owner, &sponsor, &biscuit, &guild), ix::JoinGuildByDevice::DISCRIMINATOR));
    assert_eq!(env.guild("sunbeam-club").member_count, 2);
    let sponsor_before = env.lamports(&sponsor);
    let rent = env.lamports(&member_pda(&biscuit));
    ok(d.send(&mut env, leave_ix(&owner, &biscuit, &guild, &sponsor), ix::LeaveGuildByDevice::DISCRIMINATOR));
    assert!(!env.exists(&member_pda(&biscuit)));
    assert_eq!(env.lamports(&sponsor), sponsor_before + rent - 10_000);

    // The founder's device plans an event and Pepper goes, then checks in when it opens.
    let starts = env.now() + DAY;
    let id = starts as u32;
    let plan = create_event_ix(&owner, &sponsor, &guild, id, "Sunday nap", "By the window.", starts, starts + HOUR);
    ok(d.send(&mut env, plan, ix::CreateEventByDevice::DISCRIMINATOR));
    let event = event_pda(&guild, id);
    assert_eq!(env.event(&event).creator, owner);
    ok(d.send(&mut env, rsvp_ix(&owner, &sponsor, &d.pet, &event), ix::RsvpByDevice::DISCRIMINATOR));
    let rsvp = env.rsvp(&rsvp_pda(&event, &d.pet));
    assert_eq!((rsvp.owner, rsvp.payer), (owner, sponsor));
    env.set_time(starts - CHECK_IN_EARLY_SECONDS);
    ok(d.send(&mut env, check_in_ix(&owner, &d.pet, &event), ix::CheckInByDevice::DISCRIMINATOR));
    assert!(env.rsvp(&rsvp_pda(&event, &d.pet)).came);

    // It asks the guild something and answers: one ballot, the owner's.
    let closes = env.now() + DAY;
    let ask = create_poll_ix(&owner, &sponsor, &guild, 1, "Where next?", &["Window", "Rug"], closes);
    ok(d.send(&mut env, ask, ix::CreatePollByDevice::DISCRIMINATOR));
    let poll = poll_pda(&guild, 1);
    ok(d.send(&mut env, vote_ix(&owner, &sponsor, &d.pet, &poll, 1), ix::VoteByDevice::DISCRIMINATOR));
    assert_eq!(env.ballot(&ballot_pda(&poll, &owner)).owner, owner);
    assert_eq!(env.poll(&poll).votes[1], 1);
    // Still one ballot per wallet, whoever signs for it.
    assert!(d.send(&mut env, vote_ix(&owner, &sponsor, &d.pet, &poll, 0), ix::VoteByDevice::DISCRIMINATOR).is_err());
    assert!(env.send(&[vote_ix(&owner, &sponsor, &d.pet, &poll, 0)], &d.sponsor, &[&d.owner]).is_err());

    // And waves at someone else's pet, as its owner.
    let neighbour = env.player();
    let mochi = env.adopt(&neighbour, "Mochi");
    ok(d.send(&mut env, wave_ix(&owner, &sponsor, &mochi), ix::WaveByDevice::DISCRIMINATOR));
    assert_eq!(env.guestbook(&mochi).recent[0].visitor, owner);

    // The owner signed nothing and paid nothing; the device held nothing and paid nothing.
    assert_eq!(env.lamports(&owner), owner_lamports);
    assert_eq!(env.lamports(&d.device.pubkey()), 0);
    let wallet = env.wallet(&owner);
    assert_eq!((wallet.actions, wallet.spent), (10, 0));
}

#[test]
fn a_device_acts_for_its_owners_pets_and_no_one_elses() {
    let mut env = Env::new();
    let d = linked(&mut env, 50);
    let (owner, sponsor) = (d.owner.pubkey(), d.sponsor.pubkey());
    let stranger = env.player();
    let theirs = env.adopt(&stranger, "Mochi");
    ok(env.send(&[found_ix(&stranger.pubkey(), &stranger.pubkey(), &theirs, "muddy-paws")], &stranger, &[]));
    let guild = guild_pda("muddy-paws");

    // Their pets are not the owner's to join, found with, or leave with.
    let loose = env.adopt(&stranger, "Nib");
    expect_pawket(
        &d.send(&mut env, join_ix(&owner, &sponsor, &loose, &guild), ix::JoinGuildByDevice::DISCRIMINATOR),
        PawketError::NotPetOwner,
    );
    expect_pawket(
        &d.send(&mut env, found_ix(&owner, &sponsor, &loose, "taken-over"), ix::FoundGuildByDevice::DISCRIMINATOR),
        PawketError::NotPetOwner,
    );
    expect_pawket(
        &d.send(&mut env, leave_ix(&owner, &theirs, &guild, &stranger.pubkey()), ix::LeaveGuildByDevice::DISCRIMINATOR),
        PawketError::NotPetOwner,
    );
    // Their guild is not the owner's to plan or ask in.
    let now = env.now();
    expect_pawket(
        &d.send(&mut env, create_event_ix(&owner, &sponsor, &guild, 1, "Hijack", "", now + HOUR, now + 2 * HOUR), ix::CreateEventByDevice::DISCRIMINATOR),
        PawketError::NotGuildFounder,
    );
    expect_pawket(
        &d.send(&mut env, create_poll_ix(&owner, &sponsor, &guild, 1, "Whose?", &["Mine", "Yours"], now + DAY), ix::CreatePollByDevice::DISCRIMINATOR),
        PawketError::NotGuildFounder,
    );
    // A device cannot wave at its own owner's pet.
    expect_pawket(
        &d.send(&mut env, wave_ix(&owner, &sponsor, &d.pet), ix::WaveByDevice::DISCRIMINATOR),
        PawketError::CannotWaveAtOwnPet,
    );
    // Another key is not the linked device, whatever it claims.
    let impostor = env.broke();
    let fake = by_device(join_ix(&owner, &sponsor, &d.pet, &guild), &impostor.pubkey(), &owner, ix::JoinGuildByDevice::DISCRIMINATOR);
    expect_pawket(&env.send(&[fake], &d.sponsor, &[&impostor]), PawketError::NotThisDevice);
}

#[test]
fn every_kind_of_action_counts_toward_the_daily_limit() {
    let mut env = Env::new();
    let d = linked(&mut env, 2);
    let (owner, sponsor) = (d.owner.pubkey(), d.sponsor.pubkey());
    let neighbour = env.player();
    let mochi = env.adopt(&neighbour, "Mochi");
    ok(d.send(&mut env, care_ix(&owner, &d.pet, CareActionType::Feed), ix::CareByDevice::DISCRIMINATOR));
    ok(d.send(&mut env, wave_ix(&owner, &sponsor, &mochi), ix::WaveByDevice::DISCRIMINATOR));
    expect_pawket(
        &d.send(&mut env, found_ix(&owner, &sponsor, &d.pet, "sunbeam-club"), ix::FoundGuildByDevice::DISCRIMINATOR),
        PawketError::DailyLimitReached,
    );
    env.warp(8 * DAY);
    expect_pawket(
        &d.send(&mut env, found_ix(&owner, &sponsor, &d.pet, "sunbeam-club"), ix::FoundGuildByDevice::DISCRIMINATOR),
        PawketError::DeviceExpired,
    );
}

#[test]
fn a_device_with_no_float_acts_only_while_someone_else_pays_its_fee() {
    let mut env = Env::new();
    let d = linked(&mut env, 50);
    let care = care_by_device_ix(&d.device.pubkey(), &d.owner.pubkey(), &d.pet, CareActionType::Play);
    // Alone, it has nothing to pay the fee with: nothing lands.
    assert!(env.send(std::slice::from_ref(&care), &d.device, &[]).is_err());
    ok(env.send(&[care], &d.sponsor, &[&d.device]));

    // A deposit and a fresh link hand it the whole float; then it can pay its own way.
    ok(env.send(&[deposit_ix(&d.owner.pubkey(), DEVICE_FLOAT_LAMPORTS)], &d.owner, &[]));
    let week = env.now() + 7 * DAY;
    ok(env.send(&[link_ix(&d.owner.pubkey(), &d.device.pubkey(), week, 50)], &d.sponsor, &[&d.owner, &d.device]));
    assert_eq!(env.lamports(&d.device.pubkey()), DEVICE_FLOAT_LAMPORTS);
    ok(env.send(&[care_by_device_ix(&d.device.pubkey(), &d.owner.pubkey(), &d.pet, CareActionType::Feed)], &d.device, &[]));
}

#[test]
fn a_device_is_held_to_the_same_addresses_its_owner_is() {
    let mut env = Env::new();
    let d = linked(&mut env, 50);
    let (owner, sponsor) = (d.owner.pubkey(), d.sponsor.pubkey());

    // The pet's passport, word for word, somewhere else.
    let elsewhere = Keypair::new().pubkey();
    let copy = env.passport(&d.pet);
    env.forge(&elsewhere, &copy);
    let mut care = care_ix(&owner, &d.pet, CareActionType::Feed);
    care.accounts[2].pubkey = elsewhere;
    expect_anchor(&d.send(&mut env, care, ix::CareByDevice::DISCRIMINATOR), ErrorCode::ConstraintSeeds);

    // A guild, word for word, somewhere else.
    let founder = env.player();
    let saffron = env.adopt(&founder, "Saffron");
    ok(env.send(&[found_ix(&founder.pubkey(), &founder.pubkey(), &saffron, "sunbeam-club")], &founder, &[]));
    let fake = Keypair::new().pubkey();
    let guild = env.guild("sunbeam-club");
    env.forge(&fake, &guild);
    let join = join_ix(&owner, &sponsor, &d.pet, &fake);
    expect_anchor(&d.send(&mut env, join, ix::JoinGuildByDevice::DISCRIMINATOR), ErrorCode::ConstraintSeeds);

    // At Saffron's guestbook address, a book that names the device owner's pet.
    let forged = Guestbook { pet: d.pet, waves: 0, recent: Default::default(), bump: 0 };
    env.forge(&guestbook_pda(&saffron), &forged);
    let wave = wave_ix(&owner, &sponsor, &saffron);
    expect_anchor(&d.send(&mut env, wave, ix::WaveByDevice::DISCRIMINATOR), ErrorCode::ConstraintRaw);
}
