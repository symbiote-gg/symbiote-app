import { Award as AwardIcon } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "use-intl";

import type { AwardCount } from "@/api/heroes";
import { GameIcon } from "@/components";
import { useFormatStat } from "@/hooks/useFormatStat";
import { Card, CardHeader, EmptyState, Meter, Tooltip, Typography } from "@/ui";

import styles from "./styles.module.css";

const SHOWN_AWARDS = 6;

export interface AwardsProps {
    awards: AwardCount[];
    games: number;
}

export function Awards({ awards, games }: AwardsProps) {
    const t = useTranslations("hero.awards");
    const [expanded, setExpanded] = useState(false);

    const mvps = awards.find((award) => award.type === "mvp")?.count ?? 0;
    const most = Math.max(1, ...awards.map((award) => award.count));
    const shown = expanded ? awards : awards.slice(0, SHOWN_AWARDS);
    const hidden = awards.length - shown.length;

    const onToggle = () => setExpanded(!expanded);

    return (
        <Card>
            <CardHeader
                size="sm"
                icon={AwardIcon}
                title={t("title")}
                subtitle={
                    mvps > 0
                        ? t("mvpEvery", { count: Math.round(games / mvps) })
                        : undefined
                }
            />
            {awards.length === 0 ? (
                <EmptyState>{t("empty")}</EmptyState>
            ) : (
                <div className={styles.body}>
                    <ul className={styles.list}>
                        {shown.map((award) => (
                            <Row
                                key={award.type}
                                award={award}
                                games={games}
                                most={most}
                            />
                        ))}
                    </ul>
                    {awards.length > SHOWN_AWARDS && (
                        <button
                            type="button"
                            className={styles.toggle}
                            onClick={onToggle}
                        >
                            {expanded
                                ? t("fewer")
                                : t("more", { count: hidden })}
                        </button>
                    )}
                </div>
            )}
        </Card>
    );
}

interface RowProps {
    award: AwardCount;
    games: number;
    most: number;
}

function Row({ award, games, most }: RowProps) {
    const { percent } = useFormatStat();

    const name = award.name ?? award.type;
    const icon = (
        <GameIcon
            category="matchawards"
            icon={award.icon}
            label={name}
            className={styles.icon}
        />
    );

    return (
        <li className={styles.row}>
            {award.description ? (
                <Tooltip content={name} description={award.description}>
                    {icon}
                </Tooltip>
            ) : (
                icon
            )}
            <Typography size="sm" weight="semibold" truncate>
                {name}
            </Typography>
            <Meter
                value={award.count / most}
                color={award.type === "mvp" ? "mvp" : "accent"}
                className={styles.meter}
            />
            <Typography size="xs" mono className={styles.count}>
                {award.count}
            </Typography>
            <Typography
                size="xs"
                variant="tertiary"
                mono
                className={styles.share}
            >
                {percent(award.count / Math.max(games, 1))}
            </Typography>
        </li>
    );
}
