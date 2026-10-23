import { useTranslations } from "use-intl";

import type { Replay } from "@/api/replays";
import { ReplayListHeader, ReplayRow } from "@/components";
import { ButtonLink, Card, CardBody, CardHeader, EmptyState } from "@/ui";

import styles from "./styles.module.css";

export interface RecentReplaysCardProps {
    replays: Replay[];
    total: number;
    loadedAt: Date;
}

export function RecentReplaysCard({
    replays,
    total,
    loadedAt,
}: RecentReplaysCardProps) {
    const t = useTranslations("home.replays");

    return (
        <Card className={styles.root}>
            <CardHeader
                title={t("title")}
                subtitle={t("subtitle", { total })}
                action={<ButtonLink href="/replays">{t("all")}</ButtonLink>}
                divided
            />
            {replays.length === 0 ? (
                <EmptyState>{t("empty")}</EmptyState>
            ) : (
                <>
                    <ReplayListHeader />
                    <CardBody>
                        {replays.map((replay) => (
                            <ReplayRow
                                key={replay.id}
                                replay={replay}
                                now={loadedAt}
                            />
                        ))}
                    </CardBody>
                </>
            )}
        </Card>
    );
}
