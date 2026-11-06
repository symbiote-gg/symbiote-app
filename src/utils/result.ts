export type MatchResult = "win" | "loss" | "unknown";

export const matchResult = (win: boolean | null): MatchResult =>
    win === null ? "unknown" : win ? "win" : "loss";
