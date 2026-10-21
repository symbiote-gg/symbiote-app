// The archived heroes-data repo: localized full JSON files per version folder.
import { awardIcon, awardId, plain, role, talentFacts } from "../facts.mjs";
import { fetchOk, rawGithub } from "../io.mjs";

export async function load({ repo, commit, version, locale }) {
    const build = version.split(".").at(-1);
    const file = async (path) =>
        (
            await fetchOk(
                rawGithub({ repo, commit }, `heroesdata/${version}/${path}`),
            )
        ).json();

    const [heroes, awards, { gamestrings: strings }] = await Promise.all([
        file(`data/herodata_${build}_localized.json`),
        file(`data/matchawarddata_${build}_localized.json`),
        file(`gamestrings/gamestrings_${build}_${locale}.json`),
    ]);

    // Gamestring keys are `nameId|buttonId|abilityType|isPassive`.
    const talentNames = new Map();
    for (const [key, name] of Object.entries(strings.abiltalent.name)) {
        const [nameId, buttonId] = key.split("|");
        talentNames.set(`${nameId}|${buttonId}`, name);
    }

    return {
        heroes: Object.entries(heroes).map(([id, hero]) => ({
            id,
            name: strings.unit.name[id] ?? id,
            role: role(id, strings.unit.expandedrole[id]),
            portrait: hero.portraits?.target ?? null,
        })),
        talents: talentFacts(heroes, (talent) => ({
            id: talent.nameId,
            name:
                talentNames.get(`${talent.nameId}|${talent.buttonId}`) ??
                talent.nameId,
            icon: talent.icon ?? null,
        })),
        awards: Object.entries(awards).map(([key, award]) => ({
            id: awardId(award),
            name: plain(strings.award.name[key]) ?? key,
            description: plain(strings.award.description[key]),
            icon: awardIcon(award),
        })),
        // Map data is only in heroes-data2.
        maps: [],
    };
}
