import { Clapperboard } from "lucide-react";
import { useTranslations } from "use-intl";
import { useLocation } from "wouter";

import type { HeroDetail } from "@/api/heroes";
import { BackLink, HeroPortrait } from "@/components";
import { useImageFallback } from "@/hooks/useImageFallback";
import {
    NO_FILTERS as NO_REPLAY_FILTERS,
    openReplaysOn,
} from "@/pages/replays/filters/state";
import { Button, Chip, Typography } from "@/ui";
import { ROLE_ICONS } from "@/utils/role-icons";
import { Facts } from "./facts";
import { Totals } from "./totals";

import styles from "./styles.module.css";

export interface HeaderProps {
    hero: HeroDetail;
}

export function Header({ hero }: HeaderProps) {
    const t = useTranslations("hero");
    const roles = useTranslations("roles");
    const [, navigate] = useLocation();
    const [failed, onError] = useImageFallback();

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
            <div className={styles.body}>
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
                    <Facts hero={hero} />
                </div>
            </div>
            {hero.games > 0 && <Totals hero={hero} />}
        </header>
    );
}
