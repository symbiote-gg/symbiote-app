export function winRate(wins: number, losses: number) {
    const decided = wins + losses;
    return decided === 0 ? null : wins / decided;
}

export const kda = (takedowns: number, deaths: number) =>
    takedowns / Math.max(deaths, 1);

export const MIN_JUDGED_GAMES = 5;

export const isJudged = (wins: number, losses: number) =>
    wins + losses >= MIN_JUDGED_GAMES;

/** Below this share of the team's total, a stat is a stray, like a mage's healing from a rare talent. */
export const MIN_TEAM_SHARE = 0.005;

/**
 * How far the session's games moved the win rate, in the steps it is shown in.
 * `null` when they didn't, or with no decided game before them.
 */
export function sessionRateChange(
    wins: number,
    losses: number,
    session: { wins: number; losses: number } | undefined,
) {
    if (!session || session.wins + session.losses === 0) return null;

    const now = winRate(wins, losses);
    const before = winRate(wins - session.wins, losses - session.losses);
    if (now === null || before === null) return null;

    const change = (Math.round(now * 1000) - Math.round(before * 1000)) / 1000;

    return change === 0 ? null : change;
}

/**
 * The run of same results the newest games end on, skipping undecided ones.
 * `null` with no decided game.
 */
export function resultStreak(games: { win: boolean | null }[]) {
    const decided = games.filter((game) => game.win !== null);
    if (decided.length === 0) return null;

    const win = decided[0].win === true;
    const broken = decided.findIndex((game) => game.win !== win);

    return { win, length: broken === -1 ? decided.length : broken };
}

export function averageScore(games: { score: number }[]) {
    if (games.length === 0) return null;

    const total = games.reduce((sum, game) => sum + game.score, 0);

    return Math.round(total / games.length);
}
