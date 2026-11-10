import { ChartPie } from "lucide-react";
import { useTranslations } from "use-intl";

import type { HeroDetail } from "@/api/heroes";
import { Card, CardHeader } from "@/ui";
import { formatDuration } from "@/utils/dates";
import { MIN_TEAM_SHARE } from "@/utils/hero-stats";
import { Tile } from "./tile";

import styles from "./styles.module.css";

type ShareKey =
    | "shareHeroDamage"
    | "shareSiegeDamage"
    | "shareDamageTaken"
    | "shareHealing"
    | "shareXp"
    | "killParticipation";

type ShareLabel =
    | "heroDamage"
    | "siegeDamage"
    | "damageTaken"
    | "healing"
    | "xp"
    | "killParticipation";

type TileSpec = { label: ShareLabel; share: ShareKey } | { label: "timeDead" };

/**
 * The volumes a hero's kit leads vary by role, so the smallest of the four is
 * left out: siege damage for healers, healing for everyone else. With the three
 * fixed tiles that keeps the card at six.
 */
const VOLUMES: TileSpec[] = [
    { label: "heroDamage", share: "shareHeroDamage" },
    { label: "siegeDamage", share: "shareSiegeDamage" },
    { label: "damageTaken", share: "shareDamageTaken" },
    { label: "healing", share: "shareHealing" },
];

const LEADING_VOLUMES = 3;

const FIXED: TileSpec[] = [
    { label: "killParticipation", share: "killParticipation" },
    { label: "xp", share: "shareXp" },
    { label: "timeDead" },
];

export interface TeamShareProps {
    hero: HeroDetail;
}

export function TeamShare({ hero }: TeamShareProps) {
    const t = useTranslations("hero.teamShare");

    // Time dead has no team total: its share is of the average game instead.
    const timeDead = () => {
        if (hero.avgTimeDeadSecs === null || !hero.avgDuration) return null;

        return {
            share: hero.avgTimeDeadSecs / hero.avgDuration,
            detail: t("detail.timeDead", {
                duration: formatDuration(hero.avgDuration),
            }),
        };
    };

    const ofTeam = (label: ShareLabel, share: number | null) =>
        share === null ? null : { share, detail: t(`detail.${label}`) };

    const shareOf = (spec: TileSpec) =>
        "share" in spec ? (hero[spec.share] ?? 0) : 0;

    const trailing = [...VOLUMES]
        .sort((a, b) => shareOf(b) - shareOf(a))
        .slice(LEADING_VOLUMES);

    const tiles = [...VOLUMES, ...FIXED].flatMap((spec) => {
        if (trailing.includes(spec)) return [];

        const cells =
            "share" in spec ? ofTeam(spec.label, hero[spec.share]) : timeDead();

        if (cells === null || cells.share < MIN_TEAM_SHARE) return [];

        return [{ key: spec.label, label: t(spec.label), ...cells }];
    });

    return (
        <Card>
            <CardHeader
                size="sm"
                icon={ChartPie}
                title={t("title")}
                subtitle={t("subtitle", { hero: hero.name })}
            />
            <div className={styles.body}>
                <ul className={styles.tiles}>
                    {tiles.map((tile) => (
                        <Tile
                            key={tile.key}
                            label={tile.label}
                            share={tile.share}
                            detail={tile.detail}
                        />
                    ))}
                </ul>
            </div>
        </Card>
    );
}
