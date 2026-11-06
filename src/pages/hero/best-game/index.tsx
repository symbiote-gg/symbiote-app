import { Clapperboard, Trophy } from "lucide-react";
import { useTranslations } from "use-intl";

import type { BestGame as BestGameData } from "@/api/heroes";
import { Kad, ResultChip } from "@/components";
import { useFormatStat } from "@/hooks/useFormatStat";
import { useImageFallback } from "@/hooks/useImageFallback";
import { ButtonLink, Card, Eyebrow, Stat, Typography } from "@/ui";
import { formatDuration, usePlayedDay } from "@/utils/dates";

import styles from "./styles.module.css";

export interface BestGameProps {
    hero: string;
    game: BestGameData;
}

export function BestGame({ hero, game }: BestGameProps) {
    const t = useTranslations();
    const { compact } = useFormatStat();
    const playedDay = usePlayedDay();
    const [failed, onError] = useImageFallback();

    return (
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
            <div className={styles.body}>
                <Eyebrow className={styles.eyebrow}>
                    <Trophy aria-hidden />
                    {t("hero.bestGame.title", { hero })}
                </Eyebrow>
                <Typography as="p" display className={styles.kills}>
                    {t("hero.bestGame.kills", { count: game.kills })}
                </Typography>
                <Typography size="sm" variant="secondary">
                    {t("hero.bestGame.meta", {
                        map: game.map,
                        date: playedDay(game.timestamp),
                        duration: formatDuration(game.duration),
                    })}
                </Typography>
            </div>
            <div className={styles.footer}>
                <dl className={styles.stats}>
                    <Stat label={t("hero.bestGame.kad")}>
                        <Kad
                            kills={game.kills}
                            assists={game.assists}
                            deaths={game.deaths}
                        />
                    </Stat>
                    <Stat label={t("hero.bestGame.heroDamage")}>
                        {compact(game.heroDamage)}
                    </Stat>
                </dl>
                <div className={styles.actions}>
                    {game.ownerWin !== null && (
                        <ResultChip win={game.ownerWin} />
                    )}
                    <ButtonLink
                        href={`/replays/${game.replayId}`}
                        variant="secondary"
                        size="sm"
                        arrow={false}
                        className={styles.replay}
                    >
                        <Clapperboard aria-hidden />
                        {t("hero.bestGame.replay")}
                    </ButtonLink>
                </div>
            </div>
        </Card>
    );
}
