import classNames from "classnames";
import { Map as MapIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { useTranslations } from "use-intl";

import type { MapRecord } from "@/api/heroes";
import { Card, CardHeader, Meter, Typography, WinRate } from "@/ui";
import { isJudged, winRate } from "@/utils/hero-stats";

import styles from "./styles.module.css";

// fetch-assets makes this size of each loading screen, as WebKit blurs large
// downscales.
const THUMB = "@48x32.webp";

export interface MapsProps {
    maps: MapRecord[];
}

export function Maps({ maps }: MapsProps) {
    const t = useTranslations("hero.maps");

    const rated = maps.map((map) => ({
        ...map,
        rate: winRate(map.wins, map.losses),
        judged: isJudged(map.wins, map.losses),
    }));
    const judged = rated
        .filter((map) => map.judged)
        .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0) || b.games - a.games);
    const rest = rated
        .filter((map) => !map.judged)
        .sort((a, b) => b.games - a.games);

    const rows = [...judged, ...rest];

    // Fills the two wide columns top to bottom, so the order reads down each one.
    const columns = {
        "--rows": Math.ceil(rows.length / 2),
    } as CSSProperties;

    return (
        <Card>
            <CardHeader
                size="sm"
                icon={MapIcon}
                title={t("title")}
                subtitle={t("subtitle")}
            />
            <div className={styles.body}>
                <ul className={styles.list} style={columns}>
                    {rows.map((map) => (
                        <MapRow
                            key={map.id}
                            map={map}
                            rate={map.rate}
                            judged={map.judged}
                        />
                    ))}
                </ul>
            </div>
        </Card>
    );
}

interface MapRowProps {
    map: MapRecord;
    rate: number | null;
    judged: boolean;
}

function MapRow({ map, rate, judged }: MapRowProps) {
    return (
        <li className={classNames(styles.row, { [styles.few]: !judged })}>
            <span className={styles.thumb}>
                {map.loadingScreen && (
                    <img
                        src={`/game/loadingscreens/${map.loadingScreen.replace(/\.webp$/, THUMB)}`}
                        alt=""
                        decoding="async"
                        className={styles.image}
                    />
                )}
            </span>
            <Typography size="sm" weight="semibold" truncate>
                {map.name}
            </Typography>
            <Meter
                value={rate ?? 0}
                neutral={!judged}
                className={styles.meter}
            />
            <Typography
                as="span"
                size="xs"
                weight="semibold"
                mono
                className={styles.rate}
            >
                <WinRate rate={rate} judged={judged} />
            </Typography>
            <Typography
                as="span"
                size="xs"
                variant="tertiary"
                mono
                className={styles.games}
            >
                {map.games}
            </Typography>
        </li>
    );
}
