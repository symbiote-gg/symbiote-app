import { ChartNoAxesColumn } from "lucide-react";
import { useTranslations } from "use-intl";

import type { HeroDetail } from "@/api/heroes";
import { useFormatStat } from "@/hooks/useFormatStat";
import { Card, CardHeader, Eyebrow, Stat } from "@/ui";
import { formatDuration } from "@/utils/dates";
import { Row } from "./row";

import styles from "./styles.module.css";

type AvgKey =
    | "avgHeroDamage"
    | "avgSiegeDamage"
    | "avgDamageTaken"
    | "avgHealing"
    | "avgSelfHealing"
    | "avgXp"
    | "avgTimeDeadSecs";

type ShareKey =
    | "shareHeroDamage"
    | "shareSiegeDamage"
    | "shareDamageTaken"
    | "shareHealing"
    | "shareXp";

type ShareLabel =
    "heroDamage" | "siegeDamage" | "damageTaken" | "healing" | "xp";

type RowSpec =
    | { key: AvgKey; label: ShareLabel; share: ShareKey }
    | { key: AvgKey; label: "selfHealing" | "timeDead" };

type Group = { id: "damage" | "sustain" | "team"; rows: RowSpec[] };

const MIN_SHARE = 0.005;

const STRIP = [
    { key: "avgKills", label: "kills" },
    { key: "avgAssists", label: "assists" },
    { key: "avgDeaths", label: "deaths" },
] as const;

const GROUPS: Group[] = [
    {
        id: "damage",
        rows: [
            {
                key: "avgHeroDamage",
                label: "heroDamage",
                share: "shareHeroDamage",
            },
            {
                key: "avgSiegeDamage",
                label: "siegeDamage",
                share: "shareSiegeDamage",
            },
            {
                key: "avgDamageTaken",
                label: "damageTaken",
                share: "shareDamageTaken",
            },
        ],
    },
    {
        id: "sustain",
        rows: [
            { key: "avgHealing", label: "healing", share: "shareHealing" },
            { key: "avgSelfHealing", label: "selfHealing" },
        ],
    },
    {
        id: "team",
        rows: [
            { key: "avgXp", label: "xp", share: "shareXp" },
            { key: "avgTimeDeadSecs", label: "timeDead" },
        ],
    },
];

export interface PerGameProps {
    hero: HeroDetail;
}

export function PerGame({ hero }: PerGameProps) {
    const t = useTranslations("hero.perGame");
    const { compact, percent } = useFormatStat();

    const strip = STRIP.filter(({ key }) => hero[key] !== null);

    // Time dead has no team total: its share is of the average game instead.
    const timeDead = (seconds: number) => {
        const share =
            hero.avgDuration && hero.avgDuration > 0
                ? seconds / hero.avgDuration
                : null;

        return {
            value: formatDuration(seconds),
            share,
            hint:
                share === null || hero.avgDuration === null
                    ? null
                    : t("shareHint.timeDead", {
                          share: percent(share),
                          duration: formatDuration(hero.avgDuration),
                      }),
            muted: true,
        };
    };

    const amount = (value: number, row: RowSpec) => {
        const share = "share" in row ? hero[row.share] : null;
        const hint =
            "share" in row && share !== null
                ? t(`shareHint.${row.label}`, { share: percent(share) })
                : null;

        return {
            value: compact(value, { fixed: true }),
            share,
            hint,
            muted: false,
        };
    };

    const groups = GROUPS.map((group) => ({
        id: group.id,
        rows: group.rows.flatMap((row) => {
            const value = hero[row.key];
            if (value === null || value <= 0) return [];

            const cells =
                row.key === "avgTimeDeadSecs"
                    ? timeDead(value)
                    : amount(value, row);

            // Stray amounts, like a mage's healing from a rare talent, would show as 0%.
            if (cells.share !== null && cells.share < MIN_SHARE) return [];

            return [{ key: row.key, label: t(row.label), ...cells }];
        }),
    })).filter((group) => group.rows.length > 0);

    return (
        <Card>
            <CardHeader
                size="sm"
                icon={ChartNoAxesColumn}
                title={t("title")}
                subtitle={t("subtitle", { hero: hero.name })}
            />
            <div className={styles.body}>
                <dl className={styles.strip}>
                    {strip.map(({ key, label }) => (
                        <Stat
                            key={key}
                            label={t(label)}
                            className={styles.stat}
                        >
                            {compact(hero[key] ?? 0, { fixed: true })}
                        </Stat>
                    ))}
                    {hero.killParticipation !== null && (
                        <Stat
                            label={t("killParticipation")}
                            className={styles.stat}
                        >
                            {percent(hero.killParticipation)}
                        </Stat>
                    )}
                </dl>
                <div className={styles.groups}>
                    {groups.map((group) => (
                        <section key={group.id} className={styles.group}>
                            <Eyebrow as="h3">{t(`group.${group.id}`)}</Eyebrow>
                            <ul className={styles.rows}>
                                {group.rows.map((row) => (
                                    <Row
                                        key={row.key}
                                        label={row.label}
                                        value={row.value}
                                        share={row.share}
                                        hint={row.hint}
                                        muted={row.muted}
                                    />
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            </div>
        </Card>
    );
}
