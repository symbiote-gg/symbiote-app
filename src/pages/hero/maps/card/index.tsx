import classNames from "classnames";
import { useRef } from "react";
import { useTranslations } from "use-intl";

import type { MapRecord } from "@/api/heroes";
import { type AppearCheck, useAppear } from "@/hooks/useAppear";
import { useImageFallback } from "@/hooks/useImageFallback";
import { Meter, Typography, WinRate } from "@/ui";
import { MAP_CARD_VARIANT, variantFile } from "@/utils/image-variants";

import styles from "./styles.module.css";

export interface MapCardProps {
    map: MapRecord;
    rate: number | null;
    judged: boolean;
    appear: AppearCheck;
}

export function MapCard({ map, rate, judged, appear }: MapCardProps) {
    const t = useTranslations("hero.maps");
    const [failed, onError] = useImageFallback();
    const ref = useRef<HTMLLIElement>(null);

    useAppear(ref, appear, "card", { sweep: styles.sweep });

    return (
        <li ref={ref} className={styles.root}>
            {map.loadingScreen && !failed && (
                <img
                    src={`/game/loadingscreens/${variantFile(map.loadingScreen, MAP_CARD_VARIANT)}`}
                    alt=""
                    decoding="async"
                    className={styles.art}
                    onError={onError}
                />
            )}
            <span className={styles.shade} />
            <span className={styles.sweep} aria-hidden />
            <Typography size="sm" weight="semibold" truncate>
                {map.name}
            </Typography>
            <span
                className={classNames(styles.stats, {
                    [styles.few]: !judged,
                })}
            >
                <span className={styles.figures}>
                    <Typography as="span" display className={styles.rate}>
                        <WinRate rate={rate} judged={judged} />
                    </Typography>
                    <Typography as="span" size="xs" variant="secondary" noWrap>
                        {t("games", { count: map.games })}
                    </Typography>
                </span>
                <Meter
                    value={rate ?? 0}
                    neutral={!judged}
                    className={styles.meter}
                />
            </span>
        </li>
    );
}
