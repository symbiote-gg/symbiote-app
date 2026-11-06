import { ChartNoAxesColumn } from "lucide-react";
import { useTranslations } from "use-intl";

import type { HeroDetail } from "@/api/heroes";
import { useFormatStat } from "@/hooks/useFormatStat";
import { Card, CardHeader, Stat } from "@/ui";
import { formatDuration } from "@/utils/dates";

import styles from "./styles.module.css";

type Format = "count" | "amount" | "duration";

type StatKey =
    | "avgKills"
    | "avgDeaths"
    | "avgAssists"
    | "avgHeroDamage"
    | "avgSiegeDamage"
    | "avgDamageTaken"
    | "avgHealing"
    | "avgSelfHealing"
    | "avgXp"
    | "avgTimeDeadSecs"
    | "avgTakedowns";

type Stat = { key: StatKey; label: string; format: Format };

const STATS = [
    { key: "avgKills", label: "kills", format: "count" },
    { key: "avgDeaths", label: "deaths", format: "count" },
    { key: "avgAssists", label: "assists", format: "count" },
    { key: "avgHeroDamage", label: "heroDamage", format: "amount" },
    { key: "avgSiegeDamage", label: "siegeDamage", format: "amount" },
    { key: "avgDamageTaken", label: "damageTaken", format: "amount" },
    { key: "avgHealing", label: "healing", format: "amount" },
    { key: "avgSelfHealing", label: "selfHealing", format: "amount" },
    { key: "avgXp", label: "xp", format: "amount" },
    { key: "avgTimeDeadSecs", label: "timeDead", format: "duration" },
    { key: "avgTakedowns", label: "takedowns", format: "count" },
] as const satisfies readonly Stat[];

export interface PerGameProps {
    hero: HeroDetail;
}

export function PerGame({ hero }: PerGameProps) {
    const t = useTranslations("hero.perGame");
    const { compact } = useFormatStat();

    const formatStat = (value: number, kind: Format) =>
        kind === "duration"
            ? formatDuration(value)
            : compact(value, { fixed: true });

    const stats = STATS.filter(({ key, format }) => {
        const value = hero[key];
        return value !== null && (format === "count" || value > 0);
    });

    return (
        <Card>
            <CardHeader
                size="sm"
                icon={ChartNoAxesColumn}
                title={t("title")}
                subtitle={t("subtitle", { hero: hero.name })}
            />
            <dl className={styles.stats}>
                {stats.map(({ key, label, format }) => (
                    <Stat
                        key={key}
                        label={t(label)}
                        truncate
                        className={styles.stat}
                    >
                        {formatStat(hero[key] ?? 0, format)}
                    </Stat>
                ))}
            </dl>
        </Card>
    );
}
