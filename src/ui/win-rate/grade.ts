export type WinRateGrade =
    "great" | "good" | "even" | "poor" | "bad" | "unjudged";

const GREAT = 0.6;
const GOOD = 0.55;
const EVEN = 0.48;
const POOR = 0.43;

export function winRateGrade(rate: number, judged = true): WinRateGrade {
    if (!judged) return "unjudged";
    if (rate >= GREAT) return "great";
    if (rate >= GOOD) return "good";
    if (rate >= EVEN) return "even";
    if (rate >= POOR) return "poor";
    return "bad";
}
