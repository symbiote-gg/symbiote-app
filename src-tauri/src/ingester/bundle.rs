use std::collections::{HashMap, HashSet};
use std::path::Path;

use chrono::DateTime;
use heck::ToSnakeCase;
use hots_replay_parser::summary::{GameMode, ReplaySummary};
use serde::Serialize;
use sha2::{Digest, Sha256};

use crate::error::{Error, Result};
use crate::types::hero::Hero;
use crate::types::map::MapFact;
use crate::types::player::Player;
use crate::types::replay::{
    Mode, NewEvent, NewReplay, NewReplayBundle, NewReplayPlayer, NewTalent,
};

#[derive(Debug, Default)]
pub(super) struct SeededHeroes {
    ids_by_name: HashMap<String, String>,
    ids: HashSet<String>,
}

impl SeededHeroes {
    pub(super) fn new(ids_by_name: HashMap<String, String>) -> Self {
        let ids = ids_by_name.values().cloned().collect();
        Self { ids_by_name, ids }
    }

    /// Resolves a player's hero id: the parser's when it's a seeded one, else the seeded
    /// id matching the hero name, then the hero name itself when the hero isn't known.
    fn resolve(&self, parser_id: Option<&str>, name: &str) -> String {
        parser_id
            .filter(|id| self.ids.contains(*id))
            .or_else(|| self.ids_by_name.get(name).map(String::as_str))
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
        owner_hero_id: seeded.resolve(owner.hero_id.as_deref(), &owner.hero),
        owner_player_id: player_id(owner),
        owner_win: owner.won,
        duration: summary.duration_secs().round() as i64,
        game_loops: summary.game_loops.into(),
        gates_open_loop: summary.gates_open_loop.unwrap_or(0).into(),
        is_new,
    };

    let mut heroes = Vec::new();
    let mut players = Vec::new();
    let mut replay_players = Vec::new();
    for player in &summary.players {
        let player_id = player_id(player);
        let hero_id = seeded.resolve(player.hero_id.as_deref(), &player.hero);

        heroes.push(Hero {
            id: hero_id.clone(),
            name: player.hero.clone(),
        });
        players.push(Player {
            id: player_id.clone(),
            name: player.name.clone(),
        });
        replay_players.push(NewReplayPlayer {
            player_id,
            slot: player.player_id.into(),
            team: player.team.into(),
            hero_id,
            time_dead_secs: player.time_dead_secs,
            upvotes: player.upvotes.into(),
            xp: player.xp.map(serde_json::to_value).transpose()?,
            score: serde_json::to_value(&player.score)?,
            talents: player
                .talents
                .iter()
                .map(|talent| NewTalent {
                    tier: talent.tier.into(),
                    talent_id: talent.name.to_snake_case(),
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
    })
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

/// Returns the id a player is stored under: the toon for humans, the slot for AIs.
fn player_id(player: &hots_replay_parser::summary::Player) -> String {
    // AIs all share the same toon, so they get one id per slot instead.
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

/// Flattens the summary's timeline (deaths, levels, XP, camps, structures and map
/// events) into event rows, keyed by kind and team.
///
/// Map events use their snake_cased name as kind.
fn events(summary: &ReplaySummary) -> Result<Vec<NewEvent>> {
    fn event(
        kind: &str,
        gameloop: i64,
        team: Option<u8>,
        data: &impl Serialize,
    ) -> Result<NewEvent> {
        Ok(NewEvent {
            kind: kind.to_owned(),
            gameloop,
            team: team.map(i64::from),
            data: serde_json::to_value(data)?,
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
        )?);
    }
    for team_level in &summary.team_levels {
        events.push(event(
            "team_level",
            team_level.gameloop,
            Some(team_level.team),
            team_level,
        )?);
    }
    for xp in &summary.xp {
        events.push(event("xp", xp.gameloop, Some(xp.team), xp)?);
    }
    for camp in &summary.camps {
        events.push(event("camp_capture", camp.gameloop, camp.team, camp)?);
    }
    for structure in &summary.structures {
        events.push(event(
            "structure_death",
            structure.gameloop,
            structure.team,
            structure,
        )?);
    }
    for map_event in &summary.map_events {
        events.push(event(
            &map_event.name.to_snake_case(),
            map_event.gameloop,
            map_event.team,
            map_event,
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
    fn owner_toon_is_the_folder_holding_replays() {
        let path = Path::new("Accounts/123/2-Hero-1-456/Replays/Multiplayer/game.StormReplay");
        assert_eq!(owner_toon(path).as_deref(), Some("2-Hero-1-456"));
        assert_eq!(owner_toon(Path::new("Downloads/game.StormReplay")), None);
    }
}
