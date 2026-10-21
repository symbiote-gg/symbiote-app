use serde::Deserialize;

const BUNDLED_MAPS_FACTS: &str = include_str!("../../data/maps.json");

#[derive(Debug, Deserialize)]
pub struct MapFact {
    pub id: String,
    pub name: String,
    pub loading_screen: Option<String>,
    pub names: Vec<String>,
}

impl MapFact {
    pub fn bundled() -> serde_json::Result<Vec<MapFact>> {
        serde_json::from_str(BUNDLED_MAPS_FACTS)
    }
}
