import classNames from "classnames";
import { useTranslations } from "use-intl";

import type { MostPlayedHeroes } from "@/api/stats";
import { HeroPortrait } from "@/components";
import {
    ButtonLink,
    Card,
    CardBody,
    CardHeader,
    EmptyState,
    Meter,
    Typography,
} from "@/ui";

import styles from "./styles.module.css";

export interface HeroesCardProps {
    heroes: MostPlayedHeroes;
}

export function HeroesCard({ heroes }: HeroesCardProps) {
    const t = useTranslations("home.heroes");

    return (
        <Card className={styles.root}>
            <CardHeader
                title={t("title")}
                subtitle={t("played", {
                    played: heroes.played,
                    total: heroes.total,
                })}
                action={
                    <ButtonLink href="/heroes" variant="secondary">
                        {t("cta")}
                    </ButtonLink>
                }
            />
            {heroes.heroes.length === 0 ? (
                <EmptyState>{t("empty")}</EmptyState>
            ) : (
                <>
                    <div className={classNames(styles.row, styles.head)}>
                        <Typography
                            size="xs"
                            variant="secondary"
                            className={styles.heading}
                        >
                            {t("columns.hero")}
                        </Typography>
                        <Typography
                            size="xs"
                            variant="secondary"
                            className={classNames(styles.heading, styles.rate)}
                        >
                            {t("columns.winRate")}
                        </Typography>
                        <Typography
                            size="xs"
                            variant="secondary"
                            className={classNames(styles.heading, styles.games)}
                        >
                            {t("columns.games")}
                        </Typography>
                    </div>
                    <CardBody>
                        <ul className={styles.list}>
                            {heroes.heroes.map((hero) => {
                                const rate = hero.wins / hero.games;
                                return (
                                    <li
                                        key={hero.heroId}
                                        className={styles.row}
                                    >
                                        <HeroPortrait
                                            name={hero.name}
                                            portrait={hero.portrait}
                                        />
                                        <Typography truncate>
                                            {hero.name}
                                        </Typography>
                                        <span className={styles.rate}>
                                            <Meter value={rate} />
                                            <Typography
                                                size="xs"
                                                variant="secondary"
                                                mono
                                                className={styles.pct}
                                            >
                                                {Math.round(rate * 100)}%
                                            </Typography>
                                        </span>
                                        <Typography
                                            size="xs"
                                            variant="secondary"
                                            mono
                                            className={styles.games}
                                        >
                                            {hero.games}
                                        </Typography>
                                    </li>
                                );
                            })}
                        </ul>
                    </CardBody>
                </>
            )}
        </Card>
    );
}
