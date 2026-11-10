import classNames from "classnames";
import { ShieldUser } from "lucide-react";
import { useTranslations } from "use-intl";
import { Link } from "wouter";

import { HeroPortrait } from "@/components";
import { useMostPlayedHeroes } from "@/hooks/useMostPlayedHeroes";
import {
    ButtonLink,
    Card,
    CardBody,
    CardHeader,
    EmptyState,
    ErrorMessage,
    Meter,
    TableHead,
    Typography,
    WinRate,
    rolling,
} from "@/ui";
import { isJudged, winRate } from "@/utils/hero-stats";

import styles from "./styles.module.css";

const TOP_HEROES = 20;

export function HeroesCard() {
    const t = useTranslations("home.heroes");
    const { data, error } = useMostPlayedHeroes(TOP_HEROES);

    return (
        <Card className={styles.root}>
            <CardHeader
                icon={ShieldUser}
                size="sm"
                title={t("title")}
                subtitle={t("played", {
                    played: data?.played ?? 0,
                    total: data?.total ?? 0,
                })}
                action={
                    <ButtonLink href="/heroes" variant="secondary">
                        {t("cta")}
                    </ButtonLink>
                }
            />
            {error && <ErrorMessage error={error} />}
            {!data || data.heroes.length === 0 ? (
                <EmptyState>{t("empty")}</EmptyState>
            ) : (
                <>
                    <TableHead
                        strip
                        className={classNames(styles.row, styles.head)}
                        columns={[
                            { key: "hero", label: t("columns.hero") },
                            {
                                key: "winRate",
                                label: t("columns.winRate"),
                                className: styles.rate,
                            },
                            {
                                key: "games",
                                label: t("columns.games"),
                                className: styles.games,
                            },
                        ]}
                    />
                    <CardBody>
                        <ul className={styles.list}>
                            {data.heroes.map((hero) => {
                                const rate = winRate(hero.wins, hero.losses);
                                const judged = isJudged(hero.wins, hero.losses);

                                return (
                                    <li key={hero.heroId}>
                                        <Link
                                            href={`/heroes/${hero.heroId}`}
                                            className={classNames(
                                                styles.row,
                                                styles.link,
                                            )}
                                        >
                                            <HeroPortrait
                                                name={hero.name}
                                                portrait={hero.portrait}
                                            />
                                            <Typography truncate>
                                                {hero.name}
                                            </Typography>
                                            <span className={styles.rate}>
                                                <Meter
                                                    value={rate ?? 0}
                                                    neutral={!judged}
                                                />
                                                <Typography
                                                    size="xs"
                                                    mono
                                                    className={styles.pct}
                                                >
                                                    <WinRate
                                                        rate={rate}
                                                        judged={judged}
                                                    />
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
                            })}
                        </ul>
                    </CardBody>
                </>
            )}
        </Card>
    );
}
