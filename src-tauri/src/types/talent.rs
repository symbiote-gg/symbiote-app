use heck::ToSnakeCase;
use serde::{Deserialize, Serialize};

const BUNDLED_TALENTS_FACTS: &str = include_str!("../../data/talents.json");

#[derive(Debug, Deserialize, Serialize)]
pub struct TalentFact {
    pub id: String,
    pub hero_id: String,
    pub tier: i64,
    pub name: String,
    pub icon: Option<String>,
}

impl TalentFact {
    pub fn bundled() -> serde_json::Result<Vec<TalentFact>> {
        let mut facts: Vec<TalentFact> = serde_json::from_str(BUNDLED_TALENTS_FACTS)?;
        for fact in &mut facts {
            fact.id = fact.id.to_snake_case();
        }
        Ok(facts)
    }
}
