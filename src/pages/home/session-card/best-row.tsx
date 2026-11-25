import { ArrowRight, Trophy } from "lucide-react";
import type { CSSProperties } from "react";
import { useTranslations } from "use-intl";
import { Link } from "wouter";

import { HeroPortrait } from "@/components";
import type { SessionBestTile } from "@/hooks/useBestTiles";
import { Chip, StatTile } from "@/ui";

import styles from "./styles.module.css";

export interface BestRowProps {
    best: SessionBestTile;
    portrait: string | null;
}

export function BestRow({ best, portrait }: BestRowProps) {
    const t = useTranslations("bests.session");

    const tone = {
        "--tone": best.tone,
        "--card-icon": best.tone,
    } as CSSProperties;

    const detail = (
        <span className={styles.bestMeta}>
            <HeroPortrait
                name={best.hero}
                portrait={portrait}
                size="xs"
                className={styles.bestPortrait}
            />
            <span className={styles.bestHero}>{best.hero}</span>
            {best.career && (
                <Chip size="sm" tone="mvp" icon={Trophy} uppercase>
                    {t("careerBest")}
                </Chip>
            )}
        </span>
    );

    const value = (
        <span className={styles.valueRow}>
            <span className={styles.bestPrevious}>
                {best.previous}
                <ArrowRight aria-hidden />
            </span>
            {best.value}
            <Chip size="sm" tone="win">
                {best.gain}
            </Chip>
        </span>
    );

    return (
        <li>
            <Link
                href={`/replays/${best.replayId}`}
                className={styles.bestTile}
                style={tone}
            >
                <StatTile
                    variant="row"
                    accent="tone"
                    icon={best.icon}
                    iconSize="lg"
                    label={best.label}
                    className={styles.bestStat}
                    detail={detail}
                    value={value}
                />
            </Link>
        </li>
    );
}
