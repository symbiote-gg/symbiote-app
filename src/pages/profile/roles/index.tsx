import { useQuery } from "@tanstack/react-query";
import classNames from "classnames";
import { Swords } from "lucide-react";
import { useTranslations } from "use-intl";

import { roleRecordsQuery } from "@/api/queries";
import { HERO_ROLES } from "@/api/replays";
import type { RoleRecord, ScoreScope } from "@/api/stats";
import {
    Card,
    CardHeader,
    Eyebrow,
    Meter,
    Skeleton,
    Typography,
    WinRate,
} from "@/ui";
import { isJudged, winRate } from "@/utils/hero-stats";

import styles from "./styles.module.css";

export interface RolesProps {
    scope: ScoreScope;
}

export function Roles({ scope }: RolesProps) {
    const t = useTranslations("profile.roles");
    const { data: records, error } = useQuery(roleRecordsQuery(scope));

    const header = (
        <CardHeader
            size="sm"
            icon={Swords}
            title={t("title")}
            subtitle={t("subtitle")}
        />
    );

    if (error) return null;

    if (!records) {
        return (
            <Card className={styles.root}>
                {header}
                <ul className={styles.tiles}>
                    {HERO_ROLES.map((role) => (
                        <li key={role} className={styles.tile}>
                            <Eyebrow>
                                <Skeleton className={styles.labelBar} />
                            </Eyebrow>
                            <div className={styles.figures}>
                                <Typography
                                    as="span"
                                    display
                                    className={styles.rate}
                                >
                                    <Skeleton className={styles.rateBar} />
                                </Typography>
                                <Typography as="span" size="sm">
                                    <Skeleton className={styles.gamesBar} />
                                </Typography>
                            </div>
                            <Meter value={0} neutral className={styles.meter} />
                        </li>
                    ))}
                </ul>
            </Card>
        );
    }

    if (records.every((record) => record.games === 0)) return null;

    return (
        <Card className={styles.root}>
            {header}
            <ul className={styles.tiles}>
                {records.map((record) => (
                    <RoleTile key={record.role} record={record} />
                ))}
            </ul>
        </Card>
    );
}

interface RoleTileProps {
    record: RoleRecord;
}

function RoleTile({ record }: RoleTileProps) {
    const t = useTranslations("profile.roles");
    const tRoles = useTranslations("roles");

    const rate = winRate(record.wins, record.losses);
    const judged = isJudged(record.wins, record.losses);
    const few = !judged && styles.few;

    return (
        <li className={styles.tile}>
            <Eyebrow truncate>{tRoles(record.role)}</Eyebrow>
            {record.games === 0 ? (
                <div className={classNames(styles.figures, styles.empty)}>
                    <Typography as="span" size="sm" variant="secondary" noWrap>
                        {t("notPlayed")}
                    </Typography>
                </div>
            ) : (
                <div className={classNames(styles.figures, few)}>
                    <Typography as="span" display className={styles.rate}>
                        <WinRate rate={rate} judged={judged} />
                    </Typography>
                    <Typography as="span" size="sm" variant="secondary" noWrap>
                        {t("games", { count: record.games })}
                    </Typography>
                </div>
            )}
            <Meter
                value={rate ?? 0}
                neutral={!judged}
                className={classNames(styles.meter, few)}
            />
        </li>
    );
}
