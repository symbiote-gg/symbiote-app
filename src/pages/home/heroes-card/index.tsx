import classNames from "classnames";
import { ShieldUser } from "lucide-react";
import { useTranslations } from "use-intl";

import { useAppearGate } from "@/hooks/useAppearGate";
import { useMostPlayedHeroes } from "@/hooks/useMostPlayedHeroes";
import {
    ButtonLink,
    Card,
    CardBody,
    CardHeader,
    EmptyState,
    ErrorMessage,
    TableHead,
} from "@/ui";
import { HeroRow } from "./hero-row";

import styles from "./styles.module.css";

const TOP_HEROES = 20;

export function HeroesCard() {
    const t = useTranslations("home.heroes");
    const { data, error } = useMostPlayedHeroes(TOP_HEROES);
    const appear = useAppearGate(!!data, { duringIngest: true });

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
                            {data.heroes.map((hero) => (
                                <HeroRow
                                    key={hero.heroId}
                                    hero={hero}
                                    appear={appear}
                                />
                            ))}
                        </ul>
                    </CardBody>
                </>
            )}
        </Card>
    );
}
