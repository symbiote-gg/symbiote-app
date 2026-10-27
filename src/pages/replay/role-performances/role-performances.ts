import type { HeroRole, ReplayPlayerDetail } from "@/api/replays";

export type RoleStat =
    | "heroDamage"
    | "siegeDamage"
    | "healing"
    | "damageTaken"
    | "xp"
    | "hardCc"
    | "takedowns"
    | "deaths";

export const ROLE_ORDER: readonly HeroRole[] = [
    "tank",
    "bruiser",
    "healer",
    "ranged_assassin",
    "melee_assassin",
    "support",
];

export const ROLE_STATS: Record<HeroRole, readonly RoleStat[]> = {
    tank: ["damageTaken", "hardCc", "deaths"],
    bruiser: ["siegeDamage", "damageTaken", "xp"],
    healer: ["healing", "deaths", "takedowns"],
    ranged_assassin: ["heroDamage", "takedowns", "deaths"],
    melee_assassin: ["heroDamage", "takedowns", "deaths"],
    support: ["xp", "takedowns", "deaths"],
};

export const LOWER_IS_BETTER: ReadonlySet<RoleStat> = new Set(["deaths"]);

export type Side = "ally" | "enemy";

export type Verdict = Side | "even";

export interface StatComparison {
    stat: RoleStat;
    /** Per hero average, null when the side has no hero or none has the stat. */
    ally: number | null;
    enemy: number | null;
    /** Null on a tie or when a side has nothing to compare. */
    better: Side | null;
}

export interface RoleComparison {
    role: HeroRole;
    ally: ReplayPlayerDetail[];
    enemy: ReplayPlayerDetail[];
    stats: StatComparison[];
}

const average = (players: ReplayPlayerDetail[], stat: RoleStat) => {
    const values = players
        .map((p) => p[stat])
        .filter((value) => value !== null);
    if (values.length === 0) return null;

    return values.reduce((total, value) => total + value, 0) / values.length;
};

const compareStat = (
    stat: RoleStat,
    ally: ReplayPlayerDetail[],
    enemy: ReplayPlayerDetail[],
): StatComparison => {
    const allyValue = average(ally, stat);
    const enemyValue = average(enemy, stat);

    let better: Side | null = null;
    if (allyValue !== null && enemyValue !== null && allyValue !== enemyValue) {
        const allyHigher = allyValue > enemyValue;
        better = allyHigher !== LOWER_IS_BETTER.has(stat) ? "ally" : "enemy";
    }

    return { stat, ally: allyValue, enemy: enemyValue, better };
};

export const isShared = ({ ally, enemy }: RoleComparison) =>
    ally.length > 0 && enemy.length > 0;

/**
 * Each role either team played, its heroes compared on the stats that matter
 * for it: the shared ones first, the owner's leading, then the ones only one
 * team had. Heroes with no known role are left out.
 */
export const compareRoles = (
    players: ReplayPlayerDetail[],
    allyTeam: number,
    ownerRole: HeroRole | null,
): RoleComparison[] => {
    const order = ownerRole
        ? [ownerRole, ...ROLE_ORDER.filter((role) => role !== ownerRole)]
        : ROLE_ORDER;

    return order
        .map((role) => {
            const inRole = players.filter((p) => p.heroRole === role);
            const ally = inRole.filter((p) => p.team === allyTeam);
            const enemy = inRole.filter((p) => p.team !== allyTeam);
            const stats = ROLE_STATS[role].map((stat) =>
                compareStat(stat, ally, enemy),
            );

            return { role, ally, enemy, stats };
        })
        .filter(({ ally, enemy }) => ally.length > 0 || enemy.length > 0)
        .sort((a, b) => Number(isShared(b)) - Number(isShared(a)));
};

/**
 * The side ahead on more of the role's stats, null when the role isn't shared
 * or no stat has a value on both sides.
 */
export const verdictOf = (comparison: RoleComparison): Verdict | null => {
    if (!isShared(comparison)) return null;

    const { stats } = comparison;
    const comparable = stats.some(
        (stat) => stat.ally !== null && stat.enemy !== null,
    );
    if (!comparable) return null;

    const allyWins = stats.filter(({ better }) => better === "ally").length;
    const enemyWins = stats.filter(({ better }) => better === "enemy").length;
    if (allyWins === enemyWins) return "even";

    return allyWins > enemyWins ? "ally" : "enemy";
};

/**
 * Bar lengths as fractions of each half track: the larger value fills it. For
 * stats where lower is better the lengths swap, so the longer bar is always
 * the better side.
 */
export const barLengths = ({ stat, ally, enemy }: StatComparison) => {
    const max = Math.max(ally ?? 0, enemy ?? 0);
    if (max === 0) return { ally: 0, enemy: 0 };

    if (ally === null || enemy === null) {
        return { ally: ally === null ? 0 : 1, enemy: enemy === null ? 0 : 1 };
    }

    if (LOWER_IS_BETTER.has(stat)) {
        return { ally: enemy / max, enemy: ally / max };
    }

    return { ally: ally / max, enemy: enemy / max };
};
