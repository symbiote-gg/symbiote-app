import classNames from "classnames";
import { useTranslations } from "use-intl";

import type { MapRecord } from "@/api/heroes";
import { useImageFallback } from "@/hooks/useImageFallback";
import { Meter, Typography, WinRate } from "@/ui";

import styles from "./styles.module.css";

const THUMB = "@264x164.webp";

export interface MapCardProps {
    map: MapRecord;
    rate: number | null;
    judged: boolean;
}

export function MapCard({ map, rate, judged }: MapCardProps) {
    const t = useTranslations("hero.maps");
    const [failed, onError] = useImageFallback();

    return (
        <li className={styles.root}>
            {map.loadingScreen && !failed && (
                <img
                    src={`/game/loadingscreens/${map.loadingScreen.replace(/\.webp$/, THUMB)}`}
                    alt=""
                    decoding="async"
                    className={styles.art}
                    onError={onError}
                />
            )}
            <span className={styles.shade} />
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
