use heck::ToSnakeCase;
use serde::Deserialize;

const BUNDLED_AWARDS_FACTS: &str = include_str!("../../data/awards.json");

#[derive(Debug, Deserialize)]
pub struct AwardFact {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub icon: Option<String>,
}

impl AwardFact {
    pub fn bundled() -> serde_json::Result<Vec<AwardFact>> {
        let mut facts: Vec<AwardFact> = serde_json::from_str(BUNDLED_AWARDS_FACTS)?;
        for fact in &mut facts {
            fact.id = fact.id.to_snake_case();
        }
        Ok(facts)
    }
}
