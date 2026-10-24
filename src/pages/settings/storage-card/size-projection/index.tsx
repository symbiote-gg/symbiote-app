import classNames from "classnames";
import { ArrowRight, Database } from "lucide-react";
import { useTranslations } from "use-intl";

import { useFormatSize } from "@/hooks/useFormatSize";
import { Eyebrow, Typography } from "@/ui";

import styles from "./styles.module.css";

export interface SizeProjectionProps {
    bytes: number;
    freed: number;
    restored: number;
    growth: number;
    forever: boolean;
}

export function SizeProjection({
    bytes,
    freed,
    restored,
    growth,
    forever,
}: SizeProjectionProps) {
    const t = useTranslations("settings.storage");
    const formatSize = useFormatSize();

    const changes = freed > 0 || restored > 0;
    const grows = !changes && forever && growth > 0;
    const after = bytes - freed + restored + (grows ? growth : 0);
    const scale = Math.max(bytes, after) || 1;
    const width = (part: number) => `${(part / scale) * 100}%`;

    const segments = [
        { key: "kept", size: bytes - freed, shown: true },
        { key: "freed", size: freed, shown: freed > 0 },
        { key: "restored", size: restored, shown: restored > 0 },
        { key: "growth", size: growth, shown: grows },
    ] as const;
    const shown = segments.filter((segment) => segment.shown);

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <div className={styles.title}>
                    <Database className={styles.icon} />
                    <Eyebrow>{t("size")}</Eyebrow>
                </div>
                <Typography
                    mono
                    weight="semibold"
                    noWrap
                    className={styles.sizes}
                >
                    {changes || grows ? (
                        <>
                            <span className={styles.from}>
                                {formatSize(bytes)}
                            </span>
                            <ArrowRight className={styles.arrow} />
                            {`~${formatSize(after)}`}
                        </>
                    ) : (
                        formatSize(bytes)
                    )}
                </Typography>
            </div>
            <div className={styles.track} aria-hidden>
                {shown.map((segment) => (
                    <span
                        key={segment.key}
                        className={classNames(
                            styles.segment,
                            styles[segment.key],
                        )}
                        style={{ width: width(segment.size) }}
                    />
                ))}
            </div>
            <ul className={styles.legend}>
                {shown.map((segment) => (
                    <li key={segment.key} className={styles.legendItem}>
                        <span
                            className={classNames(
                                styles.swatch,
                                styles[segment.key],
                            )}
                        />
                        <Typography size="sm" variant="tertiary">
                            {t(`legend.${segment.key}`)}
                        </Typography>
                    </li>
                ))}
            </ul>
        </div>
    );
}
