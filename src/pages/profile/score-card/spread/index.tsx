import { useTranslations } from "use-intl";

import { Legend } from "@/ui";

import styles from "./styles.module.css";

// "single" shades every game alike, "split" shades games below and above the
// marker apart.
export type SpreadTone = "single" | "split";

type BarState = "base" | "under" | "marked" | "over";

export interface SpreadProps {
    bins: number[];
    marker: number;
    tone: SpreadTone;
}

export function Spread({ bins, marker, tone }: SpreadProps) {
    if (!bins.length) return null;

    const tallest = Math.max(...bins);
    const marked = Math.min(
        Math.floor((marker / 100) * bins.length),
        bins.length - 1,
    );

    const state = (index: number): BarState => {
        if (index === marked) return "marked";
        if (tone === "single") return "base";
        return index < marked ? "under" : "over";
    };

    return (
        <div className={styles.plot} aria-hidden>
            {bins.map((count, index) => (
                <span
                    key={index}
                    className={styles[state(index)]}
                    style={{ height: `${(count / tallest) * 100}%` }}
                />
            ))}
        </div>
    );
}

export interface SpreadLegendProps {
    tone: SpreadTone;
}

export function SpreadLegend({ tone }: SpreadLegendProps) {
    const t = useTranslations("profile.score.spread.legend");

    const shades: BarState[] =
        tone === "single" ? ["marked", "base"] : ["marked", "under", "over"];

    return (
        <Legend
            size="xs"
            items={shades.map((shade) => ({
                key: shade,
                label: t(shade),
                swatch: styles[shade],
            }))}
        />
    );
}
