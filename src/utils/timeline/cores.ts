/**
 * Each map's cores in map units, team 0's (on the left) first. Read off the
 * renders, so good to a unit or two. Haunted Mines' are on its surface.
 */
const CORES: Record<string, [number, number][]> = {
    alterac_pass: [
        [40.9, 103.3],
        [207, 111.2],
    ],
    battlefield_of_eternity: [
        [47.9, 100],
        [200.8, 107.5],
    ],
    blackhearts_bay: [
        [44.7, 104.4],
        [209.3, 104.4],
    ],
    braxis_holdout: [
        [40.3, 103.7],
        [206.5, 113.3],
    ],
    cursed_hollow: [
        [42.5, 102.7],
        [204.9, 112.5],
    ],
    dragon_shire: [
        [46, 92.5],
        [202.2, 92.5],
    ],
    garden_of_terror: [
        [42.5, 103.8],
        [204.5, 111.4],
    ],
    hanamura_temple: [
        [46, 129.2],
        [210.5, 128.4],
    ],
    haunted_mines: [
        [47.5, 183.7],
        [208.6, 184.1],
    ],
    infernal_shrines: [
        [39.2, 93.4],
        [209.3, 93.4],
    ],
    sky_temple: [
        [45.5, 115.2],
        [203, 115.2],
    ],
    tomb_of_the_spider_queen: [
        [45.1, 116.4],
        [201.9, 116.4],
    ],
    towers_of_doom: [
        [45.5, 95.4],
        [201.4, 94.1],
    ],
    volskaya_foundry: [
        [40.8, 95.6],
        [207.5, 95.6],
    ],
    warhead_junction: [
        [44, 124],
        [204, 124],
    ],
};

/** A map's cores, each with its team, or none for maps without a reading. */
export const coresOf = (map: string) =>
    (CORES[map] ?? []).map(([x, y], team) => ({ team, x, y }));
