use anchor_lang::{error::ErrorCode, Space};
use pawket::{Ballot, EventRsvp, GuildEvent, GuildPoll, PawketError, CHECK_IN_EARLY_SECONDS};
use solana_keypair::Keypair;
use solana_signer::Signer;

use crate::harness::*;

/// A guild founded by one owner's pet, with a second owner's pet in it, the sponsor paying.
struct Gathering {
    sponsor: Keypair,
    founder: Keypair,
    founder_pet: anchor_lang::prelude::Pubkey,
    member: Keypair,
    member_pet: anchor_lang::prelude::Pubkey,
    guild: anchor_lang::prelude::Pubkey,
}

fn gathering(env: &mut Env) -> Gathering {
    let sponsor = env.player();
    let founder = env.player();
    let member = env.player();
    let founder_pet = env.adopt(&founder, "Saffron");
    let member_pet = env.adopt(&member, "Marmalade");
    ok(env.send(&[found_ix(&founder.pubkey(), &sponsor.pubkey(), &founder_pet, "sunbeam-club")], &sponsor, &[&founder]));
    let guild = guild_pda("sunbeam-club");
    ok(env.send(&[join_ix(&member.pubkey(), &sponsor.pubkey(), &member_pet, &guild)], &sponsor, &[&member]));
    Gathering { sponsor, founder, founder_pet, member, member_pet, guild }
}

#[test]
fn the_founder_plans_an_event_and_its_pets_say_they_are_going_and_check_in() {
    let mut env = Env::new();
    let g = gathering(&mut env);
    let starts = env.now() + DAY;
    let id = starts as u32;
    ok(env.send(
        &[create_event_ix(&g.founder.pubkey(), &g.sponsor.pubkey(), &g.guild, id, "Sunday nap", "In the sun, by the window.", starts, starts + 2 * HOUR)],
        &g.sponsor,
        &[&g.founder],
    ));
    let event = event_pda(&g.guild, id);
    let planned = env.event(&event);
    assert_eq!((planned.guild, planned.creator, planned.id), (g.guild, g.founder.pubkey(), id));
    assert_eq!(planned.title, "Sunday nap");

    for (owner, pet) in [(&g.founder, g.founder_pet), (&g.member, g.member_pet)] {
        ok(env.send(&[rsvp_ix(&owner.pubkey(), &g.sponsor.pubkey(), &pet, &event)], &g.sponsor, &[owner]));
    }
    assert_eq!(env.event(&event).going, 2);
    assert!(env.send(&[rsvp_ix(&g.member.pubkey(), &g.sponsor.pubkey(), &g.member_pet, &event)], &g.sponsor, &[&g.member]).is_err(), "one RSVP per pet");

    // Check-in opens fifteen minutes before the start.
    let check_in = |env: &mut Env| env.send(&[check_in_ix(&g.member.pubkey(), &g.member_pet, &event)], &g.member, &[]);
    expect_pawket(&check_in(&mut env), PawketError::NotCheckInTime);
    env.set_time(starts - CHECK_IN_EARLY_SECONDS);
    ok(check_in(&mut env));
    expect_pawket(&check_in(&mut env), PawketError::AlreadyCheckedIn);
    let rsvp = env.rsvp(&rsvp_pda(&event, &g.member_pet));
    assert!(rsvp.came);
    assert_eq!(rsvp.payer, g.sponsor.pubkey());
    assert_eq!((env.event(&event).going, env.event(&event).came), (2, 1));

    env.set_time(starts + 2 * HOUR + 1);
    expect_pawket(
        &env.send(&[check_in_ix(&g.founder.pubkey(), &g.founder_pet, &event)], &g.founder, &[]),
        PawketError::NotCheckInTime,
    );
    let latecomer = env.player();
    let late_pet = env.adopt(&latecomer, "Nib");
    ok(env.send(&[join_ix(&latecomer.pubkey(), &latecomer.pubkey(), &late_pet, &g.guild)], &latecomer, &[]));
    expect_pawket(
        &env.send(&[rsvp_ix(&latecomer.pubkey(), &latecomer.pubkey(), &late_pet, &event)], &latecomer, &[]),
        PawketError::EventOver,
    );
}

#[test]
fn only_the_founder_plans_and_only_the_guilds_pets_say_they_are_going() {
    let mut env = Env::new();
    let g = gathering(&mut env);
    let starts = env.now() + HOUR;
    expect_pawket(
        &env.send(&[create_event_ix(&g.member.pubkey(), &g.member.pubkey(), &g.guild, 1, "My party", "", starts, starts + HOUR)], &g.member, &[]),
        PawketError::NotGuildFounder,
    );
    ok(env.send(&[create_event_ix(&g.founder.pubkey(), &g.founder.pubkey(), &g.guild, 1, "Our party", "", starts, starts + HOUR)], &g.founder, &[]));
    let event = event_pda(&g.guild, 1);

    // A pet in another guild is not this guild's.
    let stranger = env.player();
    let stranger_pet = env.adopt(&stranger, "Biscuit");
    ok(env.send(&[found_ix(&stranger.pubkey(), &stranger.pubkey(), &stranger_pet, "muddy-paws")], &stranger, &[]));
    expect_pawket(
        &env.send(&[rsvp_ix(&stranger.pubkey(), &stranger.pubkey(), &stranger_pet, &event)], &stranger, &[]),
        PawketError::NotInGuild,
    );
    // Someone else's pet is not yours to bring.
    expect_pawket(
        &env.send(&[rsvp_ix(&stranger.pubkey(), &stranger.pubkey(), &g.member_pet, &event)], &stranger, &[]),
        PawketError::NotPetOwner,
    );
}

#[test]
fn an_event_is_held_to_its_rules() {
    let mut env = Env::new();
    let g = gathering(&mut env);
    let now = env.now();
    let plan = |title: &str, note: &str, starts: i64, ends: i64| {
        create_event_ix(&g.founder.pubkey(), &g.founder.pubkey(), &g.guild, 7, title, note, starts, ends)
    };
    for ix in [
        plan("No", "", now + HOUR, now + 2 * HOUR),
        plan(&"a".repeat(49), "", now + HOUR, now + 2 * HOUR),
        plan("Nap", &"a".repeat(121), now + HOUR, now + 2 * HOUR),
        plan("Nap", "", now + 2 * HOUR, now + HOUR),
        plan("Nap", "", now - 2 * HOUR, now - HOUR),
        plan("Nap", "", now + HOUR, now + HOUR + 8 * DAY),
        plan("Nap", "", now + 61 * DAY, now + 61 * DAY + HOUR),
        // A span too long to count is refused like any other, not left to overflow.
        plan("Nap", "", i64::MIN, now + HOUR),
    ] {
        expect_pawket(&env.send(&[ix], &g.founder, &[]), PawketError::InvalidEvent);
    }
}

#[test]
fn a_poll_takes_one_ballot_per_wallet_and_counts_them() {
    let mut env = Env::new();
    let g = gathering(&mut env);
    let closes = env.now() + DAY;
    ok(env.send(
        &[create_poll_ix(&g.founder.pubkey(), &g.sponsor.pubkey(), &g.guild, 1, "Next nap spot?", &["Window", "Rug", "Basket"], closes)],
        &g.sponsor,
        &[&g.founder],
    ));
    let poll = poll_pda(&g.guild, 1);
    assert_eq!(env.poll(&poll).options, vec!["Window", "Rug", "Basket"]);

    ok(env.send(&[vote_ix(&g.member.pubkey(), &g.sponsor.pubkey(), &g.member_pet, &poll, 2)], &g.sponsor, &[&g.member]));
    ok(env.send(&[vote_ix(&g.founder.pubkey(), &g.sponsor.pubkey(), &g.founder_pet, &poll, 0)], &g.sponsor, &[&g.founder]));
    assert_eq!(env.poll(&poll).votes, [1, 0, 1, 0]);
    let ballot = env.ballot(&ballot_pda(&poll, &g.member.pubkey()));
    assert_eq!((ballot.owner, ballot.pet, ballot.option), (g.member.pubkey(), g.member_pet, 2));

    // One person, one vote: a second pet of the same wallet does not vote again.
    let second = env.adopt(&g.member, "Nib");
    ok(env.send(&[join_ix(&g.member.pubkey(), &g.member.pubkey(), &second, &g.guild)], &g.member, &[]));
    assert!(env.send(&[vote_ix(&g.member.pubkey(), &g.member.pubkey(), &second, &poll, 1)], &g.member, &[]).is_err());

    let late = env.player();
    let late_pet = env.adopt(&late, "Tuesday");
    ok(env.send(&[join_ix(&late.pubkey(), &late.pubkey(), &late_pet, &g.guild)], &late, &[]));
    expect_pawket(&env.send(&[vote_ix(&late.pubkey(), &late.pubkey(), &late_pet, &poll, 3)], &late, &[]), PawketError::UnknownOption);
    env.set_time(closes);
    expect_pawket(&env.send(&[vote_ix(&late.pubkey(), &late.pubkey(), &late_pet, &poll, 1)], &late, &[]), PawketError::PollClosed);
    assert_eq!(env.poll(&poll).votes, [1, 0, 1, 0]);
}

#[test]
fn only_the_founder_asks_and_a_poll_is_held_to_its_rules() {
    let mut env = Env::new();
    let g = gathering(&mut env);
    let now = env.now();
    expect_pawket(
        &env.send(&[create_poll_ix(&g.member.pubkey(), &g.member.pubkey(), &g.guild, 1, "Mine?", &["Yes", "No"], now + DAY)], &g.member, &[]),
        PawketError::NotGuildFounder,
    );
    let ask = |question: &str, options: &[&str], closes: i64| {
        create_poll_ix(&g.founder.pubkey(), &g.founder.pubkey(), &g.guild, 2, question, options, closes)
    };
    for ix in [
        ask("Hm", &["Yes", "No"], now + DAY),
        ask(&"a".repeat(81), &["Yes", "No"], now + DAY),
        ask("Which?", &["Only"], now + DAY),
        ask("Which?", &["A", "B", "C", "D", "E"], now + DAY),
        ask("Which?", &["", "B"], now + DAY),
        ask("Which?", &[&"a".repeat(25), "B"], now + DAY),
        ask("Which?", &["A", "B"], now + 5 * 60),
        ask("Which?", &["A", "B"], now + 15 * DAY),
    ] {
        expect_pawket(&env.send(&[ix], &g.founder, &[]), PawketError::InvalidPoll);
    }
}

#[test]
fn a_pet_goes_and_answers_only_on_its_own_place_in_the_guild() {
    let mut env = Env::new();
    let g = gathering(&mut env);
    let (founder, now) = (g.founder.pubkey(), env.now());
    ok(env.send(&[create_event_ix(&founder, &founder, &g.guild, 1, "Nap", "", now + DAY, now + DAY + HOUR)], &g.founder, &[]));
    ok(env.send(&[create_poll_ix(&founder, &founder, &g.guild, 1, "Where?", &["Rug", "Sun"], now + DAY)], &g.founder, &[]));
    let (event, poll) = (event_pda(&g.guild, 1), poll_pda(&g.guild, 1));

    // An outsider's pet borrows a member's place in the guild.
    let outsider = env.player();
    let id = outsider.pubkey();
    let stray = env.adopt(&outsider, "Stray");
    let mut going = rsvp_ix(&id, &id, &stray, &event);
    going.accounts[3].pubkey = member_pda(&g.member_pet);
    expect_anchor(&env.send(&[going], &outsider, &[]), ErrorCode::ConstraintSeeds);
    let mut ballot = vote_ix(&id, &id, &stray, &poll, 0);
    ballot.accounts[3].pubkey = member_pda(&g.member_pet);
    expect_anchor(&env.send(&[ballot], &outsider, &[]), ErrorCode::ConstraintSeeds);

    // Its own place, in another guild, is not a place in this one.
    ok(env.send(&[found_ix(&id, &id, &stray, "muddy-paws")], &outsider, &[]));
    expect_pawket(&env.send(&[vote_ix(&id, &id, &stray, &poll, 0)], &outsider, &[]), PawketError::NotInGuild);
    assert_eq!((env.event(&event).going, env.poll(&poll).votes), (0, [0; 4]));
}

#[test]
fn a_pet_checks_in_only_on_its_own_rsvp() {
    let mut env = Env::new();
    let g = gathering(&mut env);
    let (founder, starts) = (g.founder.pubkey(), env.now() + HOUR);
    ok(env.send(&[create_event_ix(&founder, &founder, &g.guild, 1, "Nap", "", starts, starts + HOUR)], &g.founder, &[]));
    let event = event_pda(&g.guild, 1);
    ok(env.send(&[rsvp_ix(&founder, &founder, &g.founder_pet, &event)], &g.founder, &[]));
    env.set_time(starts);

    // The member's pet never said it was going; it checks in on the founder's pet's word.
    let mut borrowed = check_in_ix(&g.member.pubkey(), &g.member_pet, &event);
    borrowed.accounts[3].pubkey = rsvp_pda(&event, &g.founder_pet);
    expect_anchor(&env.send(&[borrowed], &g.member, &[]), ErrorCode::ConstraintSeeds);
    assert!(!env.rsvp(&rsvp_pda(&event, &g.founder_pet)).came);
    assert_eq!(env.event(&event).came, 0);
}

#[test]
fn gathering_layouts_are_the_contract_the_web_app_decodes() {
    assert_eq!(8 + <GuildEvent as Space>::INIT_SPACE, 285);
    assert_eq!(8 + <EventRsvp as Space>::INIT_SPACE, 146);
    assert_eq!(8 + <GuildPoll as Space>::INIT_SPACE, 309);
    assert_eq!(8 + <Ballot as Space>::INIT_SPACE, 146);
}
