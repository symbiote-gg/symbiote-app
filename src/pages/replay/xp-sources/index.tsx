import classNames from "classnames";
import { Star } from "lucide-react";
import { useFormatter, useTranslations } from "use-intl";

import type { TeamSummary, XpBreakdown } from "@/api/replays";
import { Card, CardHeader, Eyebrow, TableHead, Typography } from "@/ui";
import { sideClasses } from "../side";
import { Difference } from "./difference";
import { SourceRow } from "./source-row";
import { SOURCES, lead } from "./xp-sources";

import styles from "./styles.module.css";

interface XpSourcesProps {
    ally: TeamSummary;
    enemy: TeamSummary;
}

const total = (xp: XpBreakdown) =>
    SOURCES.reduce((sum, source) => sum + xp[source], 0);

export function XpSources({ ally, enemy }: XpSourcesProps) {
    const t = useTranslations("replay.xpSources");
    const format = useFormatter();

    if (ally.xp === null || enemy.xp === null) return null;

    const allyXp = ally.xp;
    const enemyXp = enemy.xp;

    const max = Math.max(
        ...SOURCES.flatMap((source) => [allyXp[source], enemyXp[source]]),
    );

    const formatXp = (value: number, signed = false) => {
        const digits = Math.abs(value) >= 1000 ? 1 : 0;
        return format.number(value, {
            notation: "compact",
            minimumFractionDigits: digits,
            maximumFractionDigits: digits,
            signDisplay: signed ? "exceptZero" : "auto",
        });
    };

    const allyTotal = total(allyXp);
    const enemyTotal = total(enemyXp);

    return (
        <Card className={styles.root}>
            <CardHeader
                icon={Star}
                size="sm"
                title={t("title")}
                subtitle={t("subtitle")}
            />
            <div className={styles.table}>
                <TableHead
                    className={classNames(styles.row, styles.headerRow)}
                    columns={[
                        { key: "source", label: t("source") },
                        {
                            key: "ally",
                            label: t("ally"),
                            className: styles.allyValue,
                        },
                        { key: "allyBar", label: "" },
                        { key: "enemyBar", label: "" },
                        { key: "enemy", label: t("enemy") },
                        {
                            key: "difference",
                            label: t("difference"),
                            className: styles.difference,
                        },
                    ]}
                />
                {SOURCES.map((source) => (
                    <SourceRow
                        key={source}
                        source={source}
                        ally={allyXp[source]}
                        enemy={enemyXp[source]}
                        max={max}
                        formatXp={formatXp}
                    />
                ))}
                <div className={classNames(styles.row, styles.totalRow)}>
                    <Eyebrow noWrap>{t("earnedXp")}</Eyebrow>
                    <Typography
                        size="lg"
                        weight="semibold"
                        mono
                        noWrap
                        className={classNames(
                            styles.value,
                            styles.allyValue,
                            sideClasses("ally"),
                        )}
                    >
                        {formatXp(allyTotal)}
                    </Typography>
                    <span />
                    <span />
                    <Typography
                        size="lg"
                        weight="semibold"
                        mono
                        noWrap
                        className={classNames(
                            styles.value,
                            sideClasses("enemy"),
                        )}
                    >
                        {formatXp(enemyTotal)}
                    </Typography>
                    <Difference
                        ally={allyTotal}
                        enemy={enemyTotal}
                        leader={lead(allyTotal, enemyTotal, formatXp)}
                        formatXp={formatXp}
                    />
                </div>
            </div>
        </Card>
    );
}
