import classNames from "classnames";
import { Award } from "lucide-react";
import { useRef } from "react";
import { useTranslations } from "use-intl";

import type { AwardCount } from "@/api/heroes";
import { AwardIcon, AwardTooltip } from "@/components";
import { type AppearCheck, useAppear } from "@/hooks/useAppear";
import { useAppearGate } from "@/hooks/useAppearGate";
import { useFormatStat } from "@/hooks/useFormatStat";
import { Card, CardHeader, Chip, EmptyState, Typography } from "@/ui";

import styles from "./styles.module.css";

const TRACE_SHARE = 0.01;

export interface AwardsProps {
    hero: string;
    awards: AwardCount[];
    games: number;
}

export function Awards({ hero, awards, games }: AwardsProps) {
    const t = useTranslations("hero.awards");
    const appear = useAppearGate(true);

    return (
        <Card>
            <CardHeader
                size="sm"
                icon={Award}
                title={t("title")}
                subtitle={t("subtitle", { hero })}
            />
            {awards.length === 0 ? (
                <EmptyState>{t("empty")}</EmptyState>
            ) : (
                <div className={styles.body}>
                    <ul className={styles.tiles}>
                        {awards.map((award) => (
                            <Tile
                                key={award.type}
                                award={award}
                                games={games}
                                appear={appear}
                            />
                        ))}
                    </ul>
                </div>
            )}
        </Card>
    );
}

interface TileProps {
    award: AwardCount;
    games: number;
    appear: AppearCheck;
}

function Tile({ award, games, appear }: TileProps) {
    const t = useTranslations("hero.awards");
    const { percent } = useFormatStat();
    const ref = useRef<HTMLLIElement>(null);

    const name = award.name ?? award.type;
    const mvp = award.type === "mvp";

    const share = award.count / Math.max(games, 1);

    useAppear(ref, appear, "card", { sweep: styles.sweep });

    const chips = (
        <>
            <Chip size="sm" uppercase>
                {t("games", { count: award.count, games })}
            </Chip>
            <Chip size="sm" tone="primary" uppercase>
                {share < TRACE_SHARE
                    ? `<${percent(TRACE_SHARE)}`
                    : percent(share)}
            </Chip>
        </>
    );

    return (
        <li ref={ref} className={styles.award}>
            <AwardTooltip award={award} chips={chips}>
                <span
                    className={classNames(styles.tile, {
                        [styles.mvp]: mvp,
                    })}
                >
                    <AwardIcon award={award} size="md" />

                    <span className={styles.sweep} aria-hidden />

                    <span className={styles.info}>
                        <Typography as="span" mono className={styles.count}>
                            {award.count}
                        </Typography>
                        <Typography as="span" size="sm" variant="secondary">
                            {name}
                        </Typography>
                    </span>
                </span>
            </AwardTooltip>
        </li>
    );
}
