import classNames from "classnames";
import { UserRound } from "lucide-react";
import type { MouseEvent } from "react";
import { useTranslations } from "use-intl";

import { FILTERS, FILTER_GLYPHS, type Filter } from "@/utils/timeline/filters";
import { GlyphIcon } from "../glyphs";

import styles from "./styles.module.css";

interface FiltersProps {
    hidden: Set<Filter>;
    disabled: Set<Filter>;
    counts: Record<Filter, number>;
    me: boolean;
    meCount: number;
    onToggle: (filter: Filter) => void;
    onToggleMe: () => void;
}

export function Filters({
    hidden,
    disabled,
    counts,
    me,
    meCount,
    onToggle,
    onToggleMe,
}: FiltersProps) {
    const t = useTranslations("replay.timeline.filter");

    const onClick = (e: MouseEvent<HTMLButtonElement>) =>
        onToggle(e.currentTarget.value as Filter);

    return (
        <div role="group" aria-label={t("label")} className={styles.filters}>
            <button
                type="button"
                aria-pressed={me}
                className={classNames(styles.chip, styles.chipMe, {
                    [styles.chipOn]: me,
                    [styles.chipOff]: !me,
                })}
                onClick={onToggleMe}
            >
                <UserRound className={styles.chipIcon} aria-hidden />
                {t("me")}
                <span className={styles.chipCount}>{meCount}</span>
            </button>
            <span className={styles.filterDivider} aria-hidden />
            {FILTERS.map((filter) => {
                const off = disabled.has(filter);
                const on = !off && !hidden.has(filter);
                return (
                    <button
                        key={filter}
                        type="button"
                        value={filter}
                        aria-pressed={on}
                        disabled={off}
                        className={classNames(styles.chip, {
                            [styles.chipOn]: on,
                            [styles.chipOff]: !off && !on,
                        })}
                        onClick={onClick}
                    >
                        <GlyphIcon
                            glyph={FILTER_GLYPHS[filter]}
                            className={styles.chipIcon}
                        />
                        {t(filter)}
                        {!off && (
                            <span className={styles.chipCount}>
                                {counts[filter]}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
