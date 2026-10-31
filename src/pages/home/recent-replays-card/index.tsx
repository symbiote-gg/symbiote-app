import { Clapperboard } from "lucide-react";
import { useTranslations } from "use-intl";

import { ReplayListHeader, ReplayRow } from "@/components";
import { useRecentReplays } from "@/hooks/useRecentReplays";
import {
    ButtonLink,
    Card,
    CardBody,
    CardHeader,
    EmptyState,
    ErrorMessage,
} from "@/ui";

import styles from "./styles.module.css";

const RECENT_REPLAYS_LIMIT = 50;

export function RecentReplaysCard() {
    const t = useTranslations("home.replays");
    const { data, error, dataUpdatedAt } =
        useRecentReplays(RECENT_REPLAYS_LIMIT);

    return (
        <Card className={styles.root}>
            <CardHeader
                icon={Clapperboard}
                size="sm"
                title={t("title")}
                subtitle={t("subtitle", { count: RECENT_REPLAYS_LIMIT })}
                action={<ButtonLink href="/replays">{t("all")}</ButtonLink>}
                divided
            />
            {error && <ErrorMessage error={error} />}
            {data?.replays.length === 0 ? (
                <EmptyState>{t("empty")}</EmptyState>
            ) : (
                <>
                    <ReplayListHeader />
                    <CardBody>
                        {data?.replays.map((replay) => (
                            <ReplayRow
                                key={replay.id}
                                replay={replay}
                                now={new Date(dataUpdatedAt)}
                            />
                        ))}
                    </CardBody>
                </>
            )}
        </Card>
    );
}
