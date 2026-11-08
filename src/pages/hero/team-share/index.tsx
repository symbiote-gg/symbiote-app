import { ChartPie } from "lucide-react";
import { useTranslations } from "use-intl";

import type { HeroDetail } from "@/api/heroes";
import { useFormatStat } from "@/hooks/useFormatStat";
import { Card, CardHeader, Eyebrow } from "@/ui";
import { formatDuration } from "@/utils/dates";
import { MIN_TEAM_SHARE } from "@/utils/hero-stats";
import { Row } from "./row";

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

type RowSpec = { label: ShareLabel; share: ShareKey } | { label: "timeDead" };

type Group = { id: "damage" | "sustain" | "team"; rows: RowSpec[] };

const GROUPS: Group[] = [
    {
        id: "damage",
        rows: [
            { label: "heroDamage", share: "shareHeroDamage" },
            { label: "siegeDamage", share: "shareSiegeDamage" },
        ],
    },
    {
        id: "sustain",
        rows: [
            { label: "damageTaken", share: "shareDamageTaken" },
            { label: "healing", share: "shareHealing" },
        ],
    },
    {
        id: "team",
        rows: [
            { label: "killParticipation", share: "killParticipation" },
            { label: "xp", share: "shareXp" },
            { label: "timeDead" },
        ],
    },
];

export interface TeamShareProps {
    hero: HeroDetail;
}

export function TeamShare({ hero }: TeamShareProps) {
    const t = useTranslations("hero.teamShare");
    const { percent } = useFormatStat();

    // Time dead has no team total: its share is of the average game instead.
    const timeDead = () => {
        if (hero.avgTimeDeadSecs === null || !hero.avgDuration) return null;

        const share = hero.avgTimeDeadSecs / hero.avgDuration;

        return {
            share,
            hint: t("shareHint.timeDead", {
                share: percent(share),
                duration: formatDuration(hero.avgDuration),
            }),
            muted: true,
        };
    };

    const ofTeam = (label: ShareLabel, share: number | null) =>
        share === null
            ? null
            : {
                  share,
                  hint: t(`shareHint.${label}`, { share: percent(share) }),
                  muted: false,
              };

    const groups = GROUPS.map((group) => ({
        id: group.id,
        rows: group.rows.flatMap((row) => {
            const cells =
                "share" in row
                    ? ofTeam(row.label, hero[row.share])
                    : timeDead();

            if (cells === null || cells.share < MIN_TEAM_SHARE) return [];

            return [{ key: row.label, label: t(row.label), ...cells }];
        }),
    })).filter((group) => group.rows.length > 0);

    return (
        <Card>
            <CardHeader
                size="sm"
                icon={ChartPie}
                title={t("title")}
                subtitle={t("subtitle", { hero: hero.name })}
            />
            <div className={styles.body}>
                <div className={styles.groups}>
                    {groups.map((group) => (
                        <section key={group.id} className={styles.group}>
                            <Eyebrow as="h3">{t(`group.${group.id}`)}</Eyebrow>
                            <ul className={styles.rows}>
                                {group.rows.map((row) => (
                                    <Row
                                        key={row.key}
                                        label={row.label}
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
