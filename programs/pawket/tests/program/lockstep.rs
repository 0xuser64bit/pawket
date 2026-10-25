use pawket::{decayed, utc_day, CareActionType, PawketError, DECAY_TENTHS_PER_HOUR};

use crate::harness::*;

const SCRIPT: &str = include_str!("../../../../src/lib/game/lockstep.txt");

fn fields(parts: &[&str]) -> Vec<(String, i64)> {
    parts
        .iter()
        .map(|part| {
            let (key, value) = part.split_once('=').expect("field=value");
            (key.to_string(), value.parse().expect("a number"))
        })
        .collect()
}

#[test]
fn replays_lockstep_txt_to_the_same_numbers() {
    let mut env = Env::new();
    let owner = env.player();
    let pet = env.adopt(&owner, "Lockstep");
    let mut checked = 0;

    for raw in SCRIPT.lines() {
        let line = raw.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let parts: Vec<&str> = line.split_whitespace().collect();
        match parts[0] {
            "expect" => {
                let state = env.pet(&pet);
                let passport = env.passport(&pet);
                let today = utc_day(env.now());
                let streak = if passport.last_active_day + 1 >= today {
                    passport.streak
                } else {
                    0
                };
                for (key, want) in fields(&parts[1..]) {
                    let got = match key.as_str() {
                        "hunger" => i64::from(state.hunger),
                        "happiness" => i64::from(state.happiness),
                        "energy" => i64::from(state.energy),
                        "hygiene" => i64::from(state.hygiene),
                        "xp" => i64::from(state.xp),
                        "level" => i64::from(state.level),
                        "streak" => i64::from(streak),
                        "plays" => i64::from(passport.plays),
                        other => panic!("unknown field {other}"),
                    };
                    assert_eq!(got, want, "{key} at `{line}`");
                }
                checked += 1;
            }
            "project" => {
                let when = T0 + parts[1].parse::<i64>().unwrap();
                let state = env.pet(&pet);
                let elapsed = when - state.stats_updated_at;
                let [hunger, happiness, energy, hygiene] = DECAY_TENTHS_PER_HOUR;
                for (key, want) in fields(&parts[2..]) {
                    let got = match key.as_str() {
                        "hunger" => decayed(state.hunger, hunger, elapsed),
                        "happiness" => decayed(state.happiness, happiness, elapsed),
                        "energy" => decayed(state.energy, energy, elapsed),
                        "hygiene" => decayed(state.hygiene, hygiene, elapsed),
                        other => panic!("unknown field {other}"),
                    };
                    assert_eq!(i64::from(got), want, "{key} at `{line}`");
                }
                checked += 1;
            }
            seconds => {
                env.set_time(T0 + seconds.parse::<i64>().unwrap());
                let result = match parts[1] {
                    "round" => env.round(&owner, &pet),
                    act => {
                        let action = match act {
                            "feed" => CareActionType::Feed,
                            "play" => CareActionType::Play,
                            "groom" => CareActionType::Groom,
                            "rest" => CareActionType::Rest,
                            other => panic!("unknown act {other}"),
                        };
                        env.care(&owner, &pet, action)
                    }
                };
                if parts.get(2) == Some(&"cooldown") {
                    expect_pawket(&result, PawketError::CareCooldownActive);
                } else {
                    ok(result);
                }
            }
        }
    }
    assert!(checked >= 7, "the script checked only {checked} lines");
}
