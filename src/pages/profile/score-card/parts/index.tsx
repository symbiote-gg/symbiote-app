import classNames from "classnames";
import { ChevronDown } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslations } from "use-intl";

import type { ScorePillar } from "@/api/stats";
import { useFormatStat } from "@/hooks/useFormatStat";
import { Collapse, Meter, Typography } from "@/ui";
import { pillarTone } from "../tones";

import styles from "./styles.module.css";

const richPoints = (chunks: ReactNode) => (
    <span className={styles.points} data-points>
        {chunks}
    </span>
);

const richMax = (chunks: ReactNode) => (
    <span className={styles.max}>{chunks}</span>
);

interface PartProps {
    pillar: ScorePillar;
}

function Part({ pillar }: PartProps) {
    const t = useTranslations("profile.score");
    const names = useTranslations("replay.rolePerformances.stat");
    const { percent } = useFormatStat();
    const [open, setOpen] = useState(false);

    const onToggle = () => {
        setOpen((value) => !value);
    };

    // Heaviest first: the order is the only sign of a stat's weight in its part.
    const stats = [...pillar.stats].sort((a, b) => b.max - a.max);

    return (
        <li
            className={styles.part}
            style={pillarTone(pillar.id)}
            data-pillar={pillar.id}
        >
            <button
                type="button"
                aria-expanded={open}
                className={classNames(styles.head, styles.summary)}
                onClick={onToggle}
            >
                <span className={styles.dot} />
                <Typography as="span" size="sm" weight="semibold" truncate>
                    {t(`pillar.${pillar.id}`)}
                </Typography>
                <Meter
                    value={pillar.points / pillar.max}
                    color="accent"
                    size="md"
                    className={styles.meter}
                />
                <Typography
                    as="span"
                    size="sm"
                    mono
                    noWrap
                    className={styles.value}
                >
                    {t.rich("points", {
                        points: pillar.points,
                        max: pillar.max,
                        b: richPoints,
                        of: richMax,
                    })}
                </Typography>
                <ChevronDown size={16} className={styles.chevron} />
            </button>
            <Collapse open={open}>
                <div className={styles.detail}>
                    <Typography
                        size="xs"
                        variant="tertiary"
                        className={styles.caption}
                    >
                        {t("ahead", { share: percent(pillar.percentile) })}
                    </Typography>
                    <ul className={styles.stats}>
                        {stats.map((stat) => (
                            <li key={stat.stat} className={styles.stat}>
                                <Typography
                                    as="span"
                                    size="sm"
                                    variant="secondary"
                                    noWrap
                                    className={styles.label}
                                >
                                    {names(stat.stat)}
                                </Typography>
                                <Meter
                                    value={stat.percentile}
                                    color="accent"
                                    className={styles.meter}
                                />
                                <Typography
                                    as="span"
                                    size="sm"
                                    variant="secondary"
                                    mono
                                    noWrap
                                    className={styles.value}
                                >
                                    {percent(stat.percentile)}
                                </Typography>
                            </li>
                        ))}
                    </ul>
                </div>
            </Collapse>
        </li>
    );
}

export interface PartsProps {
    pillars: ScorePillar[];
}

export function Parts({ pillars }: PartsProps) {
    return (
        <ul className={styles.root}>
            {pillars.map((pillar) => (
                <Part key={pillar.id} pillar={pillar} />
            ))}
        </ul>
    );
}
