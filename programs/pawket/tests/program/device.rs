use anchor_lang::{error::ErrorCode, Discriminator};
use pawket::{
    instruction as ix, CareActionType, Guestbook, PawketError, PawketWallet, CHECK_IN_EARLY_SECONDS, DEVICE_FLOAT_LAMPORTS,
    MAX_DAILY_ACTIONS, WEARABLE_COUNT,
};
use anchor_lang::prelude::Pubkey;
use solana_keypair::Keypair;
use solana_signer::Signer;

use crate::harness::*;

type Instruction = anchor_lang::solana_program::instruction::Instruction;

struct Linked {
    owner: Keypair,
    sponsor: Keypair,
    device: Keypair,
    pet: anchor_lang::prelude::Pubkey,
}

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
    fn send(&self, env: &mut Env, owners_ix: Instruction, discriminator: &[u8]) -> TxResult {
        let device_ix = by_device(owners_ix, &self.device.pubkey(), &self.owner.pubkey(), discriminator);
        env.send(&[device_ix], &self.sponsor, &[&self.device])
    }
}

#[test]
fn a_device_does_everything_its_owner_signs_for_and_the_owner_signs_nothing() {
    let mut env = Env::new();
    let d = linked(&mut env, 50);
    let (owner, sponsor) = (d.owner.pubkey(), d.sponsor.pubkey());
    assert_eq!(env.lamports(&d.device.pubkey()), 0);
    let owner_lamports = env.lamports(&owner);

    ok(d.send(&mut env, adopt_ix(&owner, &sponsor, "Biscuit"), ix::AdoptPetByDevice::DISCRIMINATOR));
    let biscuit = pet_pda(&owner, "Biscuit");
    assert_eq!(env.pet(&biscuit).owner, owner);
    assert_eq!(env.passport(&biscuit).owner, owner);

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

    let starts = env.now() + DAY;
    let id = starts as u32;
    let plan = create_event_ix(&owner, &sponsor, &guild, &d.pet, id, "Sunday nap", "By the window.", starts, starts + HOUR);
    ok(d.send(&mut env, plan, ix::CreateEventByDevice::DISCRIMINATOR));
    let event = event_pda(&guild, id);
    assert_eq!(env.event(&event).creator, owner);
    ok(d.send(&mut env, rsvp_ix(&owner, &sponsor, &d.pet, &event), ix::RsvpByDevice::DISCRIMINATOR));
    let rsvp = env.rsvp(&rsvp_pda(&event, &d.pet));
    assert_eq!((rsvp.owner, rsvp.payer), (owner, sponsor));
    env.set_time(starts - CHECK_IN_EARLY_SECONDS);
    ok(d.send(&mut env, check_in_ix(&owner, &d.pet, &event), ix::CheckInByDevice::DISCRIMINATOR));
    assert!(env.rsvp(&rsvp_pda(&event, &d.pet)).came);

    let closes = env.now() + DAY;
    let ask = create_poll_ix(&owner, &sponsor, &guild, &d.pet, 1, "Where next?", &["Window", "Rug"], closes);
    ok(d.send(&mut env, ask, ix::CreatePollByDevice::DISCRIMINATOR));
    let poll = poll_pda(&guild, 1);
    ok(d.send(&mut env, vote_ix(&owner, &sponsor, &d.pet, &poll, 1), ix::VoteByDevice::DISCRIMINATOR));
    assert_eq!(env.ballot(&ballot_pda(&poll, &owner)).owner, owner);
    assert_eq!(env.poll(&poll).votes[1], 1);
    assert!(d.send(&mut env, vote_ix(&owner, &sponsor, &d.pet, &poll, 0), ix::VoteByDevice::DISCRIMINATOR).is_err());
    assert!(env.send(&[vote_ix(&owner, &sponsor, &d.pet, &poll, 0)], &d.sponsor, &[&d.owner]).is_err());

    let neighbour = env.player();
    let mochi = env.adopt(&neighbour, "Mochi");
    ok(d.send(&mut env, wave_ix(&owner, &sponsor, &mochi), ix::WaveByDevice::DISCRIMINATOR));
    assert_eq!(env.guestbook(&mochi).recent[0].visitor, owner);

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
    let now = env.now();
    expect_pawket(
        &d.send(&mut env, create_event_ix(&owner, &sponsor, &guild, &theirs, 1, "Hijack", "", now + HOUR, now + 2 * HOUR), ix::CreateEventByDevice::DISCRIMINATOR),
        PawketError::NotGuildFounder,
    );
    expect_pawket(
        &d.send(&mut env, create_poll_ix(&owner, &sponsor, &guild, &theirs, 1, "Whose?", &["Mine", "Yours"], now + DAY), ix::CreatePollByDevice::DISCRIMINATOR),
        PawketError::NotGuildFounder,
    );
    expect_pawket(
        &d.send(&mut env, wave_ix(&owner, &sponsor, &d.pet), ix::WaveByDevice::DISCRIMINATOR),
        PawketError::CannotWaveAtOwnPet,
    );
    let impostor = env.broke();
    let fake = by_device(join_ix(&owner, &sponsor, &d.pet, &guild), &impostor.pubkey(), &owner, ix::JoinGuildByDevice::DISCRIMINATOR);
    expect_pawket(&env.send(&[fake], &d.sponsor, &[&impostor]), PawketError::NotThisDevice);
}

#[test]
fn every_twin_that_takes_a_pet_refuses_one_its_owner_does_not_keep() {
    let mut env = Env::new();
    let d = linked(&mut env, 50);
    let (owner, sponsor) = (d.owner.pubkey(), d.sponsor.pubkey());
    ok(env.send(&[buy_ix(&owner, &owner, WEARABLE_COUNT + 1)], &d.owner, &[]));
    let stranger = env.player();
    let s = stranger.pubkey();
    let theirs = env.adopt(&stranger, "Mochi");
    ok(env.send(&[found_ix(&s, &s, &theirs, "muddy-paws")], &stranger, &[]));
    let guild = guild_pda("muddy-paws");
    let starts = env.now() + HOUR;
    let plan = create_event_ix(&s, &s, &guild, &theirs, 1, "Nap", "", starts, starts + HOUR);
    ok(env.send(&[plan, create_poll_ix(&s, &s, &guild, &theirs, 1, "Where?", &["Rug", "Sun"], starts + HOUR)], &stranger, &[]));
    let (event, poll) = (event_pda(&guild, 1), poll_pda(&guild, 1));

    let attempts = [
        (round_ix(&owner, &theirs), ix::FinishRoundByDevice::DISCRIMINATOR),
        (dress_ix(&owner, &theirs, 1), ix::DressByDevice::DISCRIMINATOR),
        (dress_owned_ix(&owner, &theirs, WEARABLE_COUNT + 1), ix::DressOwnedByDevice::DISCRIMINATOR),
        (rsvp_ix(&owner, &sponsor, &theirs, &event), ix::RsvpByDevice::DISCRIMINATOR),
        (vote_ix(&owner, &sponsor, &theirs, &poll, 0), ix::VoteByDevice::DISCRIMINATOR),
    ];
    for (owners_ix, discriminator) in attempts {
        expect_pawket(&d.send(&mut env, owners_ix, discriminator), PawketError::NotPetOwner);
    }
    ok(env.send(&[rsvp_ix(&s, &s, &theirs, &event)], &stranger, &[]));
    env.set_time(starts);
    let check_in = d.send(&mut env, check_in_ix(&owner, &theirs, &event), ix::CheckInByDevice::DISCRIMINATOR);
    expect_pawket(&check_in, PawketError::NotPetOwner);
    let held = env.event(&event);
    assert_eq!((held.going, held.came, env.poll(&poll).votes, env.pet(&theirs).wearing), (1, 0, [0; 4], 0));
}

#[test]
fn a_device_plans_asks_and_checks_in_only_while_its_pet_is_in_the_guild() {
    let mut env = Env::new();
    let d = linked(&mut env, 50);
    let (owner, sponsor, o) = (d.owner.pubkey(), d.sponsor.pubkey(), &d.owner);
    ok(env.send(&[found_ix(&owner, &owner, &d.pet, "sunbeam-club")], o, &[]));
    let guild = guild_pda("sunbeam-club");
    let starts = env.now() + HOUR;
    ok(env.send(&[create_event_ix(&owner, &owner, &guild, &d.pet, 1, "Nap", "", starts, starts + HOUR)], o, &[]));
    let event = event_pda(&guild, 1);
    ok(env.send(&[rsvp_ix(&owner, &owner, &d.pet, &event)], o, &[]));
    let neighbour = env.player();
    let mochi = env.adopt(&neighbour, "Mochi");
    ok(env.send(&[join_ix(&neighbour.pubkey(), &neighbour.pubkey(), &mochi, &guild)], &neighbour, &[]));
    ok(env.send(&[leave_ix(&owner, &d.pet, &guild, &owner)], o, &[]));
    env.set_time(starts);

    let twins = [
        (
            create_event_ix(&owner, &sponsor, &guild, &d.pet, 2, "Picnic", "", starts + HOUR, starts + 2 * HOUR),
            ix::CreateEventByDevice::DISCRIMINATOR,
            PawketError::NotGuildFounder,
        ),
        (
            create_poll_ix(&owner, &sponsor, &guild, &d.pet, 1, "When?", &["Now", "Later"], starts + DAY),
            ix::CreatePollByDevice::DISCRIMINATOR,
            PawketError::NotGuildFounder,
        ),
        (check_in_ix(&owner, &d.pet, &event), ix::CheckInByDevice::DISCRIMINATOR, PawketError::NotInGuild),
    ];
    for (owners_ix, discriminator, _) in &twins {
        expect_anchor(&d.send(&mut env, owners_ix.clone(), discriminator), ErrorCode::AccountNotInitialized);
        let mut borrowed = owners_ix.clone();
        borrowed.accounts.last_mut().unwrap().pubkey = member_pda(&mochi);
        expect_anchor(&d.send(&mut env, borrowed, discriminator), ErrorCode::ConstraintSeeds);
    }
    ok(env.send(&[found_ix(&owner, &owner, &d.pet, "window-seat")], o, &[]));
    for (owners_ix, discriminator, error) in twins {
        expect_pawket(&d.send(&mut env, owners_ix, discriminator), error);
    }
    assert_eq!(env.event(&event).came, 0);
    assert!(!env.exists(&event_pda(&guild, 2)));
    assert!(!env.exists(&poll_pda(&guild, 1)));
}

#[test]
fn a_device_leaves_only_the_guild_its_pet_is_in_and_the_rent_goes_back_to_whoever_paid_it() {
    let mut env = Env::new();
    let d = linked(&mut env, 50);
    let (owner, o) = (d.owner.pubkey(), &d.owner);
    ok(env.send(&[found_ix(&owner, &owner, &d.pet, "sunbeam-club")], o, &[]));
    let neighbour = env.player();
    let mochi = env.adopt(&neighbour, "Mochi");
    ok(env.send(&[found_ix(&neighbour.pubkey(), &neighbour.pubkey(), &mochi, "cloud-nine")], &neighbour, &[]));
    let (sunbeam, cloud) = (guild_pda("sunbeam-club"), guild_pda("cloud-nine"));
    let leave = |guild: &Pubkey, payer: &Pubkey| leave_ix(&owner, &d.pet, guild, payer);

    let wrong_guild = d.send(&mut env, leave(&cloud, &owner), ix::LeaveGuildByDevice::DISCRIMINATOR);
    expect_anchor(&wrong_guild, ErrorCode::ConstraintHasOne);
    let to_the_device = d.send(&mut env, leave(&sunbeam, &d.device.pubkey()), ix::LeaveGuildByDevice::DISCRIMINATOR);
    expect_anchor(&to_the_device, ErrorCode::ConstraintHasOne);
    assert_eq!((env.guild("sunbeam-club").member_count, env.guild("cloud-nine").member_count), (1, 1));
    assert!(env.exists(&member_pda(&d.pet)));
    let rent = env.lamports(&member_pda(&d.pet));
    let before = env.lamports(&owner);
    ok(d.send(&mut env, leave(&sunbeam, &owner), ix::LeaveGuildByDevice::DISCRIMINATOR));
    assert_eq!(env.lamports(&owner) - before, rent);
}

#[test]
fn a_device_goes_votes_and_checks_in_only_in_its_pets_own_guild_on_its_own_rsvp() {
    let mut env = Env::new();
    let d = linked(&mut env, 50);
    let (owner, sponsor, o) = (d.owner.pubkey(), d.sponsor.pubkey(), &d.owner);
    let neighbour = env.player();
    let n = neighbour.pubkey();
    let mochi = env.adopt(&neighbour, "Mochi");
    ok(env.send(&[found_ix(&n, &n, &mochi, "cloud-nine")], &neighbour, &[]));
    let cloud = guild_pda("cloud-nine");
    let starts = env.now() + HOUR;
    let plan = create_event_ix(&n, &n, &cloud, &mochi, 1, "Nap", "", starts, starts + HOUR);
    let ask = create_poll_ix(&n, &n, &cloud, &mochi, 1, "Where?", &["Rug", "Sun"], starts + DAY);
    ok(env.send(&[plan, ask], &neighbour, &[]));
    let (event, poll) = (event_pda(&cloud, 1), poll_pda(&cloud, 1));
    ok(env.send(&[rsvp_ix(&n, &n, &mochi, &event)], &neighbour, &[]));

    // In a guild of its own, the pet neither goes to another guild's event nor answers its poll.
    ok(env.send(&[found_ix(&owner, &owner, &d.pet, "sunbeam-club")], o, &[]));
    let going = d.send(&mut env, rsvp_ix(&owner, &sponsor, &d.pet, &event), ix::RsvpByDevice::DISCRIMINATOR);
    expect_pawket(&going, PawketError::NotInGuild);
    let ballot = d.send(&mut env, vote_ix(&owner, &sponsor, &d.pet, &poll, 0), ix::VoteByDevice::DISCRIMINATOR);
    expect_pawket(&ballot, PawketError::NotInGuild);

    // In that guild, a pet with no RSVP of its own does not check in on another pet's.
    let clover = env.adopt(o, "Clover");
    ok(env.send(&[join_ix(&owner, &owner, &clover, &cloud)], o, &[]));
    env.set_time(starts);
    let mut borrowed = check_in_ix(&owner, &clover, &event);
    borrowed.accounts[3].pubkey = rsvp_pda(&event, &mochi);
    expect_anchor(&d.send(&mut env, borrowed, ix::CheckInByDevice::DISCRIMINATOR), ErrorCode::ConstraintSeeds);
    assert!(!env.rsvp(&rsvp_pda(&event, &mochi)).came);
    assert_eq!((env.event(&event).going, env.event(&event).came, env.poll(&poll).votes), (1, 0, [0; 4]));
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
    assert!(env.send(std::slice::from_ref(&care), &d.device, &[]).is_err());
    ok(env.send(&[care], &d.sponsor, &[&d.device]));

    ok(env.send(&[deposit_ix(&d.owner.pubkey(), DEVICE_FLOAT_LAMPORTS)], &d.owner, &[]));
    // A balance never tops a device that holds nothing up into a sliver below rent.
    let balance = env.balance(&d.owner.pubkey());
    let rest = care_by_device_ix(&d.device.pubkey(), &d.owner.pubkey(), &d.pet, CareActionType::Rest);
    ok(env.send(&[rest], &d.sponsor, &[&d.device]));
    assert_eq!((env.lamports(&d.device.pubkey()), env.balance(&d.owner.pubkey())), (0, balance));
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

    let elsewhere = Keypair::new().pubkey();
    let copy = env.passport(&d.pet);
    env.forge(&elsewhere, &copy);
    let mut care = care_ix(&owner, &d.pet, CareActionType::Feed);
    care.accounts[2].pubkey = elsewhere;
    expect_anchor(&d.send(&mut env, care, ix::CareByDevice::DISCRIMINATOR), ErrorCode::ConstraintSeeds);

    let founder = env.player();
    let saffron = env.adopt(&founder, "Saffron");
    ok(env.send(&[found_ix(&founder.pubkey(), &founder.pubkey(), &saffron, "sunbeam-club")], &founder, &[]));
    let fake = Keypair::new().pubkey();
    let guild = env.guild("sunbeam-club");
    env.forge(&fake, &guild);
    let join = join_ix(&owner, &sponsor, &d.pet, &fake);
    expect_anchor(&d.send(&mut env, join, ix::JoinGuildByDevice::DISCRIMINATOR), ErrorCode::ConstraintSeeds);

    let forged = Guestbook { pet: d.pet, waves: 0, recent: Default::default(), bump: 0 };
    env.forge(&guestbook_pda(&saffron), &forged);
    let wave = wave_ix(&owner, &sponsor, &saffron);
    expect_anchor(&d.send(&mut env, wave, ix::WaveByDevice::DISCRIMINATOR), ErrorCode::ConstraintRaw);
}

#[test]
fn a_device_acts_only_through_its_owners_wallet_at_the_wallets_own_address() {
    let mut env = Env::new();
    let victim = env.player();
    let pet = env.adopt(&victim, "Pepper");
    let attacker = env.player();
    let bump = anchor_lang::prelude::Pubkey::find_program_address(&[b"wallet", victim.pubkey().as_ref()], &pawket::ID).1;
    let forged = PawketWallet {
        owner: victim.pubkey(),
        device: attacker.pubkey(),
        device_expires_at: i64::MAX,
        daily_actions: MAX_DAILY_ACTIONS,
        day: 0,
        actions_today: 0,
        actions: 0,
        deposited: 0,
        withdrawn: 0,
        spent: 0,
        rent_payer: attacker.pubkey(),
        created_at: 0,
        bump,
    };
    let elsewhere = Keypair::new().pubkey();
    env.forge(&elsewhere, &forged);

    let mut care = care_by_device_ix(&attacker.pubkey(), &victim.pubkey(), &pet, CareActionType::Feed);
    care.accounts[1].pubkey = elsewhere;
    expect_anchor(&env.send(&[care], &attacker, &[]), ErrorCode::ConstraintSeeds);
    assert_eq!(env.passport(&pet).care_count, 0);
}

fn every_twin(env: &mut Env, d: &Linked) -> Vec<(&'static str, Instruction, &'static [u8])> {
    let (owner, sponsor, o) = (d.owner.pubkey(), d.sponsor.pubkey(), &d.owner);
    let tofu = env.adopt(o, "Tofu");
    let clover = env.adopt(o, "Clover");
    ok(env.send(&[found_ix(&owner, &owner, &d.pet, "sunbeam-club")], o, &[]));
    let guild = guild_pda("sunbeam-club");
    ok(env.send(&[join_ix(&owner, &owner, &clover, &guild)], o, &[]));
    let starts = env.now() + HOUR;
    let plans = [1, 2].map(|id| create_event_ix(&owner, &owner, &guild, &d.pet, id, "Nap", "", starts, starts + HOUR));
    ok(env.send(&plans, o, &[]));
    let (open, going) = (event_pda(&guild, 1), event_pda(&guild, 2));
    ok(env.send(&[rsvp_ix(&owner, &owner, &d.pet, &going)], o, &[]));
    ok(env.send(&[create_poll_ix(&owner, &owner, &guild, &d.pet, 1, "Where?", &["Rug", "Sun"], starts + DAY)], o, &[]));
    let poll = poll_pda(&guild, 1);
    ok(env.send(&[buy_ix(&owner, &owner, WEARABLE_COUNT + 1)], o, &[]));
    let neighbour = env.player();
    let mochi = env.adopt(&neighbour, "Mochi");
    vec![
        ("adopt", adopt_ix(&owner, &sponsor, "Biscuit"), ix::AdoptPetByDevice::DISCRIMINATOR),
        ("found", found_ix(&owner, &sponsor, &tofu, "tofu-club"), ix::FoundGuildByDevice::DISCRIMINATOR),
        ("join", join_ix(&owner, &sponsor, &tofu, &guild), ix::JoinGuildByDevice::DISCRIMINATOR),
        ("leave", leave_ix(&owner, &clover, &guild, &owner), ix::LeaveGuildByDevice::DISCRIMINATOR),
        ("care", care_ix(&owner, &d.pet, CareActionType::Play), ix::CareByDevice::DISCRIMINATOR),
        ("round", round_ix(&owner, &d.pet), ix::FinishRoundByDevice::DISCRIMINATOR),
        ("dress", dress_ix(&owner, &d.pet, 1), ix::DressByDevice::DISCRIMINATOR),
        ("dress owned", dress_owned_ix(&owner, &d.pet, WEARABLE_COUNT + 1), ix::DressOwnedByDevice::DISCRIMINATOR),
        ("plan", create_event_ix(&owner, &sponsor, &guild, &d.pet, 3, "Picnic", "", starts, starts + HOUR), ix::CreateEventByDevice::DISCRIMINATOR),
        ("go", rsvp_ix(&owner, &sponsor, &d.pet, &open), ix::RsvpByDevice::DISCRIMINATOR),
        ("check in", check_in_ix(&owner, &d.pet, &going), ix::CheckInByDevice::DISCRIMINATOR),
        ("ask", create_poll_ix(&owner, &sponsor, &guild, &d.pet, 2, "When?", &["Now", "Later"], starts + DAY), ix::CreatePollByDevice::DISCRIMINATOR),
        ("vote", vote_ix(&owner, &sponsor, &d.pet, &poll, 0), ix::VoteByDevice::DISCRIMINATOR),
        ("wave", wave_ix(&owner, &sponsor, &mochi), ix::WaveByDevice::DISCRIMINATOR),
    ]
}

fn all_refused(env: &mut Env, d: &Linked, twins: &[(&'static str, Instruction, &'static [u8])], signer: &Keypair, error: PawketError) {
    let owner = d.owner.pubkey();
    let before = env.wallet(&owner);
    for (what, owners_ix, discriminator) in twins {
        eprintln!("{what}, signed by {}", signer.pubkey());
        let tried = by_device(owners_ix.clone(), &signer.pubkey(), &owner, discriminator);
        expect_pawket(&env.send(&[tried], &d.sponsor, &[signer]), error);
    }
    let after = env.wallet(&owner);
    assert_eq!((after.actions, after.actions_today, after.spent), (before.actions, before.actions_today, before.spent));
}

#[test]
fn every_twin_refuses_any_key_but_the_linked_device_and_any_device_past_its_link() {
    let mut env = Env::new();
    let d = linked(&mut env, 50);
    let owner = d.owner.pubkey();
    let twins = every_twin(&mut env, &d);
    assert_eq!(twins.len(), 14);

    let impostor = env.broke();
    all_refused(&mut env, &d, &twins, &impostor, PawketError::NotThisDevice);

    let week = env.now() + 7 * DAY;
    ok(env.send(&[link_ix(&owner, &d.device.pubkey(), week, 1)], &d.sponsor, &[&d.owner, &d.device]));
    ok(d.send(&mut env, care_ix(&owner, &d.pet, CareActionType::Feed), ix::CareByDevice::DISCRIMINATOR));
    all_refused(&mut env, &d, &twins, &d.device, PawketError::DailyLimitReached);

    env.warp(8 * DAY);
    all_refused(&mut env, &d, &twins, &d.device, PawketError::DeviceExpired);

    let next = env.broke();
    let week = env.now() + 7 * DAY;
    ok(env.send(&[link_ix(&owner, &next.pubkey(), week, 50)], &d.sponsor, &[&d.owner, &next]));
    all_refused(&mut env, &d, &twins, &d.device, PawketError::NotThisDevice);
    let care = by_device(care_ix(&owner, &d.pet, CareActionType::Feed), &next.pubkey(), &owner, ix::CareByDevice::DISCRIMINATOR);
    ok(env.send(&[care], &d.sponsor, &[&next]));

    ok(env.send(&[unlink_ix(&owner, &owner, &next.pubkey(), false)], &d.sponsor, &[&d.owner]));
    all_refused(&mut env, &d, &twins, &next, PawketError::NotThisDevice);

    assert!(!env.exists(&pet_pda(&owner, "Biscuit")) && !env.exists(&guild_pda("tofu-club")) && !env.exists(&member_pda(&pet_pda(&owner, "Tofu"))));
    assert_eq!(env.wallet(&owner).actions, 2);
}
