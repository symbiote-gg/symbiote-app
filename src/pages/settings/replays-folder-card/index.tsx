import { Folder } from "lucide-react";
import { useFormatter, useTranslations } from "use-intl";

import { useOpenReplaysFolder } from "@/hooks/useOpenReplaysFolder";
import { useReplaysFolder } from "@/hooks/useReplaysFolder";
import {
    Button,
    Card,
    CardHeader,
    ErrorMessage,
    Eyebrow,
    Typography,
} from "@/ui";
import { usePlayedAt } from "@/utils/dates";

import styles from "./styles.module.css";

export function ReplaysFolderCard() {
    const t = useTranslations("settings.replaysFolder");
    const format = useFormatter();
    const playedAt = usePlayedAt();
    const { data: folder, error } = useReplaysFolder();
    const open = useOpenReplaysFolder();

    const onOpen = () => open.mutate();

    const stats = folder && [
        { label: t("replays"), value: format.number(folder.replays) },
        {
            label: t("lastImport"),
            value: folder.lastImport ? playedAt(folder.lastImport) : "-",
        },
        {
            label: t("oldestGame"),
            value: folder.oldestGame
                ? format.dateTime(new Date(folder.oldestGame), {
                      month: "short",
                      year: "numeric",
                  })
                : "-",
        },
    ];

    return (
        <Card className={styles.root}>
            <CardHeader size="sm" title={t("title")} subtitle={t("subtitle")} />
            <div className={styles.body}>
                {error && <ErrorMessage error={error} />}
                {folder && (
                    <div className={styles.path}>
                        <Folder className={styles.icon} />
                        {folder.path ? (
                            <>
                                <Typography
                                    mono
                                    truncate
                                    title={folder.path}
                                    className={styles.pathText}
                                >
                                    {folder.path}
                                </Typography>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    disabled={open.isPending}
                                    onClick={onOpen}
                                >
                                    {t("open")}
                                </Button>
                            </>
                        ) : (
                            <Typography
                                variant="tertiary"
                                className={styles.pathText}
                            >
                                {t("notFound")}
                            </Typography>
                        )}
                    </div>
                )}
                {open.error && <ErrorMessage error={open.error} />}
                {stats && (
                    <dl className={styles.stats}>
                        {stats.map(({ label, value }) => (
                            <div key={label} className={styles.stat}>
                                <dt>
                                    <Eyebrow>{label}</Eyebrow>
                                </dt>
                                <dd>
                                    <Typography size="lg">{value}</Typography>
                                </dd>
                            </div>
                        ))}
                    </dl>
                )}
            </div>
        </Card>
    );
}
