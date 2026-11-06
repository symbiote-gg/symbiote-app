export function winRate(wins: number, losses: number) {
    const decided = wins + losses;
    return decided === 0 ? null : wins / decided;
}

export const kda = (takedowns: number, deaths: number) =>
    takedowns / Math.max(deaths, 1);

const MIN_JUDGED_GAMES = 10;

export const isJudged = (wins: number, losses: number) =>
    wins + losses >= MIN_JUDGED_GAMES;

const MIN_RATED_GAMES = 5;

export const isRated = (wins: number, losses: number) =>
    wins + losses >= MIN_RATED_GAMES;
