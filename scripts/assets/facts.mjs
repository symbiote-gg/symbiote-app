const ROLES = {
    Tank: "tank",
    Bruiser: "bruiser",
    Healer: "healer",
    Support: "support",
    "Melee Assassin": "melee_assassin",
    "Ranged Assassin": "ranged_assassin",
};

// Award colors upstream are blue, red and gold; blue is the base one.
const AWARD_COLOR = "blue";

export function role(heroId, display) {
    if (display === undefined) return null;

    const slug = ROLES[display];
    if (!slug) throw new Error(`unknown role "${display}" for ${heroId}`);

    return slug;
}

// Gamestrings keep the game's markup. `<lang>` blocks list gender or plural
// variants separated by commas (e.g. `Moneybags,Moneybags`): keep the first.
export const plain = (text) =>
    text
        ?.replace(/<lang\b[^>]*>(.*?)<\/lang>/g, (_, forms) =>
            forms.split(",")[0].trim(),
        )
        .replace(/<[^>]*>/g, "") ?? null;

const level = (key) => Number(key.replace(/^level/i, ""));

export const talentFacts = (heroes, fact) =>
    Object.entries(heroes).flatMap(([heroId, hero]) =>
        Object.entries(hero.talents ?? {})
            .sort(([a], [b]) => level(a) - level(b))
            .flatMap(([, talents], index) =>
                talents.map((talent) => ({
                    hero_id: heroId,
                    tier: index + 1,
                    ...fact(talent),
                })),
            ),
    );

// Ids are the parser's award names: the game link without its
// `EndOfMatchAward` prefix and `Boolean` suffix, which doesn't always match
// the upstream key (e.g. `0Deaths` for `ZeroDeaths`).
export const awardId = (award) =>
    award.gameLink.replace(/^EndOfMatchAward/, "").replace(/Boolean$/, "");

export const awardIcon = (award) =>
    award.mvpScreenIcon?.replace("%color%", AWARD_COLOR) ?? null;

// Merges facts of several versions, oldest first: newer versions win, while
// older ones keep what was since removed from the game, so older replays
// still resolve it.
export function mergeFacts(versions) {
    const merge = (category, key) => [
        ...new Map(
            versions.flatMap((facts) =>
                facts[category].map((fact) => [key(fact), fact]),
            ),
        ).values(),
    ];

    return {
        heroes: merge("heroes", (hero) => hero.id),
        talents: merge("talents", (talent) => `${talent.hero_id}|${talent.id}`),
        awards: merge("awards", (award) => award.id),
        maps: merge("maps", (map) => map.id),
    };
}
