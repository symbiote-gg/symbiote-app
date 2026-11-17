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

import type { CareerTotals } from "@/api/heroes";
import { useFormatStat } from "@/hooks/useFormatStat";
import { StatTile } from "@/ui";

export interface CareerTilesProps {
    totals: CareerTotals;
    /** Whether the healing tile counts healing done to the team or to oneself. */
    healing: "team" | "self";
    className?: string;
}

export function CareerTiles({ totals, healing, className }: CareerTilesProps) {
    const t = useTranslations("career");
    const format = useFormatter();
    const { total, compact } = useFormatStat();

    const perGame = (value: number | null) =>
        value === null
            ? undefined
            : t("perGameDetail", { value: compact(value, { fixed: true }) });

    return (
        <div className={className}>
            <StatTile
                variant="panel"
                icon={Swords}
                label={t("kills")}
                value={format.number(totals.kills)}
                detail={perGame(totals.avgKills)}
            />
            <StatTile
                variant="panel"
                icon={Handshake}
                label={t("assists")}
                value={format.number(totals.assists)}
                detail={perGame(totals.avgAssists)}
            />
            <StatTile
                variant="panel"
                icon={Tombstone}
                label={t("deaths")}
                value={format.number(totals.deaths)}
                detail={perGame(totals.avgDeaths)}
                accent="loss"
            />
            <StatTile
                variant="panel"
                icon={Target}
                label={t("heroDamage")}
                value={total(totals.heroDamage)}
                detail={perGame(totals.avgHeroDamage)}
            />
            <StatTile
                variant="panel"
                icon={Castle}
                label={t("siegeDamage")}
                value={total(totals.siegeDamage)}
                detail={perGame(totals.avgSiegeDamage)}
            />
            {healing === "team" ? (
                <StatTile
                    variant="panel"
                    icon={HeartPlus}
                    label={t("healing")}
                    value={total(totals.healing)}
                    detail={perGame(totals.avgHealing)}
                />
            ) : (
                <StatTile
                    variant="panel"
                    icon={HeartPlus}
                    label={t("selfHealing")}
                    value={total(totals.selfHealing)}
                    detail={perGame(totals.avgSelfHealing)}
                />
            )}
            <StatTile
                variant="panel"
                icon={Shield}
                label={t("damageTaken")}
                value={total(totals.damageTaken)}
                detail={perGame(totals.avgDamageTaken)}
            />
            <StatTile
                variant="panel"
                icon={Star}
                label={t("xp")}
                value={total(totals.xp)}
                detail={perGame(totals.avgXp)}
            />
            <StatTile
                variant="panel"
                icon={CircleDot}
                label={t("globes")}
                value={format.number(totals.globes)}
                detail={perGame(totals.globes / totals.games)}
            />
            <StatTile
                variant="panel"
                icon={Tent}
                label={t("camps")}
                value={format.number(totals.camps)}
                detail={perGame(totals.camps / totals.games)}
            />
        </div>
    );
}
