import { Crown, Rewind } from "lucide-react";
import { useTranslations } from "use-intl";

import type { HeroDetail } from "@/api/heroes";
import { GameCard, GamePlaceholder } from "./card";

import styles from "./styles.module.css";

export interface GamesProps {
    hero: HeroDetail;
}

export function Games({ hero }: GamesProps) {
    const t = useTranslations("hero.games");

    return (
        <div className={styles.games}>
            {hero.bestGame ? (
                <GameCard
                    icon={Crown}
                    title={t("bestGame")}
                    game={hero.bestGame}
                />
            ) : (
                <GamePlaceholder
                    icon={Crown}
                    title={t("bestGame")}
                    headline={t("noBestGame.headline")}
                    description={t("noBestGame.description", {
                        hero: hero.name,
                    })}
                />
            )}
            {hero.lastGame && (
                <GameCard
                    icon={Rewind}
                    title={t("lastGame")}
                    game={hero.lastGame}
                />
            )}
        </div>
    );
}
