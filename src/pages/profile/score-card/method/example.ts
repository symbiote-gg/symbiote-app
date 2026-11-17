import type { ScorePillarId } from "@/api/stats";

// One made-up Anduin game, on the real Healer weights, so every step of the
// walkthrough agrees with the next. Team role is healing 3 at 0.62 and
// protection 1 at 0.5.
export const EXAMPLE = {
    healing: 52_800,
    minutes: 22,
    healingBeat: 0.62,
    pillars: [
        { pillar: "fighting", beat: 0.48 },
        { pillar: "survival", beat: 0.55 },
        { pillar: "teamRole", beat: 0.59 },
        { pillar: "map", beat: 0.5 },
    ],
} as const;

// Largest remainder, like the backend's round_to_total, so the parts add to
// the rounded whole.
function roundToTotal(exact: number[], total: number) {
    const rounded = exact.map(Math.floor);
    const missing = total - rounded.reduce((sum, value) => sum + value, 0);

    exact
        .map((value, index) => ({ index, rest: value - Math.floor(value) }))
        .sort((a, b) => b.rest - a.rest)
        .slice(0, missing)
        .forEach(({ index }) => {
            rounded[index] += 1;
        });

    return rounded;
}

// Each pillar's max, as `PILLAR_SHARES` in src-tauri/src/profile_score.rs.
export const PILLAR_MAXES: Record<ScorePillarId, number> = {
    fighting: 30,
    survival: 15,
    teamRole: 30,
    map: 25,
};

// Each pillar's points: its max scaled by the share beaten.
export function examplePoints(maxes: number[]) {
    const exact = EXAMPLE.pillars.map(({ beat }, index) => maxes[index] * beat);
    const total = Math.round(exact.reduce((sum, value) => sum + value, 0));

    return roundToTotal(exact, total);
}
