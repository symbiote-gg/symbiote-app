import classNames from "classnames";
import { Clapperboard, Trophy } from "lucide-react";
import { useFormatter, useTranslations } from "use-intl";

import type { HeroBest, HeroBests } from "@/api/heroes";
import { ButtonLink, Card, CardHeader, Eyebrow, Typography } from "@/ui";
import { formatDuration, usePlayedDay } from "@/utils/dates";

import styles from "./styles.module.css";

type GameBest = "heroDamage" | "siegeDamage" | "fastestWin" | "takedowns";

type Tile = {
    key: string;
    label: string;
    value: string;
    detail: string;
    date: string;
    art: string | null;
    replayId?: number;
};

export interface BestsProps {
    hero: string;
    bests: HeroBests;
}

export function Bests({ hero, bests }: BestsProps) {
    const t = useTranslations("hero.bests");
    const format = useFormatter();
    const playedDay = usePlayedDay();

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
            detail: best.map,
            date: playedDay(best.timestamp),
            art: best.loadingScreen,
            replayId: best.replayId,
        };

    const streak: Tile | null = bests.winStreak && {
        key: "winStreak",
        label: t("winStreak"),
        value: count(bests.winStreak.games),
        detail: t("inARow"),
        date: playedDay(bests.winStreak.ended),
        art: null,
    };

    const tiles = [
        fromGame("heroDamage", bests.heroDamage, amount),
        fromGame("siegeDamage", bests.siegeDamage, amount),
        streak,
        fromGame("fastestWin", bests.fastestWin, (secs) =>
            formatDuration(secs),
        ),
        fromGame("takedowns", bests.takedowns, count),
    ].filter((tile) => tile !== null);

    if (tiles.length === 0) return null;

    return (
        <Card>
            <CardHeader
                size="sm"
                icon={Trophy}
                title={t("title")}
                subtitle={t("subtitle", { hero })}
            />
            <ul className={styles.tiles}>
                {tiles.map((tile) => (
                    <li
                        key={tile.key}
                        className={classNames(styles.tile, {
                            [styles.plain]: !tile.art,
                        })}
                    >
                        <TileBody tile={tile} />
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
    const t = useTranslations("hero.bests");

    return (
        <>
            {tile.art && (
                <img
                    src={`/game/loadingscreens/${tile.art}`}
                    alt=""
                    decoding="async"
                    className={styles.art}
                />
            )}
            <span className={styles.shade} />
            <Eyebrow truncate>{tile.label}</Eyebrow>
            <Typography display className={styles.value}>
                {tile.value}
            </Typography>
            <Typography size="sm" variant="secondary" truncate>
                {tile.detail}
            </Typography>
            <div className={styles.footer}>
                <Typography as="span" size="xs" variant="tertiary" mono>
                    {tile.date}
                </Typography>
                {tile.replayId !== undefined && (
                    <ButtonLink
                        href={`/replays/${tile.replayId}`}
                        variant="secondary"
                        size="sm"
                        arrow={false}
                        className={styles.replay}
                    >
                        <Clapperboard aria-hidden />
                        {t("replay")}
                    </ButtonLink>
                )}
            </div>
        </>
    );
}
