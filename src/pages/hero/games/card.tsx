import classNames from "classnames";
import type { LucideIcon } from "lucide-react";
import { useFormatter, useTranslations } from "use-intl";
import { Link } from "wouter";

import type { HeroGame } from "@/api/heroes";
import { Kad } from "@/components";
import { useImageFallback } from "@/hooks/useImageFallback";
import { Card, Chip, Eyebrow, Stat, Typography } from "@/ui";
import { usePlayedDayTime } from "@/utils/dates";
import { matchResult } from "@/utils/result";

import styles from "./styles.module.css";

export interface GameCardProps {
    icon: LucideIcon;
    title: string;
    game: HeroGame;
}

export function GameCard({ icon: Icon, title, game }: GameCardProps) {
    const t = useTranslations();
    const format = useFormatter();
    const playedDayTime = usePlayedDayTime();
    const [failed, onError] = useImageFallback();

    const result = matchResult(game.ownerWin);
    const headline =
        result === "unknown" ? t("hero.games.noResult") : t(`result.${result}`);

    return (
        <Link href={`/replays/${game.replayId}`} className={styles.link}>
            <Card className={styles.root}>
                {game.loadingScreen && !failed && (
                    <img
                        src={`/game/loadingscreens/${game.loadingScreen}`}
                        alt=""
                        decoding="async"
                        className={styles.art}
                        onError={onError}
                    />
                )}
                <div className={styles.shade} />
                <div className={styles.top}>
                    <Eyebrow className={styles.eyebrow}>
                        <Icon aria-hidden />
                        {title}
                    </Eyebrow>
                    <Chip size="sm">
                        {format.relativeTime(new Date(game.timestamp))}
                    </Chip>
                </div>
                <div className={styles.bottom}>
                    <div className={styles.body}>
                        <Typography
                            as="p"
                            display
                            className={classNames(
                                styles.headline,
                                styles[result],
                            )}
                        >
                            {headline}
                        </Typography>
                        <Typography size="sm" variant="secondary">
                            {t("hero.games.meta", {
                                map: game.map,
                                date: playedDayTime(game.timestamp),
                            })}
                        </Typography>
                    </div>
                    <dl className={styles.stats}>
                        <Stat label={t("hero.games.kad")}>
                            <Kad
                                kills={game.kills}
                                assists={game.assists}
                                deaths={game.deaths}
                            />
                        </Stat>
                    </dl>
                </div>
            </Card>
        </Link>
    );
}

export interface GamePlaceholderProps {
    icon: LucideIcon;
    title: string;
    headline: string;
    description: string;
}

export function GamePlaceholder({
    icon: Icon,
    title,
    headline,
    description,
}: GamePlaceholderProps) {
    return (
        <div className={styles.placeholder}>
            <Card className={styles.root}>
                <div className={styles.top}>
                    <Eyebrow className={styles.eyebrow}>
                        <Icon aria-hidden />
                        {title}
                    </Eyebrow>
                </div>
                <div className={styles.bottom}>
                    <div className={styles.body}>
                        <Typography
                            as="p"
                            display
                            variant="tertiary"
                            className={styles.headline}
                        >
                            {headline}
                        </Typography>
                        <Typography size="sm" variant="secondary">
                            {description}
                        </Typography>
                    </div>
                </div>
            </Card>
        </div>
    );
}
