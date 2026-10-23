use heck::ToSnakeCase;
use serde::{Deserialize, Serialize};

const BUNDLED_TALENTS_FACTS: &str = include_str!("../../data/talents.json");

#[derive(Debug, Deserialize, Serialize)]
pub struct TalentFact {
    #[serde(rename = "id")]
    pub slug: String,
    #[serde(rename = "hero_id")]
    pub hero_slug: String,
    pub tier: i64,
    pub name: String,
    pub description: Option<String>,
    pub icon: Option<String>,
}

impl TalentFact {
    pub fn bundled() -> serde_json::Result<Vec<TalentFact>> {
        let mut facts: Vec<TalentFact> = serde_json::from_str(BUNDLED_TALENTS_FACTS)?;
        for fact in &mut facts {
            fact.slug = fact.slug.to_snake_case();
        }
        Ok(facts)
    }
}
