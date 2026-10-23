// The heroes-data2 repo. Only its releases carry the full JSON files: the
// version folders are mostly JSON patches against an older version.
import {
    awardIcon,
    awardId,
    markup,
    plain,
    role,
    talentFacts,
} from "../facts.mjs";
import { fetchOk, sha256, untarJson } from "../io.mjs";

// Replays carry the map name in the language of the recording client, so map
// names of every locale resolve to the same map.
const LOCALES = [
    "dede",
    "enus",
    "eses",
    "esmx",
    "frfr",
    "itit",
    "kokr",
    "plpl",
    "ptbr",
    "ruru",
    "zhcn",
    "zhtw",
];

export async function load({ repo, version, locale, sha256: expected }) {
    const build = version.split(".").at(-1);
    const url =
        `https://github.com/${repo}/releases/download/v${version}/` +
        `heroes-data-no-maps-${version}.tar.gz`;
    const archive = Buffer.from(await (await fetchOk(url)).arrayBuffer());

    const hash = sha256(archive);
    if (hash !== expected) {
        throw new Error(`sha256 mismatch for ${url}: ${hash}`);
    }

    const [
        { items: heroes },
        { items: awards },
        { items: maps },
        { items: strings },
        ...mapStrings
    ] = await untarJson(archive, [
        `herodata_${build}.json`,
        `matchawarddata_${build}.json`,
        `mapdata_${build}.json`,
        `gamestrings_${build}_${locale}.json`,
        ...LOCALES.map((l) => `gamestrings_mapdata_${build}_${l}.json`),
    ]);
    const mapNames = Object.fromEntries(
        LOCALES.map((l, i) => [l, mapStrings[i].items.map.name]),
    );

    return {
        heroes: Object.entries(heroes).map(([id, hero]) => ({
            id,
            name: strings.hero.name[id] ?? id,
            role: role(id, strings.hero.expandedRole[id]),
            portrait: hero.portraits?.target ?? null,
        })),
        talents: talentFacts(heroes, (talent) => ({
            id: talent.talentId,
            name: strings.talent.name[talent.linkId] ?? talent.talentId,
            description: markup(strings.talent.fullText[talent.linkId]),
            icon: talent.icon ?? null,
        })),
        awards: Object.entries(awards).map(([key, award]) => ({
            id: awardId(award),
            name: plain(strings.matchAward.scoreScreenName[key]) ?? key,
            description: plain(strings.matchAward.scoreScreenDescription[key]),
            icon: awardIcon(award),
        })),
        maps: Object.entries(maps).map(([key, map]) => ({
            id: map.normalizedId,
            name: mapNames[locale][key] ?? key,
            loading_screen: map.loadingScreenImage ?? null,
            names: [
                ...new Set([
                    key,
                    ...LOCALES.map((l) => mapNames[l][key]).filter(Boolean),
                ]),
            ],
        })),
    };
}
