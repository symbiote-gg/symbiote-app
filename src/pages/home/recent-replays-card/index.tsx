import { Clapperboard } from "lucide-react";
import { useMemo } from "react";
import { useTranslations } from "use-intl";

import { ReplayListHeader, ReplayRow } from "@/components";
import { useAppearGate } from "@/hooks/useAppearGate";
import { useReplays } from "@/hooks/useReplays";
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
    const { data, error } = useReplays();

    // The replays page may have loaded more pages into the shared cache.
    const replays = useMemo(
        () =>
            data?.pages
                .flatMap((page) => page.replays)
                .slice(0, RECENT_REPLAYS_LIMIT),
        [data],
    );
    const appear = useAppearGate(!!data);

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
            {replays?.length === 0 ? (
                <EmptyState>{t("empty")}</EmptyState>
            ) : (
                <>
                    <ReplayListHeader />
                    <CardBody>
                        {replays?.map((replay) => (
                            <ReplayRow
                                key={replay.id}
                                replay={replay}
                                appear={appear}
                            />
                        ))}
                    </CardBody>
                </>
            )}
        </Card>
    );
}
