import {
    Castle,
    CircleDot,
    Handshake,
    HeartPlus,
    Shield,
    Star,
    Swords,
    Target,
    Tent,
    Tombstone,
} from "lucide-react";
import { useFormatter, useTranslations } from "use-intl";

import type { HeroDetail } from "@/api/heroes";
import { useFormatStat } from "@/hooks/useFormatStat";
import { StatTile } from "@/ui";
import { MIN_TEAM_SHARE } from "@/utils/hero-stats";

export interface TilesProps {
    hero: HeroDetail;
    className?: string;
}

export function Tiles({ hero, className }: TilesProps) {
    const t = useTranslations("hero.career");
    const format = useFormatter();
    const { total, compact } = useFormatStat();

    const perGame = (value: number | null) =>
        value === null
            ? undefined
            : t("perGameDetail", { value: compact(value, { fixed: true }) });

    const heals =
        hero.shareHealing !== null && hero.shareHealing >= MIN_TEAM_SHARE;

    return (
        <div className={className}>
            <StatTile
                variant="panel"
                icon={Swords}
                label={t("kills")}
                value={format.number(hero.kills)}
                detail={perGame(hero.avgKills)}
            />
            <StatTile
                variant="panel"
                icon={Handshake}
                label={t("assists")}
                value={format.number(hero.assists)}
                detail={perGame(hero.avgAssists)}
            />
            <StatTile
                variant="panel"
                icon={Tombstone}
                label={t("deaths")}
                value={format.number(hero.deaths)}
                detail={perGame(hero.avgDeaths)}
                accent="loss"
            />
            <StatTile
                variant="panel"
                icon={Target}
                label={t("heroDamage")}
                value={total(hero.heroDamage)}
                detail={perGame(hero.avgHeroDamage)}
            />
            <StatTile
                variant="panel"
                icon={Castle}
                label={t("siegeDamage")}
                value={total(hero.siegeDamage)}
                detail={perGame(hero.avgSiegeDamage)}
            />
            {heals ? (
                <StatTile
                    variant="panel"
                    icon={HeartPlus}
                    label={t("healing")}
                    value={total(hero.healing)}
                    detail={perGame(hero.avgHealing)}
                />
            ) : (
                <StatTile
                    variant="panel"
                    icon={HeartPlus}
                    label={t("selfHealing")}
                    value={total(hero.selfHealing)}
                    detail={perGame(hero.avgSelfHealing)}
                />
            )}
            <StatTile
                variant="panel"
                icon={Shield}
                label={t("damageTaken")}
                value={total(hero.damageTaken)}
                detail={perGame(hero.avgDamageTaken)}
            />
            <StatTile
                variant="panel"
                icon={Star}
                label={t("xp")}
                value={total(hero.xp)}
                detail={perGame(hero.avgXp)}
            />
            <StatTile
                variant="panel"
                icon={CircleDot}
                label={t("globes")}
                value={format.number(hero.globes)}
                detail={perGame(hero.globes / hero.games)}
            />
            <StatTile
                variant="panel"
                icon={Tent}
                label={t("camps")}
                value={format.number(hero.camps)}
                detail={perGame(hero.camps / hero.games)}
            />
        </div>
    );
}
