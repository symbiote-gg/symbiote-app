import { Map as MapIcon } from "lucide-react";
import { useTranslations } from "use-intl";

import type { MapRecord } from "@/api/heroes";
import { Card, CardHeader } from "@/ui";
import { isJudged, winRate } from "@/utils/hero-stats";
import { MapCard } from "./card";

import styles from "./styles.module.css";

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

    const cards = [...judged, ...rest];

    return (
        <Card>
            <CardHeader
                size="sm"
                icon={MapIcon}
                title={t("title")}
                subtitle={t("subtitle")}
            />
            <ul className={styles.list}>
                {cards.map((map) => (
                    <MapCard
                        key={map.id}
                        map={map}
                        rate={map.rate}
                        judged={map.judged}
                    />
                ))}
            </ul>
        </Card>
    );
}
