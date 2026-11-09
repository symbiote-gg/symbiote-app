import { Clapperboard } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslations } from "use-intl";
import { useLocation } from "wouter";

import type { HeroDetail } from "@/api/heroes";
import { BackLink, HeroPortrait } from "@/components";
import { useImageFallback } from "@/hooks/useImageFallback";
import {
    NO_FILTERS as NO_REPLAY_FILTERS,
    openReplaysOn,
} from "@/pages/replays/filters/state";
import { Button, Chip, Typography, WinRate } from "@/ui";
import { isJudged, winRate } from "@/utils/hero-stats";
import { ROLE_ICONS } from "@/utils/role-icons";
import { Tiles } from "./tiles";
import { TimePanel } from "./time-panel";

import styles from "./styles.module.css";

const win = (chunks: ReactNode) => <span className={styles.win}>{chunks}</span>;

const loss = (chunks: ReactNode) => (
    <span className={styles.loss}>{chunks}</span>
);

export interface CareerProps {
    hero: HeroDetail;
}

export function Career({ hero }: CareerProps) {
    const t = useTranslations("hero");
    const roles = useTranslations("roles");
    const [, navigate] = useLocation();
    const [failed, onError] = useImageFallback();

    const rate = winRate(hero.wins, hero.losses);

    const onReplays = () => {
        openReplaysOn({ ...NO_REPLAY_FILTERS, heroes: [hero.heroId] });
        navigate("/replays");
    };

    return (
        <header className={styles.root}>
            {hero.banner && !failed && (
                <img
                    src={`/game/heroportraits/${hero.banner}`}
                    alt=""
                    decoding="sync"
                    className={styles.art}
                    onError={onError}
                />
            )}
            <div className={styles.top}>
                <BackLink
                    href="/heroes"
                    label={t("back")}
                    className={styles.tool}
                />
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={onReplays}
                    className={styles.tool}
                >
                    <Clapperboard aria-hidden />
                    {t("replays", { hero: hero.name })}
                </Button>
            </div>
            <div className={styles.identity}>
                <div className={styles.hero}>
                    <HeroPortrait
                        name={hero.name}
                        portrait={hero.portrait}
                        size="xl"
                        decoding="sync"
                        className={styles.portrait}
                    />
                    <div className={styles.titles}>
                        {hero.role && (
                            <Chip
                                size="sm"
                                icon={ROLE_ICONS[hero.role]}
                                uppercase
                                className={styles.role}
                            >
                                {roles(hero.role)}
                            </Chip>
                        )}
                        <Typography size="xl2" display className={styles.name}>
                            {hero.name}
                        </Typography>
                    </div>
                </div>
                {rate !== null && (
                    <div className={styles.result}>
                        <Typography as="p" display className={styles.rate}>
                            <WinRate
                                rate={rate}
                                judged={isJudged(hero.wins, hero.losses)}
                                suffix={t("career.winsSuffix")}
                            />
                        </Typography>
                        <Typography as="p" mono className={styles.record}>
                            {t.rich("career.record", {
                                wins: hero.wins,
                                losses: hero.losses,
                                win,
                                loss,
                            })}
                        </Typography>
                    </div>
                )}
            </div>
            {hero.games > 0 && (
                <div className={styles.body}>
                    <TimePanel hero={hero} />
                    <Tiles hero={hero} className={styles.tiles} />
                </div>
            )}
        </header>
    );
}
