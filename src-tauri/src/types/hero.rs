use serde::{Deserialize, Serialize};

const BUNDLED_HEROES_FACTS: &str = include_str!("../../data/heroes.json");

#[derive(Debug)]
pub struct Hero {
    pub slug: String,
    pub name: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize, sqlx::Type)]
#[sqlx(type_name = "TEXT", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum HeroRole {
    Tank,
    Bruiser,
    Healer,
    Support,
    MeleeAssassin,
    RangedAssassin,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct HeroFact {
    #[serde(rename = "id")]
    pub slug: String,
    pub name: String,
    pub role: Option<HeroRole>,
    pub portrait: Option<String>,
}

impl HeroFact {
    pub fn bundled() -> serde_json::Result<Vec<HeroFact>> {
        serde_json::from_str(BUNDLED_HEROES_FACTS)
    }
}
