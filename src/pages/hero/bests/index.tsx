import classNames from "classnames";
import {
    Castle,
    Flame,
    HeartPlus,
    type LucideIcon,
    Shield,
    Star,
    Swords,
    Target,
    Timer,
    Tombstone,
    Trophy,
} from "lucide-react";
import { useFormatter, useTranslations } from "use-intl";
import { Link } from "wouter";

import type { HeroBest, HeroDetail } from "@/api/heroes";
import { Card, CardHeader, Eyebrow, Typography } from "@/ui";
import { formatDuration, usePlayedDay } from "@/utils/dates";
import { MIN_TEAM_SHARE } from "@/utils/hero-stats";

import styles from "./styles.module.css";

/** Records that grow with what the hero does, ranked by the owner's share of the team's total. */
const VOLUME_SHARES = {
    heroDamage: "shareHeroDamage",
    siegeDamage: "shareSiegeDamage",
    healing: "shareHealing",
    damageTaken: "shareDamageTaken",
    xp: "shareXp",
} as const satisfies Record<string, keyof HeroDetail>;

type VolumeBest = keyof typeof VOLUME_SHARES;

type GameBest = VolumeBest | "takedowns" | "fastestWin" | "fewestDeathsWin";

const VOLUMES = Object.keys(VOLUME_SHARES) as VolumeBest[];

const BEST_ICONS: Record<GameBest, LucideIcon> = {
    heroDamage: Target,
    siegeDamage: Castle,
    healing: HeartPlus,
    damageTaken: Shield,
    xp: Star,
    takedowns: Swords,
    fewestDeathsWin: Tombstone,
    fastestWin: Timer,
};

const LEADING_VOLUMES = 2;

const MAX_TILES = 6;

type Tile = {
    key: string;
    label: string;
    value: string;
    detail: string;
    icon: LucideIcon;
    replayId?: number;
};

export interface BestsProps {
    hero: HeroDetail;
}

export function Bests({ hero }: BestsProps) {
    const t = useTranslations("hero.bests");
    const format = useFormatter();
    const playedDay = usePlayedDay();
    const { bests } = hero;

    const count = (value: number) => format.number(value);
    const amount = (value: number) =>
        format.number(value, {
            notation: "compact",
            maximumSignificantDigits: 3,
        });

    const fromGame = (
        key: GameBest,
        best: HeroBest | null,
        value: (value: number) => string,
    ): Tile | null =>
        best && {
            key,
            label: t(key),
            value: value(best.value),
            detail: t("meta", {
                map: best.map,
                date: playedDay(best.timestamp),
            }),
            icon: BEST_ICONS[key],
            replayId: best.replayId,
        };

    const streak: Tile | null = bests.winStreak && {
        key: "winStreak",
        label: t("winStreak"),
        value: count(bests.winStreak.games),
        detail: t("streak", { date: playedDay(bests.winStreak.ended) }),
        icon: Flame,
    };

    const volumes = VOLUMES.map((key) => ({
        key,
        share: hero[VOLUME_SHARES[key]] ?? 0,
    }))
        .filter(({ share }) => share >= MIN_TEAM_SHARE)
        .sort((a, b) => b.share - a.share)
        .map(({ key }) => fromGame(key, bests[key], amount))
        .filter((tile) => tile !== null);

    const tiles = [
        ...volumes.slice(0, LEADING_VOLUMES),
        fromGame("takedowns", bests.takedowns, count),
        fromGame("fewestDeathsWin", bests.fewestDeathsWin, count),
        fromGame("fastestWin", bests.fastestWin, (secs) =>
            formatDuration(secs),
        ),
        streak,
        ...volumes.slice(LEADING_VOLUMES),
    ]
        .filter((tile) => tile !== null)
        .slice(0, MAX_TILES);

    if (tiles.length === 0) return null;

    return (
        <Card>
            <CardHeader
                size="sm"
                icon={Trophy}
                title={t("title")}
                subtitle={t("subtitle", { hero: hero.name })}
            />
            <ul className={styles.tiles}>
                {tiles.map((tile) => (
                    <li key={tile.key} className={styles.item}>
                        {tile.replayId === undefined ? (
                            <div className={styles.tile}>
                                <TileBody tile={tile} />
                            </div>
                        ) : (
                            <Link
                                href={`/replays/${tile.replayId}`}
                                className={classNames(styles.tile, styles.link)}
                            >
                                <TileBody tile={tile} />
                            </Link>
                        )}
                    </li>
                ))}
            </ul>
        </Card>
    );
}

interface TileBodyProps {
    tile: Tile;
}

function TileBody({ tile }: TileBodyProps) {
    return (
        <>
            <tile.icon aria-hidden className={styles.watermark} />
            <Eyebrow truncate>{tile.label}</Eyebrow>
            <div className={styles.body}>
                <Typography display className={styles.value}>
                    {tile.value}
                </Typography>
                <Typography size="sm" variant="secondary" truncate>
                    {tile.detail}
                </Typography>
            </div>
        </>
    );
}
