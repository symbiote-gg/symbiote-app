import { useQueryClient } from "@tanstack/react-query";
import classNames from "classnames";
import { Info, RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "use-intl";

import { retentionPreviewQuery } from "@/api/queries";
import { useDatabaseStats } from "@/hooks/useDatabaseStats";
import { useFormatSize } from "@/hooks/useFormatSize";
import { useIngestProgress } from "@/hooks/useIngestProgress";
import { useRetentionPreviews } from "@/hooks/useRetentionPreviews";
import { useSetEventRetention } from "@/hooks/useSetEventRetention";
import {
    Button,
    Card,
    CardHeader,
    ErrorMessage,
    Segmented,
    Typography,
    richCode,
    richMono,
    richStrong,
} from "@/ui";
import {
    RETENTIONS,
    RETENTION_YEARS,
    type Retention,
    type RetentionChange,
    buildRetentionChange,
    bytesPerGame,
    toRetention,
    toYears,
} from "@/utils/retention";
import { SizeProjection } from "./size-projection";

import styles from "./styles.module.css";

export interface StorageCardProps {
    years: number | null;
}

export function StorageCard({ years }: StorageCardProps) {
    const t = useTranslations("settings.storage");
    const format = useFormatter();
    const formatSize = useFormatSize();
    const queryClient = useQueryClient();
    const { data: stats } = useDatabaseStats();
    const retention = useSetEventRetention();
    const importing = useIngestProgress() !== null;
    const [pending, setPending] = useState<Retention | null>(null);

    useEffect(() => {
        if (importing) setPending(null);
    }, [importing]);

    // Prefetch every option so the confirm panel renders on click without a loading gap
    const previews = useRetentionPreviews(RETENTION_YEARS);
    const perGame = bytesPerGame(stats);
    const change = buildRetentionChange(
        pending,
        years,
        pending === null
            ? undefined
            : previews[RETENTIONS.indexOf(pending)].data,
        perGame,
    );

    const saving = retention.isPending ? retention.variables : undefined;
    const shown = pending ?? toRetention(saving === undefined ? years : saving);

    const formatMonth = (date: string | null) =>
        date === null
            ? ""
            : format.dateTime(new Date(date), {
                  month: "short",
                  year: "numeric",
              });

    const sinceHint = (index: number) => {
        const cutoff = previews[index].data?.cutoff;
        return cutoff ? t("since", { date: formatMonth(cutoff) }) : undefined;
    };

    const options = RETENTIONS.map((value, index) => ({
        value,
        label:
            value === "forever"
                ? t("forever")
                : t("years", { count: Number(value) }),
        hint: value === "forever" ? t("allGames") : sinceHint(index),
    }));

    const onChange = (value: Retention) => {
        queryClient.invalidateQueries({
            queryKey: retentionPreviewQuery(toYears(value)).queryKey,
        });

        setPending(toYears(value) === years ? null : value);
    };

    const onConfirm = () => {
        if (!change) return;
        retention.mutate(change.years, { onSuccess: () => setPending(null) });
    };

    const onCancel = () => setPending(null);

    const confirmMessage = (change: RetentionChange) => {
        switch (change.kind) {
            case "delete":
                return t.rich("confirm", {
                    count: change.preview.expiring,
                    date: formatMonth(change.preview.cutoff),
                    size: formatSize(change.freed),
                    lost: change.preview.lost,
                    b: richStrong,
                    mono: richMono,
                });
            case "restore":
                return t.rich("confirmRestore", {
                    count: change.preview.restorable,
                    size: formatSize(change.restored),
                    lost: change.preview.unrestorable,
                    b: richStrong,
                    mono: richMono,
                });
            case "shorter":
                return t("confirmNone", { years: change.years ?? 0 });
            case "longer":
                return t("confirmNoRestore");
        }
    };

    const applyLabel = (change: RetentionChange) =>
        change.kind === "delete"
            ? t("remove")
            : change.kind === "restore"
              ? t("restore")
              : t("apply");

    return (
        <Card className={styles.root}>
            <CardHeader
                size="sm"
                title={t("title")}
                subtitle={t.rich("subtitle", { code: richCode })}
            />
            <div className={styles.body}>
                <Segmented
                    label={t("title")}
                    options={options}
                    value={shown}
                    disabled={retention.isPending || importing}
                    fill
                    onChange={onChange}
                />
                {importing && (
                    <Typography size="sm" variant="tertiary">
                        {t("busy")}
                    </Typography>
                )}
                {stats && (
                    <SizeProjection
                        bytes={stats.bytes}
                        freed={change?.freed ?? 0}
                        restored={change?.restored ?? 0}
                        growth={stats.gamesLastYear * perGame}
                        forever={toYears(shown) === null}
                    />
                )}
                {retention.error && <ErrorMessage error={retention.error} />}
            </div>
            {change && (
                <div
                    className={classNames(styles.confirm, {
                        [styles.delete]: change.kind === "delete",
                        [styles.restore]: change.kind === "restore",
                    })}
                >
                    {change.kind === "delete" ? (
                        <TriangleAlert
                            className={classNames(
                                styles.confirmIcon,
                                styles.warn,
                            )}
                        />
                    ) : change.kind === "restore" ? (
                        <RefreshCw
                            className={classNames(
                                styles.confirmIcon,
                                styles.restoreIcon,
                            )}
                        />
                    ) : (
                        <Info className={styles.confirmIcon} />
                    )}
                    <Typography
                        variant="secondary"
                        className={styles.confirmText}
                    >
                        {confirmMessage(change)}
                    </Typography>
                    <div className={styles.confirmActions}>
                        <Button
                            variant="secondary"
                            disabled={retention.isPending}
                            onClick={onCancel}
                        >
                            {t("cancel")}
                        </Button>
                        <Button
                            disabled={retention.isPending}
                            onClick={onConfirm}
                        >
                            {applyLabel(change)}
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    );
}
