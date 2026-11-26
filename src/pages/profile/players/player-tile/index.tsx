import classNames from "classnames";
import type { CSSProperties, ReactNode } from "react";
import { useTranslations } from "use-intl";

import type { Teammate } from "@/api/stats";
import { HeroPortrait } from "@/components";
import { Chip, Typography, WinRate } from "@/ui";
import { useShortDate } from "@/utils/dates";
import { isJudged, winRate } from "@/utils/hero-stats";

import styles from "./styles.module.css";

const num = (chunks: ReactNode) => chunks;

const win = (chunks: ReactNode) => <span className={styles.win}>{chunks}</span>;

const loss = (chunks: ReactNode) => (
    <span className={styles.loss}>{chunks}</span>
);

export interface PlayerTileProps {
    mate: Teammate;
    bestDuo: boolean;
}

export function PlayerTile({ mate, bestDuo }: PlayerTileProps) {
    const t = useTranslations("profile.players");
    const career = useTranslations("career");
    const shortDate = useShortDate();

    const rate = winRate(mate.wins, mate.losses);
    const judged = isJudged(mate.wins, mate.losses);

    const accent = mate.heroAccent
        ? ({ "--hero-accent": mate.heroAccent } as CSSProperties)
        : undefined;

    return (
        <li className={styles.root} style={accent}>
            <HeroPortrait
                name={mate.heroName}
                portrait={mate.heroPortrait}
                size="lg"
                className={styles.portrait}
            />

            <div className={styles.names}>
                <div className={styles.name}>
                    <Typography size="lg" weight="semibold" truncate>
                        {mate.name}
                    </Typography>
                    {bestDuo && (
                        <Chip size="sm" tone="win" uppercase>
                            {t("bestDuo")}
                        </Chip>
                    )}
                </div>
                <Typography size="sm" variant="secondary" truncate>
                    {t("detail", {
                        count: mate.games,
                        hero: mate.heroName,
                        date: shortDate(mate.lastPlayed),
                    })}
                </Typography>
            </div>

            <div className={classNames(styles.figure, !judged && styles.few)}>
                <Typography as="span" display className={styles.rate}>
                    <WinRate rate={rate} judged={judged} />
                </Typography>
                <Typography as="span" size="sm" mono noWrap>
                    {career.rich("record", {
                        wins: mate.wins,
                        losses: mate.losses,
                        num,
                        win,
                        loss,
                    })}
                </Typography>
            </div>
        </li>
    );
}
