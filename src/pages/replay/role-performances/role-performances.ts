import type {
    ReplayPlayerDetail,
    RoleHeroScore,
    RolePerformance,
} from "@/api/replays";

export type TeamSide = "ally" | "enemy";

export interface HeroScore extends RoleHeroScore {
    player: ReplayPlayerDetail;
}

export interface RoleComparison extends Omit<RolePerformance, "heroes"> {
    heroes: Record<TeamSide, HeroScore[]>;
    ally: ReplayPlayerDetail[];
    enemy: ReplayPlayerDetail[];
}

export const resolveRoles = (
    roles: RolePerformance[],
    players: ReplayPlayerDetail[],
): RoleComparison[] => {
    const byId = new Map(players.map((p) => [p.playerId, p]));

    const resolve = (heroes: RoleHeroScore[]) =>
        heroes.flatMap((hero) => {
            const player = byId.get(hero.playerId);
            return player ? [{ ...hero, player }] : [];
        });

    return roles.map((role) => {
        const heroes = {
            ally: resolve(role.heroes.ally),
            enemy: resolve(role.heroes.enemy),
        };

        return {
            ...role,
            heroes,
            ally: heroes.ally.map(({ player }) => player),
            enemy: heroes.enemy.map(({ player }) => player),
        };
    });
};

export const isShared = ({ ally, enemy }: RoleComparison) =>
    ally.length > 0 && enemy.length > 0;

export const formatScore = (score: number | null) =>
    score === null ? "-" : String(score);
