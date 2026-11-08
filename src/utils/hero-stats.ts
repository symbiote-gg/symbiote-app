export function winRate(wins: number, losses: number) {
    const decided = wins + losses;
    return decided === 0 ? null : wins / decided;
}

export const kda = (takedowns: number, deaths: number) =>
    takedowns / Math.max(deaths, 1);

export const MIN_JUDGED_GAMES = 10;

export const isJudged = (wins: number, losses: number) =>
    wins + losses >= MIN_JUDGED_GAMES;

const MIN_RATED_GAMES = 5;

export const isRated = (wins: number, losses: number) =>
    wins + losses >= MIN_RATED_GAMES;

/** Below this share of the team's total, a stat is a stray, like a mage's healing from a rare talent. */
export const MIN_TEAM_SHARE = 0.005;
