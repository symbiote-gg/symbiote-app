use std::collections::{HashMap, HashSet};
use std::path::Path;

use chrono::DateTime;
use heck::ToSnakeCase;
use hots_replay_parser::summary::{GameMode, ReplaySummary};
use serde::Serialize;
use serde_json::Value;
use sha2::{Digest, Sha256};

use crate::error::{Error, Result};
use crate::types::hero::Hero;
use crate::types::map::MapFact;
use crate::types::player::Player;
use crate::types::replay::{
    Mode, NewEvent, NewReplay, NewReplayBundle, NewReplayPlayer, NewTalent,
};

/// Score screen stats kept per player; the parser emits ~130, mostly unused or zero.
const SCORE_KEYS: [&str; 10] = [
    "SoloKill",
    "Deaths",
    "Assists",
    "Takedowns",
    "HeroDamage",
    "SiegeDamage",
    "Healing",
    "SelfHealing",
    "DamageTaken",
    "ExperienceContribution",
];

/// Talent tiers in a game. The parser numbers picks in order, so any extra pick would
/// fail the schema's tier check and is dropped instead.
const TALENT_TIERS: usize = 7;

/// Decimals kept on stored floats. The parser's fixed-point values carry ~12, far finer
/// than anything shown, and JSONB spends a byte on each.
const FLOAT_DECIMALS: i32 = 2;

#[derive(Debug, Default)]
pub(super) struct SeededHeroes {
    slugs_by_name: HashMap<String, String>,
    slugs: HashSet<String>,
}

impl SeededHeroes {
    pub(super) fn new(slugs_by_name: HashMap<String, String>) -> Self {
        let slugs = slugs_by_name.values().cloned().collect();
        Self {
            slugs_by_name,
            slugs,
        }
    }

    /// Resolves a player's hero slug: the parser's id when it's a seeded slug, else the
    /// seeded slug matching the hero name, then the hero name itself when the hero isn't
    /// known.
    fn resolve(&self, parser_id: Option<&str>, name: &str) -> String {
        parser_id
            .filter(|id| self.slugs.contains(*id))
            .or_else(|| self.slugs_by_name.get(name).map(String::as_str))
            .unwrap_or(name)
            .to_owned()
    }
}

#[derive(Debug, Default)]
pub(super) struct SeededMaps {
    ids_by_name: HashMap<String, String>,
}

impl SeededMaps {
    pub(super) fn new(facts: &[MapFact]) -> Self {
        let ids_by_name = facts
            .iter()
            .flat_map(|fact| {
                fact.names
                    .iter()
                    .map(|name| (name.clone(), fact.id.clone()))
            })
            .collect();
        Self { ids_by_name }
    }

    fn resolve(&self, name: &str) -> String {
        self.ids_by_name
            .get(name)
            .map_or(name, String::as_str)
            .to_owned()
    }
}

impl From<GameMode> for Mode {
    fn from(mode: GameMode) -> Self {
        match mode {
            GameMode::QuickMatch => Mode::QuickMatch,
            GameMode::VersusAi => Mode::VersusAi,
            GameMode::Brawl => Mode::Brawl,
            GameMode::UnrankedDraft => Mode::UnrankedDraft,
            GameMode::HeroLeague => Mode::HeroLeague,
            GameMode::TeamLeague => Mode::TeamLeague,
            GameMode::StormLeague => Mode::StormLeague,
            GameMode::Aram => Mode::Aram,
            GameMode::Custom => Mode::Custom,
            _ => Mode::Unknown,
        }
    }
}

/// Parses the replay at `path` and maps it into the rows to store.
///
/// The replay's owner is the account whose folder contains the file, see [`owner_toon`].
///
/// # Errors
///
/// Fails if the replay can't be parsed, the path isn't inside an account folder, the
/// owner didn't play in the game, the game seed is missing or the replay timestamp is
/// invalid.
pub(super) fn build_bundle(
    path: &Path,
    hash: String,
    is_new: bool,
    seeded: &SeededHeroes,
    maps: &SeededMaps,
) -> Result<NewReplayBundle> {
    let summary = hots_replay_parser::summarize_replay(path)?;

    let owner_toon = owner_toon(path).ok_or_else(|| {
        Error::InvalidReplay(format!(
            "no account folder in the path of {}",
            path.display()
        ))
    })?;
    let owner = summary
        .players
        .iter()
        .find(|p| p.toon == owner_toon)
        .ok_or_else(|| Error::InvalidReplay(format!("account {owner_toon} didn't play in it")))?;

    let timestamp = DateTime::from_timestamp(summary.timestamp, 0)
        .ok_or_else(|| Error::InvalidReplay(format!("invalid timestamp {}", summary.timestamp)))?;

    let replay = NewReplay {
        hash,
        path: path.to_string_lossy().into_owned(),
        game_id: game_id(
            summary.random_value,
            summary.players.iter().map(|p| p.toon.as_str()),
        )?,
        timestamp,
        mode: summary.mode.into(),
        map: maps.resolve(&summary.map),
        owner_hero_slug: seeded.resolve(owner.hero_id.as_deref(), &owner.hero),
        owner_toon: player_toon(owner),
        owner_win: owner.won,
        duration: summary.duration_secs().round() as i64,
        game_loops: summary.game_loops.into(),
        gates_open_loop: summary.gates_open_loop.unwrap_or(0).into(),
        is_new,
        ingest_version: super::INGEST_VERSION,
    };

    let mut heroes = Vec::new();
    let mut players = Vec::new();
    let mut replay_players = Vec::new();
    for player in &summary.players {
        let toon = player_toon(player);
        let hero_slug = seeded.resolve(player.hero_id.as_deref(), &player.hero);

        heroes.push(Hero {
            slug: hero_slug.clone(),
            name: player.hero.clone(),
        });
        players.push(Player {
            toon: toon.clone(),
            name: player.name.clone(),
            account_level: player.account_level.map(i64::from),
        });
        replay_players.push(NewReplayPlayer {
            toon,
            slot: player.player_id.into(),
            team: player.team.into(),
            hero_slug,
            time_dead_secs: player.time_dead_secs,
            time_on_fire_secs: player.time_on_fire_secs,
            upvotes: player.upvotes.into(),
            party: player.party.map(i64::from),
            xp: player
                .xp
                .map(serde_json::to_value)
                .transpose()?
                .map(round_floats),
            score: score(&player.score),
            talents: player
                .talents
                .iter()
                .take(TALENT_TIERS)
                .map(|talent| NewTalent {
                    tier: talent.tier.into(),
                    slug: talent.name.to_snake_case(),
                    gameloop: talent.gameloop,
                })
                .collect(),
            awards: player
                .awards
                .iter()
                .map(|award| award.to_snake_case())
                .collect(),
        });
    }

    Ok(NewReplayBundle {
        replay,
        heroes,
        players,
        replay_players,
        events: events(&summary)?,
        owner_party: party_toons(
            owner.party,
            summary.players.iter().map(|p| (p.party, player_toon(p))),
        ),
        refreshes: None,
    })
}

/// Returns the toons of the players in premade `party`, or none for a solo player.
fn party_toons(
    party: Option<u8>,
    players: impl IntoIterator<Item = (Option<u8>, String)>,
) -> Vec<String> {
    let Some(party) = party else {
        return Vec::new();
    };
    players
        .into_iter()
        .filter(|(p, _)| *p == Some(party))
        .map(|(_, toon)| toon)
        .collect()
}

/// Fingerprints the game a replay was recorded in, from its random seed and its players.
///
/// Every file of a game shares it: the seed is drawn once per game, so the files a
/// reconnect splits a game into, or the replays of two players, all hash the same.
fn game_id<'a>(seed: Option<u32>, toons: impl IntoIterator<Item = &'a str>) -> Result<String> {
    let seed =
        seed.ok_or_else(|| Error::InvalidReplay("no game seed in the init data".to_owned()))?;

    let mut toons: Vec<&str> = toons.into_iter().collect();
    toons.sort_unstable();

    Ok(format!(
        "{:x}",
        Sha256::digest(format!("{seed}:{}", toons.join(",")))
    ))
}

/// Returns the toon a player is stored under: their own for humans, one per slot for AIs.
fn player_toon(player: &hots_replay_parser::summary::Player) -> String {
    // AIs all share the same toon, so they get one per slot instead.
    if player.is_ai {
        format!("ai-{}", player.player_id)
    } else {
        player.toon.clone()
    }
}

/// Extracts the toon of the account that owns a replay from its path, i.e. the
/// folder holding the `Replays` folder (`Accounts/<id>/<toon>/Replays/...`).
fn owner_toon(path: &Path) -> Option<String> {
    path.ancestors()
        .find(|dir| dir.file_name().is_some_and(|name| name == "Replays"))?
        .parent()?
        .file_name()
        .map(|name| name.to_string_lossy().into_owned())
}

fn score<'a>(score: impl IntoIterator<Item = (&'a String, &'a i64)>) -> serde_json::Value {
    score
        .into_iter()
        .filter(|(key, _)| SCORE_KEYS.contains(&key.as_str()))
        .map(|(key, value)| (key.clone(), (*value).into()))
        .collect::<serde_json::Map<_, _>>()
        .into()
}

/// Rounds every float in `value` to [`FLOAT_DECIMALS`], turning the ones that come out
/// whole into ints, e.g. `1760.0` into `1760`.
fn round_floats(value: Value) -> Value {
    match value {
        Value::Number(number) if number.is_f64() => {
            let scale = 10f64.powi(FLOAT_DECIMALS);
            let rounded = (number.as_f64().unwrap_or_default() * scale).round() / scale;
            if rounded.fract() == 0.0 {
                (rounded as i64).into()
            } else {
                rounded.into()
            }
        }
        Value::Array(items) => items.into_iter().map(round_floats).collect(),
        Value::Object(fields) => Value::Object(
            fields
                .into_iter()
                .map(|(key, value)| (key, round_floats(value)))
                .collect(),
        ),
        other => other,
    }
}

/// Removes the key at JSON `pointer` from `value`, if it's there.
fn remove(value: &mut Value, pointer: &str) {
    let (parent, key) = pointer.rsplit_once('/').unwrap_or(("", pointer));
    if let Some(object) = value.pointer_mut(parent).and_then(Value::as_object_mut) {
        object.remove(key);
    }
}

/// Flattens the summary's timeline (deaths, levels, XP, camps, structures and map
/// events) into event rows, keyed by kind and team.
///
/// Map events use their snake_cased name as kind.
fn events(summary: &ReplaySummary) -> Result<Vec<NewEvent>> {
    /// `strip` lists, as JSON pointers, the keys of `data` left out besides its
    /// gameloop and team, which have their own columns.
    fn event(
        kind: &str,
        gameloop: i64,
        team: Option<u8>,
        data: &impl Serialize,
        strip: &[&str],
    ) -> Result<NewEvent> {
        let mut data = serde_json::to_value(data)?;
        for pointer in ["/gameloop", "/team"].iter().chain(strip) {
            remove(&mut data, pointer);
        }
        Ok(NewEvent {
            kind: kind.to_owned(),
            gameloop,
            team: team.map(i64::from),
            data: round_floats(data),
        })
    }

    let team_of = |player_id: u8| {
        summary
            .players
            .iter()
            .find(|p| p.player_id == player_id)
            .map(|p| p.team)
    };

    let mut events = Vec::new();
    for death in &summary.deaths {
        events.push(event(
            "death",
            death.gameloop,
            team_of(death.victim),
            death,
            &[],
        )?);
    }
    for team_level in &summary.team_levels {
        events.push(event(
            "team_level",
            team_level.gameloop,
            Some(team_level.team),
            team_level,
            &[],
        )?);
    }
    for xp in &summary.xp {
        events.push(event(
            "xp",
            xp.gameloop,
            Some(xp.team),
            xp,
            &["/game_time"],
        )?);
    }
    for camp in &summary.camps {
        events.push(event("camp_capture", camp.gameloop, camp.team, camp, &[])?);
    }
    for structure in &summary.structures {
        events.push(event(
            "structure_death",
            structure.gameloop,
            structure.team,
            structure,
            &[],
        )?);
    }
    for map_event in &summary.map_events {
        events.push(event(
            &map_event.name.to_snake_case(),
            map_event.gameloop,
            map_event.team,
            map_event,
            // Kept as the kind, and timed by the gameloop.
            &["/name", "/fixed/GameTime"],
        )?);
    }
    Ok(events)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn seeded() -> SeededHeroes {
        SeededHeroes::new(HashMap::from([("Li-Ming".to_owned(), "Wizard".to_owned())]))
    }

    #[test]
    fn resolve_keeps_a_seeded_parser_id() {
        assert_eq!(seeded().resolve(Some("Wizard"), "Whatever"), "Wizard");
    }

    #[test]
    fn resolve_falls_back_to_the_seeded_name_then_the_name() {
        assert_eq!(seeded().resolve(Some("HeroWizard"), "Li-Ming"), "Wizard");
        assert_eq!(seeded().resolve(None, "Li-Ming"), "Wizard");
        assert_eq!(seeded().resolve(None, "New Hero"), "New Hero");
    }

    #[test]
    fn resolve_maps_by_name_in_any_locale() {
        let maps = SeededMaps::new(&[MapFact {
            id: "cursed_hollow".to_owned(),
            name: "Cursed Hollow".to_owned(),
            loading_screen: None,
            names: vec!["Cursed Hollow".to_owned(), "Verfluchtes Tal".to_owned()],
        }]);
        assert_eq!(maps.resolve("Cursed Hollow"), "cursed_hollow");
        assert_eq!(maps.resolve("Verfluchtes Tal"), "cursed_hollow");
        assert_eq!(maps.resolve("New Map"), "New Map");
    }

    #[test]
    fn game_id_ignores_player_order() {
        let a = game_id(Some(42), ["2-Hero-1-1", "2-Hero-1-2"]).unwrap();
        let b = game_id(Some(42), ["2-Hero-1-2", "2-Hero-1-1"]).unwrap();
        assert_eq!(a, b);
        assert_ne!(a, game_id(Some(43), ["2-Hero-1-1", "2-Hero-1-2"]).unwrap());
    }

    #[test]
    fn game_id_needs_a_seed() {
        assert!(game_id(None, ["2-Hero-1-1"]).is_err());
    }

    #[test]
    fn party_toons_keeps_only_the_same_party() {
        let players = || {
            [
                (Some(1), "a".to_owned()),
                (Some(2), "b".to_owned()),
                (None, "c".to_owned()),
                (Some(1), "d".to_owned()),
            ]
        };
        assert_eq!(party_toons(Some(1), players()), ["a", "d"]);
        assert!(party_toons(None, players()).is_empty());
    }

    #[test]
    fn owner_toon_is_the_folder_holding_replays() {
        let path = Path::new("Accounts/123/2-Hero-1-456/Replays/Multiplayer/game.StormReplay");
        assert_eq!(owner_toon(path).as_deref(), Some("2-Hero-1-456"));
        assert_eq!(owner_toon(Path::new("Downloads/game.StormReplay")), None);
    }

    #[test]
    fn round_floats_rounds_nested_floats_and_keeps_ints() {
        let raw = serde_json::json!({
            "x": 118.27197265625,
            "xp": { "minion": 1760.0, "hero": 913.4033203125 },
            "killers": [6, 7],
            "level": 3,
        });
        assert_eq!(
            round_floats(raw),
            serde_json::json!({
                "x": 118.27,
                "xp": { "minion": 1760, "hero": 913.4 },
                "killers": [6, 7],
                "level": 3,
            })
        );
    }

    #[test]
    fn remove_takes_out_top_level_and_nested_keys() {
        let mut value = serde_json::json!({
            "name": "Immortal Defeated",
            "fixed": { "GameTime": 328.125, "Immortal Power Percent": 25.6 },
        });
        remove(&mut value, "/name");
        remove(&mut value, "/fixed/GameTime");
        remove(&mut value, "/missing/key");
        assert_eq!(
            value,
            serde_json::json!({ "fixed": { "Immortal Power Percent": 25.6 } })
        );
    }

    #[test]
    fn score_keeps_only_the_read_stats() {
        let raw = [
            ("HeroDamage".to_owned(), 85611),
            ("EndOfMatchAwardMVPBoolean".to_owned(), 1),
            ("Deaths".to_owned(), 0),
        ];
        assert_eq!(
            score(raw.iter().map(|(key, value)| (key, value))),
            serde_json::json!({ "HeroDamage": 85611, "Deaths": 0 })
        );
    }
}
