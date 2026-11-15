// One made-up Anduin game, on the real Healer weights, so every step of the
// walkthrough agrees with the next.
export const EXAMPLE = {
    healing: 52_800,
    minutes: 22,
    stats: [
        { stat: "healing", weight: 3, beat: 0.62 },
        { stat: "deathShare", weight: 2, beat: 0.55 },
        { stat: "killParticipation", weight: 1, beat: 0.48 },
        { stat: "protection", weight: 1, beat: 0.5 },
    ],
} as const;

const TOTAL_WEIGHT = EXAMPLE.stats.reduce((sum, { weight }) => sum + weight, 0);

// Largest remainder, like the backend's round_to_total, so the rows add to 100.
export function weightPercents() {
    const exact = EXAMPLE.stats.map(
        ({ weight }) => (weight * 100) / TOTAL_WEIGHT,
    );
    const percents = exact.map(Math.floor);
    const missing = 100 - percents.reduce((sum, value) => sum + value, 0);

    exact
        .map((value, index) => ({ index, rest: value - Math.floor(value) }))
        .sort((a, b) => b.rest - a.rest)
        .slice(0, missing)
        .forEach(({ index }) => {
            percents[index] += 1;
        });

    return percents;
}
