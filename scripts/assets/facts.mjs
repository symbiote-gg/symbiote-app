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
const LANG = /<lang\b[^>]*>(.*?)<\/lang>/g;
const firstForm = (_, forms) => forms.split(",")[0].trim();

export const plain = (text) =>
    text?.replace(LANG, firstForm).replace(/<[^>]*>/g, "") ?? null;

const TONES = {
    ColorGray: "muted",
    TooltipSubscript: "muted",
    StandardTooltipDetails: "muted",
    TooltipQuest: "quest",
};

// Rewrites gamestrings markup to the minimal form the app renders: `<c>`/`<s>`
// color runs become `<highlight>`, `<muted>` or `<quest>`, `<n/>` breaks and
// `~~0.04~~` scaling stay, everything else (icons included) is dropped. A
// closing tag closes up to its own opening tag, so the output is well-formed.
export function markup(text) {
    if (text == null) return null;

    const open = [];
    const close = (from) =>
        open
            .splice(from)
            .reverse()
            .map(({ tone }) => `</${tone}>`)
            .join("");

    const body = text
        .replace(LANG, firstForm)
        .replace(/<(\/?)(\w+)([^>]*?)\/?>/g, (_, closing, tag, attributes) => {
            if (tag === "n") return "<n/>";
            if (tag !== "c" && tag !== "s") return "";
            if (closing) {
                const index = open.findLastIndex((run) => run.tag === tag);
                return index < 0 ? "" : close(index);
            }

            const name = /hlt-name="#?(\w+)"/.exec(attributes)?.[1];
            const tone = TONES[name] ?? "highlight";
            open.push({ tag, tone });
            return `<${tone}>`;
        });

    return body + close(0);
}

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
