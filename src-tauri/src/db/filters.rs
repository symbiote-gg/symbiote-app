//! Conditions narrowing queries over `replays_view` to the games a filter picks.

use sqlx::{QueryBuilder, Sqlite};

use crate::types::replay::ReplayFilters;

/// Appends a condition per set field of `filters` to a `WHERE` clause over
/// `replays_view`.
pub(crate) fn push_filters(query: &mut QueryBuilder<Sqlite>, filters: &ReplayFilters) {
    push_in(query, " AND mode IN (", &filters.modes, ")");
    push_in(query, " AND map IN (", &filters.maps, ")");
    push_in(query, " AND owner_hero_id IN (", &filters.heroes, ")");
    push_in(
        query,
        " AND owner_hero_id IN (SELECT id FROM heroes WHERE role IN (",
        &filters.roles,
        "))",
    );
    if let Some(win) = filters.win {
        query.push(" AND owner_win = ").push_bind(win);
    }
    if let Some(from) = filters.from {
        query.push(" AND timestamp >= ").push_bind(from.timestamp());
    }
    if let Some(to) = filters.to {
        query.push(" AND timestamp < ").push_bind(to.timestamp());
    }
}

/// Appends `values` as a comma separated list between `prefix` and `suffix`, unless there
/// are no values.
fn push_in<T>(query: &mut QueryBuilder<Sqlite>, prefix: &str, values: &[T], suffix: &str)
where
    T: Clone + for<'t> sqlx::Encode<'t, Sqlite> + sqlx::Type<Sqlite>,
{
    if values.is_empty() {
        return;
    }
    query.push(prefix);
    let mut list = query.separated(", ");
    for value in values {
        list.push_bind(value.clone());
    }
    list.push_unseparated(suffix);
}
