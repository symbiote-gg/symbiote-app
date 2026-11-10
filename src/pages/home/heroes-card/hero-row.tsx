import classNames from "classnames";
import { useRef } from "react";
import { Link } from "wouter";

import type { HeroStat } from "@/api/stats";
import { HeroPortrait } from "@/components";
import { type AppearCheck, useAppear } from "@/hooks/useAppear";
import { Meter, Typography, WinRate, rolling } from "@/ui";
import { isJudged, winRate } from "@/utils/hero-stats";

import styles from "./styles.module.css";

export interface HeroRowProps {
    hero: HeroStat;
    appear: AppearCheck;
}

export function HeroRow({ hero, appear }: HeroRowProps) {
    const ref = useRef<HTMLAnchorElement>(null);

    useAppear(ref, appear, "row");

    const rate = winRate(hero.wins, hero.losses);
    const judged = isJudged(hero.wins, hero.losses);

    return (
        <li>
            <Link
                ref={ref}
                href={`/heroes/${hero.heroId}`}
                className={classNames(styles.row, styles.link)}
            >
                <HeroPortrait name={hero.name} portrait={hero.portrait} />
                <Typography truncate>{hero.name}</Typography>
                <span className={styles.rate}>
                    <Meter value={rate ?? 0} neutral={!judged} />
                    <Typography size="xs" mono className={styles.pct}>
                        <WinRate rate={rate} judged={judged} />
                    </Typography>
                </span>
                <Typography
                    size="xs"
                    variant="tertiary"
                    mono
                    className={styles.games}
                >
                    {rolling(hero.games)}
                </Typography>
            </Link>
        </li>
    );
}
